"""Seed sprint data from Jira into PM Nexus database."""
import asyncio
import json
import sys
sys.path.insert(0, ".")

from sqlalchemy import select, text
from app.database import engine, Base, async_session
from app.models.project import Project
from app.models.epic import Epic
from app.models.ticket import Ticket
from app.models.engineer import Engineer

# ── New epics discovered from sprints (not already in DB) ──────────────────
NEW_EPICS = {
    "CORE-789": "VS2 - Sales Order (Phase 2)",
    "CORE-1029": "VS4 Part 2 Item Fulfillment (NetSuite MVP Backlog)",
    "CORE-804": "VS1 - Customer Financial Data from NetSuite ERP",
    "CORE-1028": "VS3 Part 2 - Payment Management (NetSuite MVP Backlog)",
    "CORE-562": "PSA Offers in PSA My Orders",
    "CORE-803": "VS1 - Customer Shipping Preference Service",
    "CORE-995": "VS1: Customer Profile Updates: CID --> ERP",
    "CORE-1016": "NetSuite ERP: CORE Backlog (non-MVP)",
    "CORE-648": "VS10 - ERP Canada",
    "VTRON-3439": "NS VS4: [P4] My Collection Withdrawals",
    "NS-545": "Canada / Intl Expansion - ERP Team Only",
}

# Already-existing epics (from prior seed)
EXISTING_EPICS = {
    "CORE-845", "CORE-679", "CORE-437", "CORE-540", "CORE-242",
    "CORE-655", "CORE-1251", "CORE-1349", "CORE-1409", "CORE-1579", "CORE-1664",
}

# ── Sprint 3/4 - 3/17 tickets ─────────────────────────────────────────────
SPRINT_1_TICKETS = [
    ("CORE-440", "Grading Order Lines are not displayed in numeric order", "CORE-789", "Ready for Prod Release", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-669", "VOIDED TRACKING INFO (ERP Synchronization)", "CORE-1029", "To Do", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-689", "Vault Address in NS SO is displayed as West Basin though Submission was for SLV", "CORE-1029", "In progress", "ngrieb", "712020:a221fd43-4bfb-48e3-9997-db9061467275"),
    ("CORE-822", "Ship To Address is not populated", "CORE-437", "Ready for Prod Release", "Anuj Kulkarni", "712020:3791066d-1aa0-49f1-98a5-26e4f10d01f7"),
    ("CORE-923", "Fulfillment Events Update (Order Number and Availability)", "CORE-655", "Ready for Prod Release", "Sravya kaithi", "712020:8d8b6b8b-b3d9-49b8-a2c3-724d3c2244f0"),
    ("CORE-934", "SO not created when using Money Voucher (Change Request)", "CORE-789", "Code Review", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-953", "Sequencing Order Lines Logic (Membership)", "CORE-789", "Ready for Prod Release", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-956", "At intents lock (sort start), update line level shipping address", "CORE-789", "Ready for Prod Release", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-1001", "Modify Grading Order Lines to Grouped vs Independent", "CORE-789", "Ready for QA", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-1002", 'Update "Shipped to Receiving Center Date" on SO Header', "CORE-789", "Blocked", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-1008", "Push Grading Order Status Event Dates to ERP", "CORE-789", "Blocked", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1009", "Order Flow Post V2 Changes (PSA, PCGS, Comics, PSAFunko)", "CORE-789", "Blocked", "Sravya kaithi", "712020:8d8b6b8b-b3d9-49b8-a2c3-724d3c2244f0"),
    ("CORE-1015", "Capture Recurring Membership Payment Confirmations from PayPal (via NetSuite)", "CORE-1028", "Blocked", "Sravya kaithi", "712020:8d8b6b8b-b3d9-49b8-a2c3-724d3c2244f0"),
    ("CORE-1026", "Ensure all active customers/financial data is available via the new API", "CORE-804", "To Do", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1072", "Create IF in NetSuite for PCGS Repo Orders that are Held at PCGS Offices", "CORE-437", "In progress", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-1112", "Free - Payment method is not mapping (SO)", "CORE-789", "Ready for Prod Release", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1123", "MC Withdrawals CORE: Update LOB for Vault Withdrawals from 503 to 510 for all erp records", "VTRON-3439", "Ready for Prod Release", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-1132", "Move the SO Header / Multiline update from gatehub-consumer to ERP consumer", "CORE-845", "Ready for Prod Release", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1151", "Database table design for Order API", "CORE-655", "Code Review", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1157", "Proship webhook is not triggering messages on qa-ss-core-shipping-event-v1 topic", "CORE-655", "Ready for Prod Release", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-1160", "Create DB to hold sales order before sending to ERP", "CORE-789", "Ready for Prod Release", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-1161", "Ensure all Location/Subsidiary Mapping in place for PSA, PCGS, WATA, DNA", "CORE-437", "Blocked", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-1172", "Integrate Order API with Spec service clients", "CORE-655", "Ready for Prod Release", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1174", "Integrate Order API with DNA service clients", "CORE-655", "Ready for Prod Release", "Marc Groothedde", "712020:d22e512f-eddf-4635-8df9-951ead25100d"),
    ("CORE-1193", "Load historical order and order line details from Grading", "CORE-655", "In progress", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1194", "Load historical cert work order process details from Grading", "CORE-655", "To Do", "Ekaterina Gillette", "712020:51a52b20-35d0-4b4c-adaa-fdc64b617574"),
    ("CORE-1196", "Aggregate cert work order process events and save it in order status history table", "CORE-655", "Ready for Prod Release", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1203", "Update flow for Sales Orders", "CORE-789", "Code Review", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-1224", "Add PSA Offer Accepted intents in Shipping Service Mapping (when creating fulfillments)", "CORE-562", "Ready for Prod Release", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1257", "[P0]Grades ready status aggregation", "CORE-655", "Ready for Prod Release", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-1258", "[P0]Grades ready status undo", "CORE-655", "Ready for Prod Release", "Sravya kaithi", "712020:8d8b6b8b-b3d9-49b8-a2c3-724d3c2244f0"),
    ("CORE-1262", "PCGS/PSA Bulk type orders are not being created in NetSuite", "CORE-437", "Ready for QA", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-1269", "[M3] Add Descope Configuration into app-state for CORE services", "CORE-1251", "Ready for Prod Release", "Ekaterina Gillette", "712020:51a52b20-35d0-4b4c-adaa-fdc64b617574"),
    ("CORE-1270", "[M3] Replace Okta with Descope Config in CORE Services", "CORE-1251", "Ready for Prod Release", "Ekaterina Gillette", "712020:51a52b20-35d0-4b4c-adaa-fdc64b617574"),
    ("CORE-1273", "Vault Withdrawal: Item Fulfilment is missing FULL address", "VTRON-3439", "Ready for Prod Release", "Mitali Sengupta", "712020:143cd013-8d2a-4ab7-a89e-2287aaa8c54b"),
    ("CORE-1280", "Update NS Customer Profile based on updates in CID", "CORE-995", "Ready for Prod Release", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1286", "Ready for Fulfillment and Fulfilled Status", "CORE-655", "Blocked", "hkaki", "712020:e3f089bd-e87f-4f8b-b098-1d35ba9e981d"),
    ("CORE-1300", "Data Remediation: Periodical data sanitation check between Grading and CORE DB", "CORE-655", "Code Review", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-1303", "Load DNA historical order data", "CORE-655", "To Do", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1304", "[P0]Kafka consumer to consume order delta events for incremental changes", "CORE-655", "Ready for Prod Release", "Ekaterina Gillette", "712020:51a52b20-35d0-4b4c-adaa-fdc64b617574"),
    ("CORE-1305", "Update ship date in order header table", "CORE-655", "Ready for Prod Release", "Sravya kaithi", "712020:8d8b6b8b-b3d9-49b8-a2c3-724d3c2244f0"),
    ("CORE-1306", "Observability", "CORE-655", "To Do", "Ekaterina Gillette", "712020:51a52b20-35d0-4b4c-adaa-fdc64b617574"),
    ("CORE-1307", "Production release plan and support", "CORE-655", "To Do", "Ekaterina Gillette", "712020:51a52b20-35d0-4b4c-adaa-fdc64b617574"),
    ("CORE-1321", "Get shipping preferences into ProShip", "CORE-803", "Blocked", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-1322", "Map Navision Holds to GateHub to be utilized in the new Orders API", "CORE-655", "Ready for Prod Release", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-1323", "Add Hold information from GateHub to Item Fulfillment upon record creation", "CORE-845", "Ready for Prod Release", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1328", "Create item fulfillment records for Membership entitlement shipments", "CORE-1029", "In progress", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-1329", "Create Invoice in NetSuite for Inbound shipping label purchase", "CORE-679", "Ready for Prod Release", "Phi-My Tran", "712020:276dc97a-12f5-4b38-b29d-1b99cc6c57b6"),
    ("CORE-1333", "Capture Total Order Amount and Order Payment Balance from NetSuite", "CORE-655", "Ready for Prod Release", "Ekaterina Gillette", "712020:51a52b20-35d0-4b4c-adaa-fdc64b617574"),
    ("CORE-1334", "Publish shipping events for PSA cards workflow", None, "Ready for Prod Release", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1678", "Membership Mapping Update from Stripe to Account for Tax mapping.", "CORE-804", "To Do", None, None),
]

# ── Sprint 3/18 - 3/31 tickets ────────────────────────────────────────────
SPRINT_2_TICKETS = [
    ("CORE-534", "CPTR - Handling Failed Network Errors from PaymentAPI | How to Handle?", "CORE-1016", "To Do", None, None),
    ("CORE-1308", "[Placeholder] Performance testing and tuning", "CORE-655", "To Do", None, None),
    ("CORE-1624", "ERP CORE ORDER MIGRATION: Run core order intents migration by processing grading migration events in SB3", "CORE-1579", "To Do", None, None),
    ("CORE-1627", "ERP GO-LIVE: Deploy Inbound Shipping Label Components (Invoice processing) before go live", "CORE-1579", "To Do", None, None),
]

# ── PSA/PCGS ERP P0 Launch Backlog tickets ─────────────────────────────────
BACKLOG_SPRINT_TICKETS = [
    ("CORE-542", "Capture Manual Shipment messages out of ProShip and update ERP", "CORE-1029", "Cancelled", None, None),
    ("CORE-1033", "CORE SB3 Development", "CORE-540", "Cancelled", None, None),
    ("CORE-1071", "Translate WATA Submission Level Holds from NetSuite into Order Level holds in the Hold Service", "CORE-845", "Cancelled", None, None),
    ("CORE-1087", "Analysis on CORE-952", "CORE-648", "Canceled", None, None),
    ("CORE-1159", "Canada Collectors Club Memberships are coming into NetSuite under LOB PCGS", "NS-545", "PM Review", None, None),
    ("CORE-1189", "Fix externalId for ERP subsidiary for Sales orders", "CORE-789", "Cancelled", None, None),
    ("CORE-1268", "PSA Grading Orders are failing to Finalize in NetSuite", "CORE-437", "DONE", None, None),
    ("CORE-1281", "Erp Consumer - Cleanup Grading CPTR service", "CORE-1028", "Cancelled", None, None),
    ("CORE-1288", "Update Identifiable Service Line", "CORE-789", "Canceled", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-1296", "[Fast follow] Update CPTR & Refund flow", "CORE-1028", "DONE", None, None),
    ("CORE-1317", "PLACEHOLDER: Check Shipping Preference prior to item fulfillment creation if necessary", None, "Cancelled", None, None),
    ("CORE-1325", "Update CORE shipping service IF record if Hold status is updated", "CORE-845", "Cancelled", None, None),
    ("CORE-1349", "Erp Performance, Scalability and Resilience", None, "In progress", "ngrieb", "712020:a221fd43-4bfb-48e3-9997-db9061467275"),
    ("CORE-1384", "All Terms/Credit Limit webhooks hit a 500 Internal Server Error.", None, "DONE", "Marc Groothedde", "712020:d22e512f-eddf-4635-8df9-951ead25100d"),
    ("CORE-1395", "Monitoring, production planning and deployment - async worklfow", "CORE-1349", "To Do", None, None),
    ("CORE-1530", "[WATA] SOP: PSA Video Games Netsuite", "CORE-437", "Cancelled", "ngrieb", "712020:a221fd43-4bfb-48e3-9997-db9061467275"),
    ("CORE-1541", "[Placeholder] Include WATA & PSA/DNA to SB3", "CORE-540", "Cancelled", None, None),
    ("CORE-1609", "DNA Shipping Holds", None, "Cancelled", None, None),
    ("CORE-1622", "ERP NS MIGRATION: [Placeholder] Share business rules for Core line Id mapping based on final implementation for grading order mapping", "CORE-1579", "To Do", None, None),
    ("CORE-1625", "ERP GO-LIVE: Deploy Financial Hub components with erp go live backward compatibility changes", "CORE-1579", "To Do", None, None),
    ("CORE-1626", "ERP GO-LIVE: [Placeholder] PSA,PCGS should use Financial hub api before go live", "CORE-1579", "To Do", None, None),
    ("CORE-1633", "[QA] V2 Undo flips SO to Pending Approval but does not set Accounting Hold; Accounting Hold is only applied after redo V2", "CORE-789", "Cancelled", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
]


async def seed():
    async with async_session() as db:
        # ── 1. Get or create the "CORE Integrations" project ───────────
        result = await db.execute(select(Project).where(Project.name == "CORE Integrations"))
        core_project = result.scalar_one_or_none()
        if not core_project:
            core_project = Project(name="CORE Integrations", status="active")
            db.add(core_project)
            await db.flush()
        core_project_id = core_project.id

        # ── 2. Create "Backlog" project ────────────────────────────────
        result = await db.execute(select(Project).where(Project.name == "Backlog"))
        backlog_project = result.scalar_one_or_none()
        if not backlog_project:
            backlog_project = Project(name="Backlog", status="active")
            db.add(backlog_project)
            await db.flush()
        backlog_project_id = backlog_project.id

        # ── 3. Upsert all epics ───────────────────────────────────────
        all_epic_keys = set()
        for tickets in [SPRINT_1_TICKETS, SPRINT_2_TICKETS, BACKLOG_SPRINT_TICKETS]:
            for t in tickets:
                if t[2]:  # epic_key
                    all_epic_keys.add(t[2])

        for epic_key in all_epic_keys:
            result = await db.execute(select(Epic).where(Epic.epic_key == epic_key))
            existing = result.scalar_one_or_none()
            if not existing:
                summary = NEW_EPICS.get(epic_key, epic_key)
                # Backlog-sprint-only epics go to Backlog project
                epic = Epic(
                    epic_key=epic_key,
                    project_id=core_project_id,
                    summary=summary,
                )
                db.add(epic)
        await db.flush()

        # ── 4. Upsert engineers ───────────────────────────────────────
        engineer_map = {}  # jira_account_id -> engineer.id
        for tickets in [SPRINT_1_TICKETS, SPRINT_2_TICKETS, BACKLOG_SPRINT_TICKETS]:
            for t in tickets:
                name, acct_id = t[4], t[5]
                if acct_id and acct_id not in engineer_map:
                    result = await db.execute(
                        select(Engineer).where(Engineer.jira_account_id == acct_id)
                    )
                    eng = result.scalar_one_or_none()
                    if not eng:
                        eng = Engineer(
                            jira_account_id=acct_id,
                            name=name,
                            manual_tags=json.dumps([]),
                            auto_tags=json.dumps([]),
                        )
                        db.add(eng)
                        await db.flush()
                    engineer_map[acct_id] = eng.id
        await db.flush()

        # Reload all engineers for mapping
        result = await db.execute(select(Engineer))
        for eng in result.scalars().all():
            engineer_map[eng.jira_account_id] = eng.id

        # ── 5. Upsert tickets ────────────────────────────────────────
        stats = {"created": 0, "updated": 0}

        async def upsert_tickets(ticket_list):
            for jira_key, title, epic_key, status, name, acct_id in ticket_list:
                assignee_id = engineer_map.get(acct_id) if acct_id else None
                result = await db.execute(
                    select(Ticket).where(Ticket.jira_key == jira_key)
                )
                existing = result.scalar_one_or_none()
                if existing:
                    existing.title = title
                    existing.status = status
                    existing.epic_key = epic_key
                    existing.assignee_id = assignee_id
                    stats["updated"] += 1
                else:
                    db.add(Ticket(
                        jira_key=jira_key,
                        title=title,
                        epic_key=epic_key,
                        status=status,
                        assignee_id=assignee_id,
                        points=None,
                    ))
                    stats["created"] += 1

        await upsert_tickets(SPRINT_1_TICKETS)
        await upsert_tickets(SPRINT_2_TICKETS)
        await upsert_tickets(BACKLOG_SPRINT_TICKETS)

        # ── 6. Move backlog-only epics to the Backlog project ─────────
        # Epics that ONLY appear in the backlog sprint (not in sprint 1 or 2)
        sprint_epic_keys = set()
        for t in SPRINT_1_TICKETS + SPRINT_2_TICKETS:
            if t[2]:
                sprint_epic_keys.add(t[2])

        backlog_only_epic_keys = set()
        for t in BACKLOG_SPRINT_TICKETS:
            if t[2] and t[2] not in sprint_epic_keys:
                backlog_only_epic_keys.add(t[2])

        # Epics that are ONLY in the backlog get moved to Backlog project
        for epic_key in backlog_only_epic_keys:
            result = await db.execute(select(Epic).where(Epic.epic_key == epic_key))
            epic = result.scalar_one_or_none()
            if epic and epic.epic_key not in EXISTING_EPICS:
                epic.project_id = backlog_project_id

        await db.commit()

        # ── 7. Print summary ─────────────────────────────────────────
        result = await db.execute(select(Epic).where(Epic.project_id == core_project_id))
        core_epics = result.scalars().all()
        result = await db.execute(select(Epic).where(Epic.project_id == backlog_project_id))
        backlog_epics = result.scalars().all()
        result = await db.execute(text("SELECT COUNT(*) FROM tickets"))
        ticket_count = result.scalar()
        result = await db.execute(text("SELECT COUNT(*) FROM engineers"))
        eng_count = result.scalar()

        print(f"\n=== Seed Complete ===")
        print(f"CORE Integrations project: {len(core_epics)} epics")
        for e in core_epics:
            print(f"  {e.epic_key}: {e.summary}")
        print(f"\nBacklog project: {len(backlog_epics)} epics")
        for e in backlog_epics:
            print(f"  {e.epic_key}: {e.summary}")
        print(f"\nTickets: {stats['created']} created, {stats['updated']} updated ({ticket_count} total)")
        print(f"Engineers: {eng_count} total")


if __name__ == "__main__":
    asyncio.run(seed())
