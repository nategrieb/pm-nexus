import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.engineer import Engineer
from app.models.epic import Epic
from app.models.project import Project
from app.models.setting import Setting
from app.models.ticket import Ticket
from app.schemas.sync import SyncResult
from app.services.jira_helpers import extract_points, get_jira_client, get_story_points_field


async def _upsert_engineer(
    db: AsyncSession, account_id: str, display_name: str, timezone: str | None
) -> Engineer:
    result = await db.execute(
        select(Engineer).where(Engineer.jira_account_id == account_id)
    )
    engineer = result.scalar_one_or_none()
    if engineer:
        engineer.name = display_name
        return engineer

    engineer = Engineer(
        jira_account_id=account_id,
        name=display_name,
        location=timezone,
        weekly_hours=40.0,
        manual_tags="[]",
        auto_tags="[]",
    )
    db.add(engineer)
    await db.flush()
    return engineer


async def sync_project(project_id: int, db: AsyncSession) -> SyncResult:
    result = SyncResult()

    # Get epics for this project
    epic_result = await db.execute(
        select(Epic).where(Epic.project_id == project_id)
    )
    epics = epic_result.scalars().all()
    if not epics:
        result.errors.append("No epics found for this project")
        return result

    epic_keys = [e.epic_key for e in epics]
    epic_map = {e.epic_key: e for e in epics}

    # Build JQL to fetch tickets belonging to these epics
    keys_str = ", ".join(f'"{k}"' for k in epic_keys)
    jql = f'"Epic Link" in ({keys_str}) OR parent in ({keys_str}) OR key in ({keys_str})'

    story_points_field = await get_story_points_field(db)
    # Always request common story point custom fields so fallback extraction works
    extra_sp_fields = {"customfield_10054", "customfield_10016", "customfield_10028", "customfield_10004"}
    fields = list(
        {"summary", "status", "assignee", story_points_field, "issuetype", "parent"}
        | extra_sp_fields
    )

    client = await get_jira_client(db)
    try:
        issues = await client.search_all_issues(jql, fields)
    except Exception as e:
        result.errors.append(f"Jira API error: {e}")
        return result
    finally:
        await client.close()

    engineers_created = set()

    for issue in issues:
        jira_key = issue["key"]
        f = issue.get("fields", {})

        # If this issue IS the epic itself, just update the epic summary — don't
        # store it as a ticket (avoids double-counting points).
        if jira_key in epic_map:
            epic_map[jira_key].summary = f.get("summary", "")
            continue

        # Determine epic_key
        epic_key = None
        parent = f.get("parent")
        if parent and parent.get("key") in epic_map:
            epic_key = parent["key"]

        # Extract points
        points = extract_points(f, story_points_field)

        # Extract assignee
        assignee_id = None
        assignee_data = f.get("assignee")
        if assignee_data:
            account_id = assignee_data.get("accountId", "")
            display_name = assignee_data.get("displayName", "Unknown")
            timezone = assignee_data.get("timeZone")
            engineer = await _upsert_engineer(db, account_id, display_name, timezone)
            assignee_id = engineer.id
            if account_id not in engineers_created:
                engineers_created.add(account_id)

        # Upsert ticket
        ticket_result = await db.execute(
            select(Ticket).where(Ticket.jira_key == jira_key)
        )
        existing_ticket = ticket_result.scalar_one_or_none()

        status_name = ""
        status_obj = f.get("status")
        if status_obj:
            status_name = status_obj.get("name", "")

        if existing_ticket:
            existing_ticket.title = f.get("summary", "")
            existing_ticket.points = points
            existing_ticket.status = status_name
            existing_ticket.assignee_id = assignee_id
            if epic_key:
                existing_ticket.epic_key = epic_key
            result.tickets_updated += 1
        else:
            ticket = Ticket(
                jira_key=jira_key,
                epic_key=epic_key,
                title=f.get("summary", ""),
                points=points,
                status=status_name,
                assignee_id=assignee_id,
            )
            db.add(ticket)
            result.tickets_created += 1

    # Auto-populate start_date if not set
    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one_or_none()
    if project and not project.start_date:
        project.start_date = project.created_at.date()

    # Auto-tag engineers from completed epics
    await _update_auto_tags(db, project_id)

    await db.commit()
    result.engineers_created = len(engineers_created)
    return result


async def _get_or_create_backlog(db: AsyncSession) -> Project:
    """Get the Backlog project, creating it if it doesn't exist."""
    result = await db.execute(
        select(Project).where(Project.name == "Backlog")
    )
    backlog = result.scalar_one_or_none()
    if not backlog:
        backlog = Project(name="Backlog", status="active")
        db.add(backlog)
        await db.flush()
    return backlog


async def discover_epics(db: AsyncSession) -> int:
    """Discover epics from Jira and add new ones to the Backlog project.

    Returns the number of new epics discovered.
    """
    # Read jira_project_key from settings
    result = await db.execute(
        select(Setting).where(Setting.key == "jira_project_key")
    )
    setting = result.scalar_one_or_none()
    project_key = setting.value if setting else ""
    if not project_key:
        return 0

    # Get all existing epic keys in DB
    existing_result = await db.execute(select(Epic.epic_key))
    existing_keys = {row[0] for row in existing_result.all()}

    # Query Jira for all epics in the project
    client = await get_jira_client(db)
    try:
        jql = f'project = "{project_key}" AND issuetype = Epic ORDER BY key ASC'
        issues = await client.search_all_issues(jql, ["summary"])
    except Exception:
        return 0
    finally:
        await client.close()

    backlog = await _get_or_create_backlog(db)

    new_count = 0
    for issue in issues:
        epic_key = issue["key"]
        summary = issue.get("fields", {}).get("summary", epic_key)

        if epic_key in existing_keys:
            # Update summary if changed
            epic_result = await db.execute(
                select(Epic).where(Epic.epic_key == epic_key)
            )
            epic = epic_result.scalar_one_or_none()
            if epic and epic.summary != summary:
                epic.summary = summary
        else:
            # New epic goes into Backlog
            epic = Epic(epic_key=epic_key, project_id=backlog.id, summary=summary)
            db.add(epic)
            new_count += 1

    await db.commit()
    return new_count


async def _update_auto_tags(db: AsyncSession, project_id: int) -> None:
    """Update auto_tags for engineers based on completed epic tickets."""
    epic_result = await db.execute(
        select(Epic).where(Epic.project_id == project_id)
    )
    epics = epic_result.scalars().all()

    for epic in epics:
        # Find engineers who have completed tickets in this epic
        ticket_result = await db.execute(
            select(Ticket).where(
                Ticket.epic_key == epic.epic_key,
                Ticket.status.in_(["Done", "Closed"]),
                Ticket.assignee_id.isnot(None),
            )
        )
        done_tickets = ticket_result.scalars().all()
        engineer_ids = {t.assignee_id for t in done_tickets}

        tag = epic.summary or epic.epic_key
        for eid in engineer_ids:
            eng_result = await db.execute(
                select(Engineer).where(Engineer.id == eid)
            )
            engineer = eng_result.scalar_one_or_none()
            if not engineer:
                continue
            try:
                tags = json.loads(engineer.auto_tags or "[]")
            except json.JSONDecodeError:
                tags = []
            if tag not in tags:
                tags.append(tag)
                engineer.auto_tags = json.dumps(tags)
