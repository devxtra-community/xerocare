# Xerocare Service Tickets

This guide describes the service-ticket workflow implemented by the `ven_inv_service` service and exposed to the frontend through the API gateway. Related full-system documentation is in [Xerocare Complete Documentation](XEROCARE_COMPLETE_DOCUMENTATION.md), Section 13.

## What a service ticket tracks

A ticket records a customer or lead's machine fault or preventative-maintenance request, the machine and service coverage, assignment and visit schedule, technician diagnosis, parts and labour estimate, finance/customer decisions, repair activity, completion, billing and machine history.

The employee interface is the Service workspace (`/employee/service`). Ticket operations are available to help desk, service technicians, managers, finance and administrators according to the operation. A ticket is identified by UUID `id` internally and a unique human-readable `ticketNumber`.

## Roles

| Role               | Main ticket responsibilities                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Service Help Desk  | Create and update tickets, assign technicians and schedule visits, manage customer communication and record customer decisions. |
| Service Technician | Claim, diagnose, estimate, record customer acceptance, start/pause/resume repair, complete work and record collections.         |
| Finance            | Review chargeable estimates and their invoices; view tickets and service finance information.                                   |
| Manager / Admin    | View and manage tickets; approve/reject finance estimates; cancel tickets. Managers can claim diagnosis where supported.        |

Gateway and service-controller authorization both apply. Some read/report routes are available to a wider employee role, while technician mutations require service technician authorization. Ticket cancellation is limited to ADMIN and MANAGER. Check the route table below and gateway policy before granting access.

## Ticket values

### Statuses

`OPEN`, `ASSIGNED`, `DIAGNOSED`, `ESTIMATE_RECORDED`, `QUOTED`, `WAITING_FINANCE_APPROVAL`, `FINANCE_APPROVED`, `FINANCE_REJECTED`, `ADDITIONAL_ESTIMATE_PENDING`, `WAITING_FINANCE_APPROVAL_2`, `FINANCE_APPROVED_2`, `CUSTOMER_APPROVED`, `CUSTOMER_REJECTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `FREE_SERVICE`.

The actual path depends on coverage and estimate track; not every ticket uses every status. `FREE_SERVICE` indicates covered service and skips the normal chargeable finance path.

### Job types

- `ONSITE`: technician visits the customer location.
- `BRING_TO_CENTRE`: machine is brought to a service centre.
- `WARRANTY_ONSITE`: on-site warranty service.

### Machine and ticket types

- `machineType`: `PRINTER` (meter-based), `COMPUTER`, or `OTHER`. Computers and other machines skip meter readings and use time-only warranty evaluation.
- `ticketType`: `COMPLAINT` or `PREVENTATIVE_MAINTENANCE`.
- `track`: `A` or `B`, assigned by the server based on service context.

## Coverage and pricing

The backend calculates `serviceContext`; clients must not be treated as authoritative for coverage. Coverage is checked server-side during diagnosis, estimates and revisions.

| Context                | General treatment                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `RENT`                 | Full coverage during active rental: parts, toner/consumables, labour and visits.                                       |
| `LEASE_CPC`            | Full coverage for CPC/CPC_COMBO lease arrangements while the contract allocation is active, including consumables.     |
| `LEASE_UNDER_WARRANTY` | Labour, visits and spare parts covered; toner/consumables chargeable.                                                  |
| `WARRANTY`             | Labour, visits and spare parts covered; toner chargeable. Warranty ends at time or copy limit, whichever occurs first. |
| `FSMA`                 | All-inclusive coverage including toner.                                                                                |
| `SMA`                  | Labour, visits and spare parts covered; consumables and eligible copy overage chargeable.                              |
| `AMC`                  | Labour and visits covered; spare parts and consumables chargeable. Meter readings are tracking-only.                   |
| `LEASE_EXPIRED`        | Chargeable after lease term/copy limit when no active contract applies.                                                |
| `CHARGEABLE`           | No active coverage; parts and labour priced at applicable rates.                                                       |
| `EXTERNAL_MACHINE`     | Customer-owned machine purchased elsewhere; chargeable.                                                                |

Consumables are items consumed or worn through normal operation, such as toner/ink, drums, fusers, transfer belts and feed rollers. The backend categorizes parts for coverage; do not assume a customer-entered line is covered based only on its display name. Warranty is calculated centrally by `warrantyHelper.ts`. It expires by date or copies used, whichever occurs first; A3 counters count as two A4 pages. Capture the customer's printer meter reading when creating a ticket because it is used in copy-limit evaluation. Ticket creation and service meter readings are distinct values (`meterReadingAtCreation`, `meterReadingAtService`).

## End-to-end workflow

1. **Create:** Help Desk, Manager or Admin creates a ticket for a customer/product or lead. Capture machine details, complaint, job type and printer meter reading. A machine cannot normally have multiple open service tickets. Coverage and service context are resolved by the server. Chargeable tickets start `OPEN`; covered tickets may start `FREE_SERVICE`.
2. **Assign:** Help Desk assigns a technician and optionally a visit date. The ticket becomes `ASSIGNED`.
3. **Claim and diagnose:** The technician starts diagnosis. The first technician or branch manager to open/claim the ticket is recorded in `diagnosisStartedBy`; conflicting users receive a conflict response. Reassignment releases a technician's claim but not a manager's claim. The technician records problem found, root cause, notes, service meter reading (printer), labour, parts and any applicable visit/transport charge details.
4. **Estimate and finance:** Estimate lines are priced using server-calculated coverage. Covered lines have zero customer price; chargeable lines (for example AMC parts/consumables, SMA consumables, or uncovered work) are priced. Estimates go to finance approval. A zero-customer-charge estimate creates no billing quotation; after Finance approves it, inventory is reserved and the ticket is ready to start without customer approval. For a chargeable estimate, Billing receives only customer-chargeable lines; finance approval is followed by customer approval. Rejected estimates can be revised/resubmitted; later estimates use the additional-estimate flow.
5. **Customer decision:** After finance approval, staff can send the quotation by email/WhatsApp with a single-use 72-hour signing link. The customer can approve/reject from the link, or staff can record an in-person/phone/WhatsApp/email decision with the customer's name and confirmation. Approval reserves parts and can convert a linked CRM lead. Revisions are handled separately; the public signing link applies to the primary estimate.
6. **Repair:** The assigned technician starts work, moving the ticket to `IN_PROGRESS`. Repair may be paused and resumed; paused minutes are excluded from repair duration.
7. **Complete:** Technician records work/completion notes and completes the ticket. The system creates the completion bill, consumes reserved parts, updates stock and machine service history, and updates consumable-yield records where applicable. A completion payment can be recorded later as a payment request for Accounts approval.
8. **Cancel:** Only Admin or Manager may cancel. A visit charge already owed may remain collectible under its own rules.

## Visit charges and collections

Visit charges represent the technician's inspection visit; transport/pickup charges are separate. The server sets covered contexts' visit charge to zero. For chargeable tickets, a charge can be quoted at creation. During diagnosis, staff choose `ADDED_TO_ESTIMATE` (settle with estimate/completion) or `SEPARATE` (collect independently). Rejection of an estimate does not erase a visit charge that was included in the estimate after the visit occurred.

`POST /tickets/:id/collect-visit-charge` records collection using payment mode and, as applicable, cash/bank account or cheque details. Collection is allowed independently of assignment and diagnosis. Billing processes the collection idempotently. `POST /tickets/:id/collect-completion-payment` records a later completion payment request.

## Main ticket data

The `service_tickets` entity includes:

| Group                  | Representative fields                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and ownership | `id`, `ticketNumber`, `customerId`, `leadId`, `productId`, `createdBy`, `branchId`                                                      |
| Machine                | `productBrand`, `productModel`, `productName`, `serialNumber`, `machineType`, `ticketType`, meter readings                              |
| Service                | `serviceContext`, `contractReferenceId`, `jobType`, `status`, `track`, `issueDescription`                                               |
| Assignment and timing  | `assignedTechnicianId`, `scheduledVisitDate`, diagnosis claim/start/completion times, repair start/pause/completion times and durations |
| Diagnosis and outcome  | `problemFound`, `rootCause`, `diagnosisNotes`, `workPerformed`, `resolutionDetails`, `completionNotes`                                  |
| Estimate and billing   | `serviceQuotationId`, estimate flags/count, visit and transport charges, discount, linked invoice and completion bill number            |

Parts are stored as ticket items (`service_ticket_items`): catalog (`SPARE_PART`) or off-catalog (`CUSTOM`), name/SKU, quantity, customer price, free/covered flag and internal cost fields. Internal cost values are not customer-facing.

Related records include service estimates and revisions, contracts, spare-part reservations, activity history, machine service history and consumable yield history. See the complete documentation for contract configuration and billing integration details.

## Ticket API

The frontend uses `/i/service/...` gateway paths; the service itself mounts these under `/service/...`. Authenticated APIs require the normal application authorization header unless marked public/internal.

### Core ticket operations

| Method  | Gateway path                                     | Purpose / access                                                             |
| ------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| `POST`  | `/i/service/tickets`                             | Create ticket; Admin, Manager, Employee.                                     |
| `GET`   | `/i/service/tickets`                             | List tickets; Admin, Manager, Finance, Employee. Supports `branchId`.        |
| `GET`   | `/i/service/tickets/:id`                         | Ticket detail; Admin, Manager, Finance, Employee.                            |
| `PUT`   | `/i/service/tickets/:id`                         | Update ticket; Service Help Desk.                                            |
| `POST`  | `/i/service/tickets/:id/assign`                  | Assign technician/schedule; Service Help Desk.                               |
| `POST`  | `/i/service/tickets/:id/start-diagnosis`         | Claim/start diagnosis; Service Technician.                                   |
| `POST`  | `/i/service/tickets/:id/diagnose`                | Record diagnosis and items; Service Technician.                              |
| `POST`  | `/i/service/tickets/:id/quote`                   | Submit quotation; Service Technician.                                        |
| `PATCH` | `/i/service/tickets/:id/revise-estimate`         | Revise estimate; Service Technician.                                         |
| `GET`   | `/i/service/tickets/:id/revisions`               | List revisions; Technician, Help Desk, Finance.                              |
| `POST`  | `/i/service/tickets/:id/customer-approve`        | Record customer approval; Service Technician.                                |
| `POST`  | `/i/service/tickets/:id/customer-approve-upload` | Approval with uploaded signature; Service Technician. Multipart file upload. |
| `POST`  | `/i/service/tickets/:id/customer-reject`         | Record customer rejection; Service Technician.                               |
| `POST`  | `/i/service/tickets/:id/start`                   | Start service; Service Technician.                                           |
| `POST`  | `/i/service/tickets/:id/start-repair`            | Start repair; Service Technician.                                            |
| `POST`  | `/i/service/tickets/:id/pause-repair`            | Pause repair; Service Technician.                                            |
| `POST`  | `/i/service/tickets/:id/resume-repair`           | Resume repair; Service Technician.                                           |
| `POST`  | `/i/service/tickets/:id/complete`                | Complete ticket; Service Technician.                                         |
| `POST`  | `/i/service/tickets/:id/extend-validity`         | Extend estimate validity; Technician, Help Desk, Finance.                    |
| `POST`  | `/i/service/tickets/:id/cancel`                  | Cancel; Admin or Manager.                                                    |

### Estimates, finance, payment, and documents

| Method | Gateway path                                        | Purpose                                                                     |
| ------ | --------------------------------------------------- | --------------------------------------------------------------------------- |
| `GET`  | `/i/service/tickets/:id/quotation-pdf`              | Download quotation PDF.                                                     |
| `GET`  | `/i/service/tickets/:id/completion-bill-pdf`        | Download completion bill PDF.                                               |
| `POST` | `/i/service/tickets/:id/send-quotation`             | Send quotation to customer (authorization and finance-status checks apply). |
| `POST` | `/i/service/tickets/:id/send-completion-bill`       | Send completion bill.                                                       |
| `POST` | `/i/service/tickets/:id/collect-visit-charge`       | Record visit-charge payment.                                                |
| `POST` | `/i/service/tickets/:id/collect-completion-payment` | Record later completion payment.                                            |
| `GET`  | `/i/service/tickets/:id/report`                     | Ticket report PDF (service route).                                          |
| `POST` | `/i/service/tickets/:id/estimates`                  | Create estimate (service route).                                            |
| `POST` | `/i/service/tickets/:id/estimates/submit`           | Submit estimate for finance approval (service route).                       |
| `POST` | `/i/service/estimates/:estimateId/approve-finance`  | Finance/Admin/Manager approval (service route).                             |
| `POST` | `/i/service/estimates/:estimateId/reject-finance`   | Finance/Admin/Manager rejection (service route).                            |
| `POST` | `/i/service/tickets/:id/estimates/revisions`        | Create estimate revision (service route).                                   |

Additional service routes include revision decisions, customer history, technicians/performance, cash-bank accounts, machine context/lifetime cost/yield/analytics, finance dashboard and damaged-part marking. The gateway does not expose every service route under the same `/i/service` path, so integrations should follow gateway route configuration.

### Public estimate signing

These routes are unauthenticated; the single-use 72-hour token is the credential:

- `GET /service/public/service-estimate/sign/:token` — view estimate.
- `GET /service/public/service-estimate/sign/:token/pdf` — estimate PDF.
- `POST /service/public/service-estimate/sign/:token/approve` — approve.
- `POST /service/public/service-estimate/sign/:token/reject` — reject.

## Errors and operational notes

- An attempt to create another open ticket for a machine may be rejected; the UI displays the validation error.
- A diagnosis claim held by another user returns HTTP `409`.
- The server is authoritative for service context, warranty, coverage, prices and charge eligibility.
- Billing approval is asynchronous: Billing calls back to update the ticket finance state.
- Public estimate links expire after 72 hours and are single use.
- The primary estimate's public signing flow does not cover estimate revisions.

## RENT machine replacement and ticket coverage

The replacement flow is designed to keep the machine on the same RENT contract:

1. A replacement request selects a new inventory product and serial number for the existing contract.
2. At installation, Billing's `replaceDeviceAllocation` transaction closes the old `product_allocations` row as `REPLACED` and creates a new `ALLOCATED` row with the same `contractId`, the replacement's `productId` and serial number, and a link to the prior allocation. Meter readings are recorded for both devices.
3. Service ticket creation finds the inventory `Product` by serial number, gets its product ID, then calls Billing's machine billing-context endpoint. The RENT lookup requires an active RENT contract and an `ALLOCATED` row whose effective dates include the current time, matching either that product ID or serial number. If more than one active RENT/LEASE allocation matches, Billing returns a conflict instead of selecting one arbitrarily. If exactly one RENT allocation is found, the ticket context is `RENT`; coverage makes labour, service visit, spare parts and consumables free.
4. If Billing cannot be reached, ticket creation returns `503` rather than silently making an unverified machine chargeable.

**Code review result:** the replacement association and ticket lookup are implemented. A replacement that completed successfully and has a corresponding active allocation should be recognized as RENT-covered. This repository does not have a connected production database in this work session, so a particular deployed replacement still needs live-record verification.

### Diagnose a replacement showing as chargeable

Check these records in order for the replacement's serial number:

1. Inventory has a `products` row for that serial and a stable `productId`.
2. The replacement request reached `INSTALLED` and has `newAllocationId` set.
3. Billing has a `product_allocations` row with the replacement `productId` and serial, the original RENT `contractId`, and `status = ALLOCATED`.
4. The associated invoice is a PROFORMA RENT contract with `contractStatus = ACTIVE`. The legacy query accepts either `billType = RENT` or `billType IS NULL` with `saleType = RENT`.
5. Query the service machine-context endpoint with that exact serial. It should return `serviceContext: RENT`, the matching product ID and `coverageUnverified: false`. Then create the ticket; ticket creation independently resolves context server-side, so a client-supplied context cannot override a failed lookup.

If step 2 or 3 is missing, investigate the replacement installation transaction and request record. If step 1 is missing or the serial does not match, correct the inventory product/selection data. If step 4 fails, check the contract state/type. If all records match but machine context is not RENT, inspect Billing's `/invoices/machine/:productId/billing-context` result and service-to-billing connectivity. Do not manually change a ticket's context to RENT as a workaround.

For read-only Neon/PostgreSQL queries covering a single replacement, duplicate active allocations and installed replacements missing their allocation, use [SERVICE_TICKET_REPLACEMENT_AUDIT.sql](sql/SERVICE_TICKET_REPLACEMENT_AUDIT.sql). Replace the sample serial before running it; the script does not modify records.

## Source files

- Backend routes: `backend/ven_inv_service/src/routes/serviceRoutes.ts`
- Ticket entity and enums: `backend/ven_inv_service/src/entities/serviceTicketEntity.ts`
- Context resolution and ticket creation: `backend/ven_inv_service/src/controllers/serviceController.ts`
- Coverage categories and common rules: `backend/ven_inv_service/src/helpers/contractCoverageHelper.ts`
- Billing lookup of active allocations: `backend/billing_service/src/controllers/invoiceController.ts`
- Replacement installation and allocation swap: `backend/billing_service/src/services/replacementRequestService.ts`, `backend/billing_service/src/services/billingService.ts`
- Gateway routes: `backend/api_gateway/src/app.ts`
- Frontend API wrapper and data types: `frontend/lib/serviceTicket.ts`
- Full-system context: `docs/XEROCARE_COMPLETE_DOCUMENTATION.md`, Section 13
