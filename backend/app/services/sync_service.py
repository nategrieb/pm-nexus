import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.engineer import Engineer
from app.models.epic import Epic
from app.models.setting import Setting
from app.models.ticket import Ticket
from app.schemas.sync import SyncResult
from app.services.jira_client import JiraClient


async def _get_jira_client(db: AsyncSession) -> JiraClient:
    result = await db.execute(
        select(Setting).where(
            Setting.key.in_(["jira_base_url", "jira_email", "jira_api_token"])
        )
    )
    settings = {s.key: s.value for s in result.scalars().all()}
    return JiraClient(
        base_url=settings["jira_base_url"],
        email=settings["jira_email"],
        api_token=settings["jira_api_token"],
    )


async def _get_story_points_field(db: AsyncSession) -> str:
    result = await db.execute(
        select(Setting).where(Setting.key == "jira_story_points_field")
    )
    setting = result.scalar_one_or_none()
    return setting.value if setting else "story_points"


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

    story_points_field = await _get_story_points_field(db)
    fields = [
        "summary",
        "status",
        "assignee",
        story_points_field,
        "issuetype",
        "parent",
    ]

    client = await _get_jira_client(db)
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

        # Determine epic_key
        epic_key = None
        parent = f.get("parent")
        if parent and parent.get("key") in epic_map:
            epic_key = parent["key"]
        elif jira_key in epic_map:
            epic_key = jira_key
            # Update epic summary
            epic_map[jira_key].summary = f.get("summary", "")

        # Extract points
        points = f.get(story_points_field)
        if points is None:
            # Try common custom field names
            for custom in ["customfield_10016", "customfield_10028", "customfield_10004"]:
                points = f.get(custom)
                if points is not None:
                    break

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

    # Auto-tag engineers from completed epics
    await _update_auto_tags(db, project_id)

    await db.commit()
    result.engineers_created = len(engineers_created)
    return result


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
