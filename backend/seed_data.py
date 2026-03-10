"""Seed PM Nexus database with Jira data pulled via MCP."""
import asyncio
import json
from sqlalchemy import select
from app.database import engine, async_session, Base
from app.models.project import Project
from app.models.epic import Epic
from app.models.ticket import Ticket
from app.models.engineer import Engineer

# ── Epics ──────────────────────────────────────────────────────────────
EPICS = [
    {"key": "CORE-845", "summary": "VS1 & VS4: Hold Service: Status and Workflow"},
    {"key": "CORE-679", "summary": "VS5 - Invoicing - PSA Inbound Shipping Label"},
    {"key": "CORE-437", "summary": "NetSuite ERP: CORE Backlog (MVP)"},
    {"key": "CORE-540", "summary": "ERP: SB3 Environment"},
    {"key": "CORE-242", "summary": "Small High Value"},
    {"key": "CORE-655", "summary": "Orders API 2.0"},
    {"key": "CORE-1251", "summary": "Descope CIAM"},
    {"key": "CORE-1349", "summary": "Erp Performance, Scalability and Resilience"},
    {"key": "CORE-1409", "summary": "PowerPack Refactor"},
    {"key": "CORE-1579", "summary": "PROD Launch Activities (CORE)"},
    {"key": "CORE-1664", "summary": "PROD Launch Activities - ERP Data Migration"},
]

# ── Tickets (combined from ASC + DESC queries, deduplicated) ───────────
TICKETS = [
    {"key":"CORE-241","summary":"[Emails] Dollar values displaying with only one number after decimal point","status":"DONE","assignee_name":"Nikhil Srikanth","assignee_id":"712020:1f45c377-d261-4aa7-a75a-9fec77845205","points":None,"epic":"CORE-242"},
    {"key":"CORE-439","summary":"Do not send Wata grading orders to NetSuite","status":"Cancelled","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-437"},
    {"key":"CORE-467","summary":"Renewal Orders- the ship to address is not populated","status":"DONE","assignee_name":"Mitali Sengupta","assignee_id":"712020:143cd013-8d2a-4ab7-a89e-2287aaa8c54b","points":None,"epic":"CORE-437"},
    {"key":"CORE-509","summary":"Update Label rate response to OSC with fixed rate based on quantity","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-242"},
    {"key":"CORE-514","summary":"Fix CORE user consumer github release config","status":"DONE","assignee_name":"Aditya Tangirala","assignee_id":"712020:1787def5-6834-481a-96b8-2fe5481cb14f","points":None,"epic":"CORE-437"},
    {"key":"CORE-544","summary":"Analysis on CORE effort for SB3","status":"DONE","assignee_name":"Val Akkapeddi","assignee_id":"63064f0cf35a006e1be69e77","points":None,"epic":"CORE-540"},
    {"key":"CORE-554","summary":"Add Payment information to Membership/Vault Withdrawal Header","status":"DONE","assignee_name":"Mitali Sengupta","assignee_id":"712020:143cd013-8d2a-4ab7-a89e-2287aaa8c54b","points":None,"epic":"CORE-437"},
    {"key":"CORE-567","summary":"Payments Intent is not moved to History table after CPTR Creation","status":"Cancelled","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-437"},
    {"key":"CORE-577","summary":"Update GraphQL endpoint for fetching shippingTrackingDetails by Collectible Id","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-242"},
    {"key":"CORE-638","summary":"Historical load of order status history data from Grading","status":"Cancelled","assignee_name":"Aditya Tangirala","assignee_id":"712020:1787def5-6834-481a-96b8-2fe5481cb14f","points":None,"epic":"CORE-655"},
    {"key":"CORE-675","summary":"[VS1] Update a Membership record based on a Cancellation","status":"Cancelled","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-437"},
    {"key":"CORE-694","summary":"Trigger Simple CID Account onboarding email to eBay GAO submitters","status":"DONE","assignee_name":"Isaac Montoya","assignee_id":"712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe","points":None,"epic":"CORE-242"},
    {"key":"CORE-707","summary":"Insert correct T-Shirt size on Membership Renewal SO","status":"DONE","assignee_name":"Gustavo Molina","assignee_id":"712020:795ce00a-4cb2-4e31-b4f2-b4519cf1833d","points":None,"epic":"CORE-437"},
    {"key":"CORE-712","summary":"EmailConsumer - Avoid sending duplicate emails","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-242"},
    {"key":"CORE-714","summary":"EmailConsumer - Store email addresses based on the collector ID","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-242"},
    {"key":"CORE-715","summary":"PLACEHOLDER - Update CID sign up email when Mailer template is available","status":"DONE","assignee_name":"Isaac Montoya","assignee_id":"712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe","points":None,"epic":"CORE-242"},
    {"key":"CORE-778","summary":"CPTR and Deposit are not created for Vault or Membership","status":"DONE","assignee_name":"Nikhil Srikanth","assignee_id":"712020:1f45c377-d261-4aa7-a75a-9fec77845205","points":None,"epic":"CORE-437"},
    {"key":"CORE-822","summary":"Ship To Address is not populated","status":"Ready for Prod Release","assignee_name":"Anuj Kulkarni","assignee_id":"712020:3791066d-1aa0-49f1-98a5-26e4f10d01f7","points":None,"epic":"CORE-437"},
    {"key":"CORE-826","summary":"Move marketplace offer consumer to a new service","status":"DONE","assignee_name":"Isaac Montoya","assignee_id":"712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe","points":None,"epic":"CORE-242"},
    {"key":"CORE-923","summary":"Fulfillment Events Update (Order Number and Availability)","status":"Ready for Prod Release","assignee_name":"Sravya kaithi","assignee_id":"712020:8d8b6b8b-b3d9-49b8-a2c3-724d3c2244f0","points":None,"epic":"CORE-655"},
    {"key":"CORE-925","summary":"Hold/Block Service Design","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-964","summary":"Establish Order Level Hold Record","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-965","summary":"Set [Order Hold - Accounting] at Order Entry from Grading in Holds Service","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-966","summary":"Set [Order Hold - Accounting] from ERP in Holds Service","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-967","summary":"Remove [Order Hold - Accounting] based on successful Stripe Payment (from ERP) in Holds Service","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-968","summary":"Remove [Order Hold - Accounting] based on non-Stripe balanced settled (from ERP) in Holds Service","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-969","summary":"Update [Order Hold - Accounting] based on Hold Reason update in ERP in Holds Service","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-972","summary":"Set [Order Hold - Problem Order] based on Order update from Grading in Holds Service & ERP","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-974","summary":"Remove [Order Hold - Problem Order] based on Order update from Grading in Holds Service & ERP","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-986","summary":"Set [Order Hold - Shipping] from Salesforce in Holds Service, ERP, Grading","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-987","summary":"Remove [Order Hold - Shipping] from Salesforce in Holds Service, ERP, Grading","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-989","summary":"Set [Account Hold - Accounting] from Salesforce in Holds Service, ERP, and CID","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-990","summary":"Remove [Account Hold - Accounting] from Salesforce in Holds Service, ERP, and CID","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-992","summary":"Set [Account Hold - Shipping] from Salesforce in Holds Service and ERP","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-993","summary":"Remove [Account Hold - Shipping] from Salesforce in Holds Service and ERP","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-1017","summary":"Add Address to CID upon Membership Sign up if not already present","status":"DONE","assignee_name":"Nikhil Srikanth","assignee_id":"712020:1f45c377-d261-4aa7-a75a-9fec77845205","points":None,"epic":"CORE-242"},
    {"key":"CORE-1033","summary":"CORE SB3 Development","status":"Cancelled","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-540"},
    {"key":"CORE-1039","summary":"Orders API POC","status":"DONE","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-655"},
    {"key":"CORE-1064","summary":"Create event when Hold Service is updated","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-1071","summary":"Translate WATA Submission Level Holds from NetSuite into Order Level holds in the Hold Service","status":"Cancelled","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-845"},
    {"key":"CORE-1072","summary":"Create IF in NetSuite for PCGS Repo Orders that are Held at PCGS Offices","status":"In progress","assignee_name":"Isaac Montoya","assignee_id":"712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe","points":None,"epic":"CORE-437"},
    {"key":"CORE-1073","summary":"Update GraphQL query to include Account holds when querying OrderHolds","status":"DONE","assignee_name":"Gustavo Molina","assignee_id":"712020:795ce00a-4cb2-4e31-b4f2-b4519cf1833d","points":None,"epic":"CORE-845"},
    {"key":"CORE-1074","summary":"Create CID service that updates CID for Account block","status":"DONE","assignee_name":"Isaac Montoya","assignee_id":"712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe","points":None,"epic":"CORE-845"},
    {"key":"CORE-1075","summary":"Create Processors for Account Hold flows","status":"DONE","assignee_name":"Isaac Montoya","assignee_id":"712020:3675d71e-5b60-41b9-b5d7-7bb6007484fe","points":None,"epic":"CORE-845"},
    {"key":"CORE-1086","summary":"PLACEHOLDER: List intent when Vaulting from Admin","status":"Cancelled","assignee_name":"Adam Shaked","assignee_id":"6333196bf568615bdc7e3304","points":None,"epic":"CORE-242"},
    {"key":"CORE-1132","summary":"Move the SO Header / Multiline update from gatehub-consumer to ERP consumer","status":"Ready for Prod Release","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-1148","summary":"Problem Order workflow failing due to placeholder URL","status":"DONE","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-1149","summary":"API contract review","status":"DONE","assignee_name":"Adam Shaked","assignee_id":"6333196bf568615bdc7e3304","points":None,"epic":"CORE-655"},
    {"key":"CORE-1150","summary":"Design for order status history data migration plan","status":"DONE","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-655"},
    {"key":"CORE-1151","summary":"Database table design for Order API","status":"Code Review","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-655"},
    # ── From DESC query (new tickets not in ASC set) ──
    {"key":"QASS-12751","summary":"Create Invoice in NetSuite for Inbound shipping label purchase","status":"DONE","assignee_name":"hkaki","assignee_id":"712020:e3f089bd-e87f-4f8b-b098-1d35ba9e981d","points":None,"epic":"CORE-679"},
    {"key":"QAES-322","summary":"[Component Test] CORE Passes a Successful Stripe Charge Transaction Checkout","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-679"},
    {"key":"PSAO-6245","summary":"Exclude No-Grade / DNA Authenticity Failures from PSA Grading Offers","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-242"},
    {"key":"OP-4156","summary":"DEV - Order API - Funko/ Comic/ PCGS - No Cert details returning from Order API Response","status":"DONE","assignee_name":"Ted OConnor","assignee_id":"60c15ddcdeecef006ae2aeac","points":None,"epic":"CORE-655"},
    {"key":"NS-1648","summary":"Inbound Shipping: CPRT should have marketplace populated with Inbound Shipping","status":"To Do","assignee_name":"Aaron Buden","assignee_id":"62192c2171554c006956d15c","points":None,"epic":"CORE-679"},
    {"key":"NS-1607","summary":"Order Balance Update: balances only update in Orders API when Order = salesorderNumber","status":"Ready for Prod Release","assignee_name":"Juan Manuel Concari","assignee_id":"712020:584b83f2-3ba2-459a-bb9e-6c94c43e4190","points":None,"epic":"CORE-655"},
    {"key":"NS-1606","summary":"QA: Order Balance Update webhook failing with 400","status":"Ready for Prod Release","assignee_name":"Juan Manuel Concari","assignee_id":"712020:584b83f2-3ba2-459a-bb9e-6c94c43e4190","points":None,"epic":"CORE-655"},
    {"key":"NS-1605","summary":"Create Invoice for Inbound Shipping Charges","status":"PM Review","assignee_name":"Aaron Buden","assignee_id":"62192c2171554c006956d15c","points":None,"epic":"CORE-679"},
    {"key":"NS-1563","summary":"NetSuite doesn't update account for 'ALL' Accounting Hold Status reason","status":"Cancelled","assignee_name":"Phi-My Tran","assignee_id":"712020:276dc97a-12f5-4b38-b29d-1b99cc6c57b6","points":None,"epic":"CORE-845"},
    {"key":"NS-1480","summary":"[NAV dev only] Provide NAV Grading Order Amounts for Orders API","status":"Ready for Prod Release","assignee_name":"Aaron Buden","assignee_id":"62192c2171554c006956d15c","points":None,"epic":"CORE-655"},
    {"key":"CORE-1677","summary":"[SB3] Implementation of Ongoing Data Sync for ERP Concurrency Validation","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-540"},
    {"key":"CORE-1676","summary":"[SB3] Data Migration One-Time Historical Data Load for ERP Reconciliation","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-540"},
    {"key":"CORE-1675","summary":"Include department name in query for Gatehub","status":"To Do","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-655"},
    {"key":"CORE-1673","summary":"Orders API - Comics US & PSA Canada shipments have null trackingDetails","status":"Ready for Prod Release","assignee_name":"Sravya kaithi","assignee_id":"712020:8d8b6b8b-b3d9-49b8-a2c3-724d3c2244f0","points":None,"epic":"CORE-655"},
    {"key":"CORE-1672","summary":"Remove Okta auth and move external cert API to Kong","status":"In progress","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-1251"},
    {"key":"CORE-1670","summary":"Orders API - Comics order shipped via ProShip has no fulfillmentDetails","status":"Ready for Prod Release","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-655"},
    {"key":"CORE-1669","summary":"Include language header for OSC call from package submission consumer","status":"To Do","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-655"},
    {"key":"CORE-1668","summary":"Unable to view multiple pages for Power user Id provided","status":"Cancelled","assignee_name":"hkaki","assignee_id":"712020:e3f089bd-e87f-4f8b-b098-1d35ba9e981d","points":None,"epic":"CORE-655"},
    {"key":"CORE-1667","summary":"Update Invoice workflow to use Optimizely feature flag library","status":"To Do","assignee_name":"Nikhil Srikanth","assignee_id":"712020:1f45c377-d261-4aa7-a75a-9fec77845205","points":None,"epic":"CORE-1664"},
    {"key":"CORE-1666","summary":"ERP NS Migration: Add feature flag library to dependent microservices","status":"Cancelled","assignee_name":"Jacob Mims","assignee_id":"62b349cc0c77011bdfdd24d9","points":None,"epic":"CORE-1664"},
    {"key":"CORE-1662","summary":"Add feature flags to gatehub consumer","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1661","summary":"ERP CORE FULFILLMENT MIGRATION: Remove aggregation of pick up grading events","status":"To Do","assignee_name":"Andros Mendoza","assignee_id":"712020:c28b49e3-721d-4e99-9576-7cde0854de4d","points":None,"epic":"CORE-1664"},
    {"key":"CORE-1660","summary":"ERP CORE ORDER MIGRATION: Production Run - core order intents migration","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1664"},
    {"key":"CORE-1656","summary":"ERP GO-LIVE: Monitoring, alerts, production validation post NS cutover","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1655","summary":"ERP NS Migration: Workflows validation during NS Migration window","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1664"},
    {"key":"CORE-1654","summary":"ERP NS Migration: Complete deployment of all CORE erp components","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1664"},
    {"key":"CORE-1653","summary":"ERP GO-LIVE: Data team migration of membership customer details","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1652","summary":"ERP GO-LIVE: Confirm Memberships PCGS orders in scope for NS migration","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1651","summary":"ERP GO-LIVE: Grading Ops shipping manifests post Core fulfillment migration","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1650","summary":"CORE NS Migration: Run CORE FULFILLMENT MIGRATION In Production","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1664"},
    {"key":"CORE-1649","summary":"ERP CORE FULFILLMENT MIGRATION: Create migration scripts","status":"To Do","assignee_name":"Nikhil Srikanth","assignee_id":"712020:1f45c377-d261-4aa7-a75a-9fec77845205","points":None,"epic":"CORE-1664"},
    {"key":"CORE-1648","summary":"ERP NS Migration: Update IWP consumer for brands based charge processing","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1664"},
    {"key":"CORE-1647","summary":"ERP NS Migration: Update erp webhooks for during/post NS migration","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1664"},
    {"key":"CORE-1646","summary":"ERP NS Migration: Implement optimizely driven feature flags","status":"Ready for Prod Release","assignee_name":"Jacob Mims","assignee_id":"62b349cc0c77011bdfdd24d9","points":None,"epic":"CORE-1664"},
    {"key":"CORE-1645","summary":"ERP GO-LIVE: Deploy Invoice Shipping label workflow in Production","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1644","summary":"ERP NS Migration: Grading event freeze during NS downtime","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1664"},
    {"key":"CORE-1643","summary":"Update core-erp-service to work for staging","status":"Ready for Prod Release","assignee_name":"Jacob Mims","assignee_id":"62b349cc0c77011bdfdd24d9","points":None,"epic":"CORE-540"},
    {"key":"CORE-1637","summary":"Remove ship date when a label is voided","status":"Ready for Prod Release","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-655"},
    {"key":"CORE-1636","summary":"Include department name in query for fulfillment service call","status":"Ready for QA","assignee_name":"Pradipta Satapathy","assignee_id":"62d604f2d1bb05497b01af9f","points":None,"epic":"CORE-655"},
    {"key":"CORE-1634","summary":"Unable to view BULK orders in Kafka shipping topic","status":"Cancelled","assignee_name":"Aaron Barreto","assignee_id":"712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b","points":None,"epic":"CORE-655"},
    {"key":"CORE-1627","summary":"ERP GO-LIVE: Deploy Inbound Shipping Label Components before go live","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1626","summary":"ERP GO-LIVE: PSA,PCGS should use Financial hub api before go live","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1625","summary":"ERP GO-LIVE: Deploy Financial Hub components with backward compatibility","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1624","summary":"ERP CORE ORDER MIGRATION: Run migration in SB3","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1623","summary":"ERP CORE ORDER MIGRATION: New load consumer service for processing migration events","status":"In progress","assignee_name":"Jacob Mims","assignee_id":"62b349cc0c77011bdfdd24d9","points":None,"epic":"CORE-1579"},
    {"key":"CORE-1622","summary":"ERP NS MIGRATION: Share business rules for Core line Id mapping","status":"To Do","assignee_name":None,"assignee_id":None,"points":None,"epic":"CORE-1579"},
    {"key":"CORE-1618","summary":"Account Hold with type 'ALL' from Salesforce does not reflect in NetSuite","status":"DONE","assignee_name":"Jose Saul Chavez","assignee_id":"712020:e6148110-fdd5-4fe0-8cd5-d3521396d663","points":None,"epic":"CORE-845"},
    {"key":"CORE-1614","summary":"[QA] PCGS Bulk: Initial order line not deleted after grading completes","status":"To Do","assignee_name":"Aaron Barreto","assignee_id":"712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b","points":None,"epic":"CORE-655"},
    {"key":"CORE-1607","summary":"Problem Order Hold is not applied","status":"Ready for Prod Release","assignee_name":"Sebastiaan van de Griendt","assignee_id":"712020:d802e80c-5aa0-457e-9290-25f556c56688","points":None,"epic":"CORE-845"},
    {"key":"CORE-1605","summary":"Add prod configs for ss-core-grading-order-api","status":"Ready for Prod Release","assignee_name":"Aaron Barreto","assignee_id":"712020:2f62ca4e-a57a-4ff3-98e1-461e600f246b","points":None,"epic":"CORE-655"},
]


async def seed():
    # Create tables
    from app.models import document, engineer, epic, project, setting, ticket  # noqa
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # 1. Create Project
        project = Project(name="CORE Integrations", status="active")
        db.add(project)
        await db.flush()
        project_id = project.id

        # 2. Create Epics
        for e in EPICS:
            db.add(Epic(epic_key=e["key"], project_id=project_id, summary=e["summary"]))
        await db.flush()

        # 3. Create Engineers (deduplicate by assignee_id)
        engineers_map: dict[str, int] = {}  # jira_account_id -> db id
        seen = set()
        for t in TICKETS:
            aid = t["assignee_id"]
            if aid and aid not in seen:
                seen.add(aid)
                eng = Engineer(
                    jira_account_id=aid,
                    name=t["assignee_name"],
                    auto_tags=json.dumps([]),
                    manual_tags=json.dumps([]),
                )
                db.add(eng)
                await db.flush()
                engineers_map[aid] = eng.id

        # Refresh map for all engineers
        result = await db.execute(select(Engineer))
        for eng in result.scalars().all():
            engineers_map[eng.jira_account_id] = eng.id

        # 4. Create Tickets (deduplicate by key)
        seen_keys = set()
        for t in TICKETS:
            if t["key"] in seen_keys:
                continue
            seen_keys.add(t["key"])
            assignee_id = engineers_map.get(t["assignee_id"]) if t["assignee_id"] else None
            db.add(Ticket(
                jira_key=t["key"],
                epic_key=t["epic"],
                title=t["summary"],
                points=t["points"],
                status=t["status"],
                assignee_id=assignee_id,
            ))

        await db.commit()

        # Summary
        ticket_count = len(seen_keys)
        eng_count = len(engineers_map)
        print(f"Seeded: 1 project, {len(EPICS)} epics, {ticket_count} tickets, {eng_count} engineers")


if __name__ == "__main__":
    asyncio.run(seed())
