"""Seed board backlog tickets (sprint=EMPTY) into PM Nexus database."""
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

# ── New epics to create if they don't already exist ───────────────────────
NEW_EPICS = {
    "CORE-565": "CORE Platform Cleanup & Tech Debt",
    "CORE-1354": "Power Pack Staging",
    "CORE-1310": "Multipiece Writeback",
    "CORE-1473": "ProShip Integration",
    "CORE-522": "Marketplace Payouts",
    "CORE-1577": "Netsuite Non-MVP: CORE Team",
    "CORE-1544": "Non MVP",
    "CORE-538": "Japan (PSA JP) Shipping",
    "CORE-505": "NetSuite Payment Charges",
    "CORE-520": "CORE Order DB Migration",
    "CORE-561": "Order Data Feed",
    "CORE-521": "VS4 Items Fulfillment Memberships",
    "CORE-117": "Vault Withdrawal Shipping",
    "CORE-788": "Stripe Connect Sign Up Email Reminder",
    "CORE-944": "Shipping Backlog",
    "CORE-721": "Project Grail MVP Pack Purchase",
    "CORE-723": "Intercompany Shipment Transfers",
    "CORE-1058": "GME Grading Orders Status Feed Reholders",
    "CORE-1209": "Order Status Management",
    "CORE-1027": "Grading Orders Status Feed Phase 2",
    "CORE-235": "Deposits Management",
    "CORE-529": "Cash Sales",
    "CORE-1096": "Framework POM & BOMs",
    "CORE-1187": "Admin UI IMS",
    "CORE-501": "eBay Vault Transfers",
    "CORE-1398": "PowerPack OT Failures",
    "CORE-665": "ERP Gateway",
    "CORE-1664": "PROD Launch Activities - ERP Data Migration",
    "CORE-1409": "PowerPack Refactor",
    "CORE-242": "Small High Value",
    "CORE-655": "Orders API 2.0",
    "CORE-562": "PSA Offers in PSA My Orders",
    "CORE-789": "VS2 - Sales Order (Phase 2)",
    "CORE-437": "NetSuite ERP: CORE Backlog (MVP)",
    "CORE-845": "VS1 & VS4: Hold Service: Status and Workflow",
    "CORE-1016": "NetSuite ERP: CORE Backlog (non-MVP)",
    "CORE-1028": "VS3 Part 2 - Payment Management (NetSuite MVP Backlog)",
    "CORE-540": "ERP: SB3 Environment",
    "CORE-1579": "PROD Launch Activities (CORE)",
    "CORE-1349": "Erp Performance, Scalability and Resilience",
}

# ── Backlog tickets (deduplicated by jira_key) ────────────────────────────
# Each tuple: (jira_key, summary, epic_key_or_None, status, assignee_name_or_None, assignee_account_id_or_None)
_RAW_TICKETS = [
    # Page 1
    ("CORE-227", "[Test Execution] Missing Listing Unsold Events --> Adjust items from Marketplace Hold to Vaulted", None, "To Do", "Anusha Ravuru", "633c56f1140ba0bf651d6e4a"),
    ("CORE-1405", "Record Credit Memo into Transaction Log Table", "CORE-1409", "To Do", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-1419", "ErpClient library changes to add new payloads for CreditMemo tran log mapping", None, "To Do", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1420", "Create new erp consumer ss-core-erp-credit-memo-consumer to process credit memo messages across different business lines.", None, "To Do", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-1421", "Payment status consumer changes to trigger the credit memo workflow", None, "To Do", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-1423", "New Credit Memo webhook processing & existing webhooks cleanup", None, "In progress", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1429", "Identify the Select SQL query to successfully map the list of credit memo to be retrieved for CSV generation", None, "To Do", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-1407", "Update Payment Completed to IMS Collectible Status", "CORE-1409", "To Do", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-1427", "Erp Status consumer changes to stop generating Seller Payout event on VB status message and implement new archival workflow for PP intents", None, "To Do", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-1430", "New flow for generation of Seller Payout Event", None, "To Do", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-1254", "Add ERP SO mapping for Offers purchases by Power Pack Staging [New CID 104832143]", "CORE-1354", "To Do", None, None),
    ("CORE-1406", "Record Customer Refund into Transaction Log Table", "CORE-1409", "To Do", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-1424", "Erp payment consumer changes to process new Customer Refund message type, including clean up of old implementation", None, "To Do", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-1425", "IWP consumer changes to trigger Customer Refund processing", None, "To Do", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1426", "New Customer Refund webhook processing", None, "To Do", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1431", "Identify the SQL query to successfully map the list of customer refunds to be retrieved for CSV generation", None, "To Do", None, None),
    ("CORE-1400", "Create alert for Vault Ops team if Vault Submission failed to create from PSA Grading for Offers", "CORE-242", "To Do", None, None),
    ("CORE-1244", "Refactor Vault-Based Offer Acceptance Workflow to use Accept Offer Endpoint", "CORE-565", "To Do", None, None),
    ("CORE-1314", "Caching for intent API", "CORE-565", "To Do", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1385", "Per-Package Order in Multipiece Writeback", "CORE-1310", "Blocked", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1381", "PLACEHOLDER: Support Bulk SWOG-Multipiece for Intl", "CORE-1310", "Blocked", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1404", "Record Cash Sale into Transaction Log Table", "CORE-1409", "Blocked", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-1417", "Cash Sale Consumer changes to implement batching integration with NS", None, "Code Review", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-1416", "Update key for Cash sale kafka messages to use Vault Id as message key", None, "Blocked", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-1418", "Cash Sale webhook changes to update the tran log event & remove old logic for vendor bill processing", None, "Blocked", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1428", "Identify the SQL query to successfully map the list of cash sales to be retrieved for CSV generation", None, "To Do", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-1332", "Evaluate & Optimize DB usage patterns", "CORE-565", "To Do", None, None),
    ("CORE-813", "Enhance Inventory consumer to handle errors with retries and prevent null CCIDs being published", "CORE-565", "To Do", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1596", "PLACEHOLDER: Display Sort Scan status in CORE API that ProShip uses", "CORE-1473", "To Do", None, None),
    ("CORE-1475", "Better logging for customer Payout Issues", "CORE-522", "To Do", None, None),
    ("CORE-1201", "Validate token for gatehub service endpoint", None, "To Do", None, None),
    ("CORE-994", "Update [Account Hold - Shipping] from Salesforce in Holds Service and ERP", "CORE-1577", "Blocked", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-991", "Update [Account Hold - Accounting] from Salesforce in Holds Service, ERP, and CID", "CORE-1577", "Blocked", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-988", "Update [Order Hold - Shipping] reason from Salesforce in Holds Service", "CORE-1577", "Blocked", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1364", "(P1) Store Order Hold Process (24 hour shot clock) from Grading in GateHub", "CORE-655", "To Do", None, None),
    ("CORE-1437", "Decouple Payout Trigger from Fulfillment for Marketplace Ship Home Orders", None, "To Do", None, None),
    ("CORE-67", "Element Erp Integration: Build a throttling service for erp requests", "CORE-1016", "To Do", None, None),
    ("CORE-66", "Element Erp Integration: Handle concurrency limit for erp consumers", "CORE-1016", "To Do", None, None),
    ("CORE-1327", "Data Migration - Membership details from Navision to Membership Service", None, "To Do", None, None),
    ("CORE-62", "Element Erp Integration: Certificate management for NetSuite Integration", "CORE-665", "Ready for Prod Release", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-641", "Create a new consumer for Grading Order scenarios", "CORE-565", "Code Review", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-197", "Admin UI IMS: Add Items to IMS: New Ops service to handle add items through Vault Admin Tool", "CORE-1187", "Blocked", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-189", "Admin UI IMS: Update inventory consumer to support addition of all item types with IMS", "CORE-1187", "Blocked", "Swati Bansal", "630fdfed8d88ec800fbe6ba5"),
    ("CORE-902", "[PPB- New] Placeholder - Onboarding customer email for buyback payouts", "CORE-788", "To Do", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-354", "Update listing price for BIN listing", "CORE-522", "To Do", "James Martinez", "712020:b72d6245-6915-44ce-8ac0-83bbe10f4d91"),
    ("CORE-355", "[Component Testing] Update listing price for BIN listing", None, "To Do", "Anusha Ravuru", "633c56f1140ba0bf651d6e4a"),
    ("CORE-1010", "[Non-ERP MVP] Facilitate Membership updates based on Refund confirmation in Stripe (P2)", "CORE-1544", "To Do", None, None),
    ("CORE-503", "Grading Outbound Item fulfillment for Aftership (PSA JP)", "CORE-538", "Blocked", "Gustavo Molina", "712020:795ce00a-4cb2-4e31-b4f2-b4519cf1833d"),
    ("CORE-1050", "Aftership Webhook is not initiating IF creation or publishing erp Kafka Messages", "CORE-538", "Blocked", "Gustavo Molina", "712020:795ce00a-4cb2-4e31-b4f2-b4519cf1833d"),
    ("CORE-553", "Capture Cancel Charge Request from NetSuite ERP", "CORE-505", "To Do", None, None),
    # Page 2
    ("CORE-555", "SO are not created in Netsuite", None, "DONE", "Gustavo Molina", "712020:795ce00a-4cb2-4e31-b4f2-b4519cf1833d"),
    ("CORE-557", "Archive inbound shipping intents when tracking is done", "CORE-944", "To Do", None, None),
    ("CORE-562", "PSA Offers in PSA My Orders", None, "DONE", None, None),
    ("CORE-563", "VS1 - Membership Entitlements Source of Truth (PSA and PCGS)", None, "Ready for Prod Release", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-566", "Payments charge fails for JP Orders due to Incorrect currency code", "CORE-505", "DONE", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-567", "Payments Intent is not moved to History table after CPTR Creation", "CORE-437", "Cancelled", None, None),
    ("CORE-576", "SO is not getting Finalized in DEV", None, "To Do", "Arko Dutta", "712020:33575b41-05eb-4d3a-8b23-a9cce737024c"),
    ("CORE-577", "Update GraphQL endpoint for fetching shippingTrackingDetails by Collectible Id", "CORE-242", "To Do", None, None),
    ("CORE-578", "Fix listing ids in intent db for order 20-12558-57886", None, "DONE", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-580", "Modify OES ownership transfer consumer to call vault, IMS & Inventory api through in-cluster URLs", "CORE-565", "To Do", None, None),
    ("CORE-581", "Modify OES Inventory consumer to call IMS & Inventory api through in-cluster URLs", "CORE-565", "To Do", None, None),
    ("CORE-582", "Payment Method Mapping: Furikomi is incorrectly mapping to Multiple Payments vs Furikomi", None, "DONE", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-583", "Payment charge is Failed from CORE for PCGS Coins", None, "DONE", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-586", "SO is not getting Finalized in QA", None, "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-587", "Improve logging when we dont find a spec ID in ss-oes-marketplace-prod", "CORE-565", "To Do", None, None),
    ("CORE-588", "Intents for the Deleted Items From grading are not updated in collectible_intent Table", "CORE-520", "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-596", "Integration with imaging/public cert API for images", "CORE-561", "Cancelled", None, None),
    ("CORE-600", "Encrypt PII info before publishing to message queue", "CORE-561", "Cancelled", None, None),
    ("CORE-601", "Message queue options for order data feed", "CORE-561", "Canceled", "Val Akkapeddi", "63064f0cf35a006e1be69e77"),
    ("CORE-605", "Move existing grading tables from OMS DB to new DB", "CORE-561", "Cancelled", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-607", "Validate Order Line changes when a line is removed", "CORE-520", "Cancelled", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-609", "Validate Shipping Consumer changes and redeploy to PROD", "CORE-565", "To Do", None, None),
    ("CORE-611", "CLONE - Grading Orders are not making it to NetSuite SB2/QA", None, "DONE", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-613", "[Element Phase 3] ebay Offers", None, "DONE", None, None),
    ("CORE-626", "Implement context provider for fulfillable items", "CORE-1016", "To Do", None, None),
    ("CORE-627", "VS1 - PCGS Membership: T-Shirt Preference", None, "Ready for Prod Release", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-637", "Update all CORE Grading and ERP workflows to integrate with core-order DB", "CORE-520", "Cancelled", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-638", "Historical load of order status history data from Grading", "CORE-655", "Cancelled", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-639", "Migrate grading order changes from OMS Order -> Grading Order consumer", "CORE-520", "Cancelled", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-640", "Replicate the grading order data from OMS DB -> CORE Order DB", "CORE-520", "Cancelled", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-642", "Idempotent key management around multiple request from NS", None, "To Do", "Adam Shaked", "6333196bf568615bdc7e3304"),
    ("CORE-644", "VS4 Part 2: Items Fulfillment - Memberships", "CORE-521", "Canceled", None, None),
    ("CORE-647", "Implement 4 SRE rules for monitoring in shipping order consumer", "CORE-1016", "To Do", None, None),
    ("CORE-648", "VS10 - ERP Canada", None, "In progress", None, None),
    ("CORE-655", "Orders API 2.0", None, "In progress", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-656", "Authorization needs to be added for graphql endpoints for membership entitlements", None, "Cancelled", "Arko Dutta", "712020:33575b41-05eb-4d3a-8b23-a9cce737024c"),
    ("CORE-657", "Status from membership entitlements graphql is 200 for error responses", None, "Cancelled", None, None),
    ("CORE-663", "VS1 - Membership Customer Details", None, "Ready for Prod Release", None, None),
    ("CORE-665", "ERP Gateway", None, "In progress", None, None),
    ("CORE-675", "[VS1] Update a Membership record based on a Cancellation", "CORE-437", "Cancelled", None, None),
    ("CORE-679", "VS5 - Invoicing - PSA Inbound Shipping Label", None, "In progress", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-680", "SO is not getting created in NS after DB change for grading order intents", None, "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-682", "Declared Value is sent as 0 for Creating Vault Submissions", None, "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-683", "Grading Order Line is not updated in DB after intent update from Vault to Ship_Home from PSA MyOrders", None, "Cancelled", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-684", "Vault withdrawal Shipping Orders for eBay (ProShip)", "CORE-117", "Cancelled", None, None),
    ("CORE-690", "Few fields in new core_order table for items added after order entry are not populated", None, "To Do", "Val Akkapeddi", "63064f0cf35a006e1be69e77"),
    ("CORE-691", "Membership Entitlements by Role Id graphql error message does not show RoleId Value", None, "Cancelled", "Thiago Lima", "712020:ed61d265-03be-4441-91ac-9340f8763a3c"),
    ("CORE-697", "Core Intents and grading order line tables are not updated after Cert Removal", None, "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-699", "Add/Remove Updates from Grading are not processed by CORE for PSA JP", None, "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-700", "SO created without Line Items in NS", None, "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    # Page 3
    ("CORE-701", "SO is not getting finalized", None, "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-709", "PLACEHOLDER (PM): Reholder Service Level and Service Amounts", "CORE-1058", "Cancelled", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-710", "IF records in NetSuite is not updating to Shipped", None, "DONE", None, None),
    ("CORE-712", "EmailConsumer - Avoid sending duplicate emails", "CORE-242", "To Do", None, None),
    ("CORE-713", "Automate Stripe Connect Sign Up Reminder Emails", "CORE-788", "To Do", None, None),
    ("CORE-714", "EmailConsumer - Store email addresses based on the collector ID", "CORE-242", "To Do", None, None),
    ("CORE-716", "VS1 - Memberships: Voucher Management", None, "Ready for Prod Release", None, None),
    ("CORE-721", "Project Grail [MVP Pack Purchase Offering]", None, "DONE", None, None),
    ("CORE-723", "Intercompany Shipment Transfers", None, "DONE", None, None),
    ("CORE-731", "GraphQl API for t-shirt size preference returning null values", None, "Cancelled", "Thiago Lima", "712020:ed61d265-03be-4441-91ac-9340f8763a3c"),
    ("CORE-732", "Optimize resource usage before deployment.", "CORE-1016", "To Do", None, None),
    ("CORE-733", "CollectorsID is null in fulfillment table for orders other than PSA cards", None, "DONE", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-735", "Messages are not published to grading after IF creation in CORE", None, "Cancelled", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-736", "Onboarding email is not being sent", None, "Cancelled", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-737", "Core shipping API for shipping details does not work in QA", None, "DONE", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-745", "Update Sellers Collectible Status to Active at Sort Scan End", "CORE-562", "Cancelled", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-749", "Validate cert data before creating collectible", "CORE-562", "Cancelled", None, None),
    ("CORE-750", "Enrich data required for creating collectible in IMS", "CORE-562", "Cancelled", None, None),
    ("CORE-752", "Update existing intents in intent db to add new collectible id created After OT", "CORE-562", "Cancelled", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-766", "Publish message to ERP sales order topic", "CORE-562", "Cancelled", None, None),
    ("CORE-772", "Change collectible status to Active for VAULT and MARKETPLACE intents", None, "Canceled", None, None),
    ("CORE-775", "What happens if we never got buyer payment completed message?", None, "Canceled", None, None),
    ("CORE-776", "Pass seller collectible id to oes-inventory from oms-vault-order", None, "Canceled", None, None),
    ("CORE-777", "[PLACEHOLDER] Follow up on Locale being added to CreateUserMessage core-user-consumer", "CORE-648", "To Do", None, None),
    ("CORE-779", "Disable Marketplace flows for PSA offer in ss-oes-marketplace", "CORE-562", "Cancelled", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-780", "Send emails", "CORE-562", "Cancelled", None, None),
    ("CORE-787", "SO failed to Create for PCGS Banknote when using Collectors Club Voucher", "CORE-789", "Cancelled", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-788", "Stripe Connect Sign Up - Email Reminder", None, "In progress", None, None),
    ("CORE-789", "VS2 - Sales Order (Phase 2)", None, "In progress", "ngrieb", "712020:a221fd43-4bfb-48e3-9997-db9061467275"),
    ("CORE-794", "Certs Removed after order entry are not updated in core intent and grading tables", None, "DONE", "Aditya Tangirala", "712020:1787def5-6834-481a-96b8-2fe5481cb14f"),
    ("CORE-798", "Schedule and execute recurring jobs", "CORE-788", "In progress", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-799", "Job scheduler topic for starting and ending recurring jobs", "CORE-788", "To Do", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-800", "Trigger Stripe account set up remainder email", "CORE-788", "To Do", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-801", "Stop sending Stripe account set up remainder when account set up has been completed", "CORE-788", "To Do", "Isaac Montoya", "712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe"),
    ("CORE-803", "VS1 - Customer Shipping Preference Service", None, "In progress", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-804", "VS1 - Customer Financial Data from NetSuite ERP", None, "In progress", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-810", "Updated Service level is not in kafka message payload on Shipped status event updates", None, "Cancelled", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-811", "B2B Small High Value", None, "In progress", None, None),
    ("CORE-823", "Inbound Shipping Orders Created with $0 and No Charge Attempt", None, "To Do", "Adam Shaked", "6333196bf568615bdc7e3304"),
    ("CORE-834", "Payment is not processed for Inbound Shipping for PSA submissions", None, "Ready for QA", "Arko Dutta", "712020:33575b41-05eb-4d3a-8b23-a9cce737024c"),
    ("CORE-845", "VS1 & VS4: Hold Service: Status and Workflow", None, "In progress", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-849", "PSA Inbound Shipping (shipping integration)", None, "DONE", "Adam Shaked", "6333196bf568615bdc7e3304"),
    ("CORE-862", "IF is not created for regular Pickup PSA and PCGS", None, "Cancelled", None, None),
    ("CORE-863", "IF is not created for Pickup at Show PSA", None, "Cancelled", None, None),
    ("CORE-896", "Shipping Service: Account Details and Preferences", None, "Cancelled", None, None),
    ("CORE-897", "Shared Services Orders API", None, "Cancelled", None, None),
    ("CORE-898", "Collectible_id value coming to be NULL in DB", None, "DONE", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-899", "Pick up event is not creating Dynamo DB item or publishing Kafka Message", None, "Cancelled", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-912", "PSA Offers not accepted", None, "To Do", None, None),
    ("CORE-918", "Package Forwarding (Plano Pt 2)", "CORE-944", "To Do", None, None),
    ("CORE-928", "Bulk Shipment - Cancelled bulk shipment support", "CORE-944", "To Do", None, None),
    ("CORE-930", "GraphQL throwing an internal error after sort scan is done", None, "To Do", "Arko Dutta", "712020:33575b41-05eb-4d3a-8b23-a9cce737024c"),
    ("CORE-932", "PSA Offers not accepted", None, "Cancelled", None, None),
    ("CORE-940", "Get ss-core-shipping-service working in QA with Aftership.", None, "To Do", "Thiago Lima", "712020:ed61d265-03be-4441-91ac-9340f8763a3c"),
    ("CORE-943", "PCGS Membership Order not Created in NS after cancelling a previous membership.", None, "DONE", "Kristie Gallant", "61436e55e6c39d007243cbaf"),
    ("CORE-944", "Shipping Backlog", None, "To Do", None, None),
    ("CORE-947", "Log message as error for slack alert for offer rejection scenario", "CORE-562", "Cancelled", None, None),
    ("CORE-949", "IMS Endpoint Failure due to incorrect currentOwnerCollectorsId Value", "CORE-721", "Cancelled", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-957", "eventType ORDER_REMOVED is not removing the fulfilment record", "CORE-723", "DONE", "Pooja Verma", "712020:6b042409-b9bb-4c70-ab05-e2e84c81da73"),
    ("CORE-959", "eventType ORDER_ADDED is not adding orders to existing fulfilment record", "CORE-723", "DONE", "Pooja Verma", "712020:6b042409-b9bb-4c70-ab05-e2e84c81da73"),
    ("CORE-960", "IF is not created in netsuite after shipping from proship", "CORE-723", "Cancelled", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-981", "Can not access GraphQL GUI in QA env", "CORE-721", "Cancelled", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-982", "Inbound Shipping: Resource for FedEx Ground is coming in as FedEx 2Day", None, "DONE", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-983", "Incorrect Origination Source for PowerPacks Buyback OT transfer Payload", "CORE-721", "Cancelled", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-984", "No messages in ss-core-collectible-v1", "CORE-562", "DONE", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    # Page 4
    ("CORE-995", "VS1: Customer Profile Updates: CID --> ERP", None, "In progress", "Jose Saul Chavez", "712020:e6148110-fdd5-4fe0-8cd5-d3521396d663"),
    ("CORE-1000", "Provide ERP SO with Service Level Detail + Bulk Cert #s per Order Line", "CORE-789", "Canceled", None, None),
    ("CORE-1006", "Add Bulk Cert Numbers to SO", "CORE-789", "Canceled", None, None),
    ("CORE-1014", "Facilitate post-purchase PCGS Upgrade", "CORE-1028", "Cancelled", None, None),
    ("CORE-1016", "NetSuite ERP: CORE Backlog (non-MVP)", None, "To Do", None, None),
    ("CORE-1027", "[GME]Grading Orders Status Feed (Phase 2)", None, "In QA", None, None),
    ("CORE-1028", "VS3 Part 2 - Payment Management (NetSuite MVP Backlog)", None, "In progress", "Andros Mendoza", "712020:c28b49e3-721d-4e99-9576-7cde0854de4d"),
    ("CORE-1029", "VS4 Part 2 Item Fulfillment (NetSuite MVP Backlog)", None, "In progress", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1032", "Verify Admin UI for create collectible", "CORE-562", "To Do", "Amrit Kaur", "712020:0f7a1082-0927-4173-a401-86d72eeb95b5"),
    ("CORE-1035", "NON- Grail: CORE Erp Grading workflow errors in QA", "CORE-721", "Cancelled", "Arko Dutta", "712020:33575b41-05eb-4d3a-8b23-a9cce737024c"),
    ("CORE-1046", "Evaluate & Optimize DB usage patterns", None, "To Do", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1047", "Order not found in host system", None, "DONE", "Kristie Gallant", "61436e55e6c39d007243cbaf"),
    ("CORE-1058", "GME Grading Orders Status Feed - Reholders", None, "In progress", None, None),
    ("CORE-1060", "PSA Offers in Orders: Create Collectible in IMS at V2", "CORE-562", "To Do", None, None),
    ("CORE-1067", "Maintain order status in a separate table", "CORE-1209", "To Do", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1068", "Include GME Id in all events", "CORE-1027", "Cancelled", None, None),
    ("CORE-1076", "IO: Fulfilment Record created in picked - Did not update to Shipped", None, "DONE", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1081", "Deposits are not being created after manually charging", "CORE-235", "DONE", "Nikhil Srikanth", "712020:1f45c377-d261-4aa7-a75a-9fec77845205"),
    ("CORE-1083", "Create Cash Sales for [PICK UP, SHIP OUT, ARMORED CARRIER]", "CORE-529", "Cancelled", None, None),
    ("CORE-1086", "PLACEHOLDER: List intent when Vaulting from Admin", "CORE-242", "Cancelled", "Adam Shaked", "6333196bf568615bdc7e3304"),
    ("CORE-1088", "Create feature flags for intercompany shipping deployment", None, "Cancelled", None, None),
    ("CORE-1089", "Deploy Phase 0 Prod", None, "DONE", None, None),
    ("CORE-1091", "Deploy Phase 2 (Vault) to Prod", None, "To Do", None, None),
    ("CORE-1095", "Create framework specific parent POM along with dependency specific BOMs", None, "To Do", None, None),
    ("CORE-1096", "Create framework specific parent POM along with dependency specific BOMs", None, "Code Review", "Elijah Hawes", "712020:10693382-de3c-414b-b239-b4d60659b0bd"),
    ("CORE-1098", "Create micronaut parent POM with necessary plugins", "CORE-1096", "DONE", "Elijah Hawes", "712020:10693382-de3c-414b-b239-b4d60659b0bd"),
    ("CORE-1099", "Create DB BOM for Micronaut", "CORE-1096", "DONE", "Elijah Hawes", "712020:10693382-de3c-414b-b239-b4d60659b0bd"),
    ("CORE-1100", "Create DB BOM for Spring", "CORE-1096", "DONE", "Elijah Hawes", "712020:10693382-de3c-414b-b239-b4d60659b0bd"),
    ("CORE-1101", "Include certStatusTrackingKey in all events", "CORE-1027", "DONE", "Pradipta Satapathy", "62d604f2d1bb05497b01af9f"),
    ("CORE-1102", "Create Web & API BOM for Spring", "CORE-1096", "DONE", "Elijah Hawes", "712020:10693382-de3c-414b-b239-b4d60659b0bd"),
    ("CORE-1103", "Create Web & API BOM for Micronaut", "CORE-1096", "DONE", "Elijah Hawes", "712020:10693382-de3c-414b-b239-b4d60659b0bd"),
    ("CORE-1104", "Create Testing BOMs for Spring", "CORE-1096", "DONE", "Elijah Hawes", "712020:10693382-de3c-414b-b239-b4d60659b0bd"),
    ("CORE-1105", "Create Testing BOMs for Micronaut", "CORE-1096", "DONE", "Elijah Hawes", "712020:10693382-de3c-414b-b239-b4d60659b0bd"),
    # Page 5
    ("CORE-1677", "[SB3] Implementation of Ongoing Data Sync for ERP Concurrency Validation", "CORE-540", "To Do", None, None),
    ("CORE-1676", "[SB3] Data Migration One-Time Historical Data Load for ERP Reconciliation", "CORE-540", "To Do", None, None),
    ("CORE-1668", "Unable to view multiple pages for Power user Id provided", "CORE-655", "Cancelled", "hkaki", "712020:e3f089bd-e87f-4f8b-b098-1d35ba9e981d"),
    ("CORE-1665", "[DATA MIGRATION] Legacy PCGS Membership Details Migration to Core Postgres", None, "To Do", None, None),
    ("CORE-1664", "PROD Launch Activities - ERP Data Migration", None, "To Do", None, None),
    ("CORE-1663", "Add enhanced logging for IMS createCollectible endpoint failures", None, "To Do", None, None),
    ("CORE-1662", "Add feature flags to gatehub consumer", "CORE-1579", "To Do", None, None),
    ("CORE-1660", "ERP CORE ORDER MIGRATION: Production Run - core order intents migration by processing grading migration events", "CORE-1664", "To Do", None, None),
    ("CORE-1658", "Add feature flags in gatehub consumer", None, "To Do", None, None),
    ("CORE-1656", "ERP GO-LIVE: Monitoring, alerts, production validation post NS cutover", "CORE-1579", "To Do", None, None),
    ("CORE-1655", "ERP NS Migration: Workflows validation during NS Migration window", "CORE-1664", "To Do", None, None),
    ("CORE-1654", "ERP NS Migration: Complete deployment of all CORE erp components for NS migration and Go-Live", "CORE-1664", "To Do", None, None),
    ("CORE-1653", "ERP GO-LIVE: [Placeholder] Data team to complete migration of membership customer details for historical membership subscriptions", "CORE-1579", "To Do", None, None),
    ("CORE-1652", "ERP GO-LIVE: [Placeholder] Confirm if Memberships PCGS orders which have been paid but not fulfilled are in scope for NS migration", "CORE-1579", "To Do", None, None),
    ("CORE-1651", "ERP GO-LIVE: [Placeholder] Grading Ops should not use shipping manifests generated before NS cutover post Core fulfillment migration", "CORE-1579", "To Do", None, None),
    ("CORE-1650", "CORE NS Migration: Run CORE FULFILLMENT MIGRATION In Production during NS migration downtime", "CORE-1664", "To Do", None, None),
    ("CORE-1648", "ERP NS Migration: Update IWP consumer (core payment consumer) to support brands based charge processing, update FF", "CORE-1664", "To Do", None, None),
    ("CORE-1647", "ERP NS Migration: Update erp webhooks to support during/post NS migration processing", "CORE-1664", "To Do", None, None),
    ("CORE-1645", "ERP GO-LIVE: Complete deployment/validation of Invoice Shipping label worklfow in Production", "CORE-1579", "To Do", None, None),
    ("CORE-1644", "ERP NS Migration: [Placeholder] Grading should not publish any events for order changes, cert notifications, sort events during NS downtime for migration and enable post migration completion", "CORE-1664", "To Do", None, None),
    ("CORE-1621", "Integrate payment service in financial hub to get financial detail from nav", None, "To Do", None, None),
    ("CORE-1620", "Update grading-cert-consumer, to use aggregation feed for grading pick up events", None, "To Do", None, None),
    ("CORE-1613", "Unable to view VAULT Japan orders in KAFKA topic, DB and in Postman", None, "Cancelled", None, None),
    ("CORE-1608", "Unable to view Shipping events and Database entry for PCGS_VAULT orders", None, "Cancelled", "Jimmy Ho", "712020:a5761c18-6708-45bc-8744-1e315a265a77"),
    ("CORE-1606", "Able to view Only PICK_UP Comic orders in KAFKA topic, Unable to View Ready for shipping Comics Orders", None, "Cancelled", "Aaron Barreto", "712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b"),
    ("CORE-1603", "I cant find SaleOrder SO on NetSuite for GradingOrder After V2 Process", "CORE-1349", "Cancelled", None, None),
    ("CORE-1602", "Changes to erp status consumer to process SalesOrderCreated and SalesOrderUpdated Record messages", "CORE-1349", "Cancelled", None, None),
    ("CORE-1601", "[QA] OrderNo uses Order prefix in ERP call to payment API", "CORE-655", "Cancelled", None, None),
    ("CORE-1580", "Refactor retrying of order in vendor bill creation.", None, "Scoping", None, None),
    ("CORE-1579", "PROD Launch Activities (CORE)", None, "To Do", "ngrieb", "712020:a221fd43-4bfb-48e3-9997-db9061467275"),
    ("CORE-1577", "Netsuite Non-MVP: CORE Team", None, "To Do", None, None),
    ("CORE-1575", "Retrying 400 error requests on ss-core-ops-consumer", None, "Scoping", None, None),
    ("CORE-1573", "CLONE - SUPPORT TASK - Fix OT Failures from PowerPack Purchases (Reported late December)", "CORE-1398", "To Do", "ngrieb", "712020:a221fd43-4bfb-48e3-9997-db9061467275"),
    ("CORE-1570", "CPTR Charge Created / CPTR Refund Created- Returning 500", None, "DONE", None, None),
    ("CORE-1569", "Power Packs: Vendor Bill Approved Webhook receiving 500 response", None, "To Do", None, None),
    ("CORE-1552", "Core API Call - Funko/ Comic/ PCGS - No Cert details were returning from Cert External Api in Dev", None, "Cancelled", None, None),
    ("CORE-1550", "DEV - Orders not getting displayed in UI - Funko/ Comic submissions in PSA", None, "Cancelled", "Anuj Kulkarni", "712020:3791066d-1aa0-49f1-98a5-26e4f10d01f7"),
    ("CORE-1546", "[ERP] erp-service shouldnt validate request if feature is disabled", "CORE-565", "To Do", None, None),
    ("CORE-1544", "Non MVP", None, "To Do", None, None),
    ("CORE-1531", "[eBay] Enable INTRA_VAULT_TRANSFER updates for Buyer=Seller transactions via Delisting events", "CORE-501", "To Do", None, None),
    ("CORE-1526", "CID User Blocked Status Not Syncing After Salesforce Accounting Hold Work Order", "CORE-845", "Cancelled", "Sebastiaan van de Griendt", "712020:d802e80c-5aa0-457e-9290-25f556c56688"),
    ("CORE-1525", "Account - Shipping hold is not being set on the customer in NS", "CORE-845", "Cancelled", None, None),
    ("CORE-1524", "Hold isnt be removed when there is a webhook for Order Credit Approved", "CORE-845", "DONE", None, None),
    ("CORE-1518", "Collectibles submitted for Vault are stuck in pending vault submission", None, "To Do", "Mitali Sengupta", "712020:143cd013-8d2a-4ab7-a89e-2287aaa8c54b"),
    ("CORE-1504", "[Clean up][Minor] ERP Customer consumer fix repeated CID call failures when user account is blocked", "CORE-565", "To Do", None, None),
    ("CORE-1503", "[Clean up] Payment consumer & Payment service", "CORE-565", "To Do", None, None),
    ("CORE-1502", "[Clean up][Minor] Shipping service JP Japan post failure", "CORE-565", "To Do", None, None),
    ("CORE-1501", "[Cleanup][Minor] Shipping service outbound shipping items < 100", "CORE-565", "To Do", None, None),
    ("CORE-1500", "[Cleanup][Minor] Shipping event consumer deserialization failure", "CORE-565", "To Do", None, None),
]

# Deduplicate by jira_key (first occurrence wins)
BACKLOG_TICKETS: dict[str, tuple] = {}
for t in _RAW_TICKETS:
    if t[0] not in BACKLOG_TICKETS:
        BACKLOG_TICKETS[t[0]] = t


async def seed():
    async with async_session() as db:
        # ── 1. Get or create the "Backlog" project ────────────────────
        result = await db.execute(select(Project).where(Project.name == "Backlog"))
        backlog_project = result.scalar_one_or_none()
        if not backlog_project:
            backlog_project = Project(name="Backlog", status="active")
            db.add(backlog_project)
            await db.flush()
        backlog_project_id = backlog_project.id
        print(f"Backlog project id: {backlog_project_id}")

        # ── 2. Upsert all epics ──────────────────────────────────────
        # Collect all epic keys referenced by backlog tickets
        backlog_epic_keys = set()
        for t in BACKLOG_TICKETS.values():
            if t[2]:
                backlog_epic_keys.add(t[2])

        epic_stats = {"created": 0, "skipped": 0}
        for epic_key in sorted(backlog_epic_keys):
            result = await db.execute(select(Epic).where(Epic.epic_key == epic_key))
            existing = result.scalar_one_or_none()
            if not existing:
                summary = NEW_EPICS.get(epic_key, epic_key)
                epic = Epic(
                    epic_key=epic_key,
                    project_id=backlog_project_id,
                    summary=summary,
                )
                db.add(epic)
                epic_stats["created"] += 1
            else:
                epic_stats["skipped"] += 1
        await db.flush()

        # ── 3. Upsert engineers ──────────────────────────────────────
        engineer_map: dict[str, int] = {}
        eng_stats = {"created": 0, "skipped": 0}

        for t in BACKLOG_TICKETS.values():
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
                    eng_stats["created"] += 1
                else:
                    eng_stats["skipped"] += 1
                engineer_map[acct_id] = eng.id
        await db.flush()

        # Reload all engineers for complete mapping
        result = await db.execute(select(Engineer))
        for eng in result.scalars().all():
            engineer_map[eng.jira_account_id] = eng.id

        # ── 4. Upsert tickets ────────────────────────────────────────
        ticket_stats = {"created": 0, "updated": 0}

        for jira_key, title, epic_key, status, name, acct_id in BACKLOG_TICKETS.values():
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
                ticket_stats["updated"] += 1
            else:
                db.add(Ticket(
                    jira_key=jira_key,
                    title=title,
                    epic_key=epic_key,
                    status=status,
                    assignee_id=assignee_id,
                    points=None,
                ))
                ticket_stats["created"] += 1

        # ── 5. Assign backlog-only epics to the Backlog project ──────
        # Find epic keys that exist in OTHER projects (not backlog)
        result = await db.execute(
            select(Ticket.epic_key)
            .where(Ticket.epic_key.isnot(None))
            .where(Ticket.jira_key.notin_(list(BACKLOG_TICKETS.keys())))
            .distinct()
        )
        other_project_epic_keys = {row[0] for row in result.all()}

        reassigned = 0
        for epic_key in backlog_epic_keys:
            if epic_key not in other_project_epic_keys:
                result = await db.execute(select(Epic).where(Epic.epic_key == epic_key))
                epic = result.scalar_one_or_none()
                if epic and epic.project_id != backlog_project_id:
                    epic.project_id = backlog_project_id
                    reassigned += 1

        await db.commit()

        # ── 6. Print summary ─────────────────────────────────────────
        result = await db.execute(select(Epic).where(Epic.project_id == backlog_project_id))
        backlog_epics = result.scalars().all()
        result = await db.execute(text("SELECT COUNT(*) FROM tickets"))
        total_tickets = result.scalar()
        result = await db.execute(text("SELECT COUNT(*) FROM engineers"))
        total_engineers = result.scalar()

        print(f"\n=== Backlog Seed Complete ===")
        print(f"Backlog project: {len(backlog_epics)} epics")
        for e in sorted(backlog_epics, key=lambda x: x.epic_key):
            print(f"  {e.epic_key}: {e.summary}")
        print(f"\nEpics: {epic_stats['created']} created, {epic_stats['skipped']} already existed")
        print(f"Epics reassigned to Backlog: {reassigned}")
        print(f"Engineers: {eng_stats['created']} created, {eng_stats['skipped']} already existed ({total_engineers} total)")
        print(f"Tickets: {ticket_stats['created']} created, {ticket_stats['updated']} updated ({total_tickets} total)")
        print(f"Unique backlog tickets processed: {len(BACKLOG_TICKETS)}")


if __name__ == "__main__":
    asyncio.run(seed())
