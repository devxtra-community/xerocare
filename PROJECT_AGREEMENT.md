# Software Development, Support & Change Management Agreement

## Xerocare ERP — Post-Delivery Engagement

| Field                             | Detail                                                            |
| --------------------------------- | ----------------------------------------------------------------- |
| **Agreement Title**               | Xerocare ERP — Support, Maintenance & Change Management Agreement |
| **Agreement Reference**           | `XC-AGR-[YYYY]-[NN]`                                              |
| **Project**                       | Xerocare ERP & Asset Management System                            |
| **Original Engagement Start**     | 15 December 2025                                                  |
| **This Agreement Effective From** | `[DD Month YYYY]`                                                 |
| **Initial Term**                  | `[12]` months, renewable                                          |
| **Currency**                      | Indian Rupees (INR / ₹)                                           |
| **Governing Law**                 | Republic of India                                                 |
| **Jurisdiction**                  | Courts at `[CITY, STATE]`, India                                  |

---

## 1. Parties

**1.1 The Developer** (also "we", "us", "Service Provider")

| Field                       | Detail                                     |
| --------------------------- | ------------------------------------------ |
| Legal Name                  | `[DEVELOPER LEGAL ENTITY NAME]`            |
| Constitution                | `[Private Limited / LLP / Proprietorship]` |
| Registered Address          | `[FULL ADDRESS]`                           |
| GSTIN                       | `[GSTIN]`                                  |
| PAN                         | `[PAN]`                                    |
| Authorised Signatory        | `[NAME, DESIGNATION]`                      |
| Email (contractual notices) | `[EMAIL]`                                  |

**1.2 The Client** (also "you", "Customer")

| Field                       | Detail                       |
| --------------------------- | ---------------------------- |
| Legal Name                  | `[CLIENT LEGAL ENTITY NAME]` |
| Registered Address          | `[FULL ADDRESS]`             |
| Registration / TRN / GSTIN  | `[NUMBER]`                   |
| Authorised Signatory        | `[NAME, DESIGNATION]`        |
| Email (contractual notices) | `[EMAIL]`                    |

**1.3** The Developer and the Client are individually a "Party" and collectively the "Parties".

---

## 2. Background and Purpose

**2.1** Between **15 December 2025** and the Effective Date of this Agreement, the Developer designed, built, tested and delivered the Xerocare ERP & Asset Management System (the "**System**") for the Client. The System as delivered comprises, in summary:

| Measure                    | Delivered                                           |
| -------------------------- | --------------------------------------------------- |
| Backend microservices      | 5 services + 1 API Gateway                          |
| Role-based web portals     | 6 (Admin, Manager, Finance, Employee, HR, Customer) |
| Application screens        | 186                                                 |
| Database tables / entities | 114                                                 |
| Reusable UI components     | 339                                                 |
| Source files               | 1,102                                               |
| Lines of production code   | ~297,500                                            |
| Version-control commits    | 669                                                 |
| Elapsed delivery period    | ~9 months                                           |

A module-by-module register of what was delivered is set out in **Annex A**.

**2.2** The Parties acknowledge, as a matter of record, that during the delivery period a substantial volume of additional functionality was requested by the Client, accepted verbally in meetings, and built by the Developer **without a corresponding written change order or additional fee**. Examples include, without limitation: machine replacement workflows, split A3/A4 cost-per-copy lease rates, card-fee and settlement processing, segmented profit-and-loss reporting, multi-currency and exchange-rate handling, signed-URL private asset storage, guarantee-cheque tracking, and the general ledger filter and statement engine.

**2.3** The Parties now wish to place the engagement on a clear, predictable and mutually fair footing. The purpose of this Agreement is to:

- **(a)** freeze and formally accept the System as delivered, as the "Baseline";
- **(b)** establish a single, written, mandatory route by which any new requirement is raised, estimated, approved and paid for;
- **(c)** distinguish, objectively, between a **Defect** (which the Developer fixes at no charge) and a **Change** (which is chargeable);
- **(d)** fix the working hours, working days and meeting rhythm so that both Parties can plan; and
- **(e)** protect the Client from unpredictable cost and the Developer from unpaid, unbounded work.

**2.4** This Agreement supersedes all prior quotations, proposals, emails, chat messages and verbal understandings relating to the subject matter, except in respect of amounts already invoiced and payable.

---

## 3. Definitions

| Term                    | Meaning                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Baseline**            | The System in the state described in Annex A, as accepted under Clause 5.                                                            |
| **Change**              | Any requirement, behaviour, screen, field, rule, report, integration or performance characteristic that is not part of the Baseline. |
| **Change Request (CR)** | A written request for a Change, raised on the form at Annex B and recorded in the CR Register.                                       |
| **Defect**              | A failure of the Baseline to behave as described in Annex A or in the accepted specification for that feature.                       |
| **Phase**               | A grouped, priced, scheduled and separately signed-off batch of approved CRs, per Clause 9.                                          |
| **Working Day**         | Monday to Saturday, excluding Sunday and declared holidays (Clause 10).                                                              |
| **Working Hours**       | 8 hours per Working Day, per Clause 10.                                                                                              |
| **IST**                 | Indian Standard Time (UTC+05:30). All times in this Agreement are IST.                                                               |
| **Business Hours**      | 10:00 to 19:00 IST on a Working Day.                                                                                                 |
| **CR Register**         | The shared, authoritative log of every CR and its status (Annex C).                                                                  |
| **Minutes**             | The written record of a meeting issued under Clause 11.6.                                                                            |
| **Acceptance**          | Written confirmation, or deemed confirmation under Clause 9.7, that a deliverable meets its agreed criteria.                         |

---

## 4. Baseline Scope and Scope Freeze

**4.1 The Baseline is frozen.** The functionality listed in **Annex A** constitutes the entirety of the Developer's delivery obligation under the original engagement. Nothing further is owed under that engagement.

**4.2 Anything not in Annex A is a Change.** This applies regardless of how the requirement is described. In particular, the following are Changes and are chargeable, even where the Client considers them small, obvious, implied, "part of the same screen", or previously discussed:

- a new field, column, filter, toggle, status or dropdown value;
- a new report, export, statement, chart, dashboard tile or print layout;
- a new role, permission, approval step or workflow state;
- a change to an existing calculation, tax rule, rate structure or accounting posting;
- a change to an existing screen's layout, navigation, terminology or user journey;
- support for a new branch, currency, language, tax regime or country;
- integration with any third-party system, payment gateway, courier, bank or messaging provider;
- data migration, bulk import, or backfill of historical records;
- a performance, volume or concurrency target not stated in Annex A;
- any work arising because the Client's business process itself has changed.

**4.3 Verbal instruction is not authorisation.** No statement made in a meeting, phone call, video call, WhatsApp message, chat channel or corridor conversation authorises the Developer to build anything. The Developer **shall not** commence work on any Change until a CR has been approved in writing under Clause 7. The Client shall have no liability for unapproved work, and the Developer shall have no obligation to perform it.

**4.4 No retrospective claims.** The Client shall not assert, after the Effective Date, that any item absent from Annex A was within the original quotation. Annex A is agreed to be the complete and final statement of delivered scope.

---

## 5. Acceptance of the Delivered Baseline

**5.1** Within **7 Working Days** of the Effective Date, the Client shall review Annex A and either sign the Acceptance Certificate at **Annex G**, or issue a written list of items which the Client contends were quoted but not delivered.

**5.2** Any item raised under Clause 5.1 must cite the specific clause, line item or written specification relied upon. Items which cannot be so evidenced shall be treated as Changes.

**5.3** If the Client does not respond within the period in Clause 5.1, the Baseline is **deemed accepted** in full, and the warranty at Clause 16 begins on the eighth Working Day.

---

## 6. Exclusions

**6.1** Unless expressly included in an approved CR or Phase, the following are outside this Agreement:

- **(a)** third-party licence, subscription, hosting, domain, SSL, SMS, email, payment-gateway, storage and API charges (these are the Client's direct cost and shall be held in the Client's own accounts);
- **(b)** hardware, network, printer, scanner or device procurement, configuration or repair;
- **(c)** end-user training beyond the sessions stated in Clause 16.5;
- **(d)** data entry, master-data cleansing, or operational use of the System;
- **(e)** accounting, tax, statutory or regulatory advice, or certification of the System for any audit or compliance regime;
- **(f)** recovery of data lost through Client action, third-party service failure, or absence of a backup policy the Client declined to fund;
- **(g)** support for browsers, operating systems or devices outside the versions stated in Annex A;
- **(h)** any work on a copy, fork or derivative of the System modified by any party other than the Developer.

---

## 7. Change Request Procedure

**7.1 Single route.** Every new requirement follows this procedure. There is no other route, and no exception for urgency, seniority of the requester, or size of the request.

**7.2 The eight steps.**

| #   | Step                                                                                                          | Owner     | Timing            |
| --- | ------------------------------------------------------------------------------------------------------------- | --------- | ----------------- |
| 1   | **Raise** — submit a CR on the Annex B form to the CR mailbox                                                 | Client    | Any time          |
| 2   | **Log** — CR assigned a unique ID and entered in the CR Register with status `RAISED`                         | Developer | 1 Working Day     |
| 3   | **Clarify** — Developer may ask questions; CR moves to `CLARIFICATION` and the clock pauses                   | Developer | As needed         |
| 4   | **Estimate** — Developer issues effort in hours, price in INR, dependencies, and impact on any committed date | Developer | Per Clause 7.4    |
| 5   | **Decide** — Client approves, rejects, defers or requests re-scoping, **in writing**                          | Client    | 5 Working Days    |
| 6   | **Schedule** — approved CR is allocated to a Phase under Clause 9                                             | Both      | At Phase planning |
| 7   | **Build & Test** — Developer implements and unit/integration tests                                            | Developer | Per Phase plan    |
| 8   | **Accept** — Client tests against the CR's acceptance criteria and signs off                                  | Client    | Per Clause 9.7    |

**7.3 A CR is not valid unless it states** the business problem, the desired behaviour, the affected portal(s) and screen(s), the roles affected, and the Client's own acceptance criteria. Incomplete CRs are returned and the clock does not start.

**7.4 Estimation turnaround.**

| CR complexity                                                | Developer issues estimate within |
| ------------------------------------------------------------ | -------------------------------- |
| Simple (≤ 8 hours)                                           | 2 Working Days                   |
| Medium (9–40 hours)                                          | 4 Working Days                   |
| Complex (> 40 hours, or touching accounting/ledger postings) | 7 Working Days                   |

**7.5 Estimate validity.** An estimate is valid for **30 calendar days**. After that it lapses and must be re-issued, and may change to reflect the state of the codebase at that time.

**7.6 Estimates are chargeable above a threshold.** Estimation for Complex CRs requiring more than 4 hours of analysis is chargeable at the rate in Annex E. Where the CR is subsequently approved, that analysis fee is credited in full against the CR price. This prevents unbounded free analysis of requirements the Client does not intend to fund.

**7.7 Silence.** A CR not decided within 5 Working Days moves to `DEFERRED` and leaves the active pipeline. It may be revived at any time, subject to re-estimation under Clause 7.5.

**7.8 Withdrawal.** A CR withdrawn after work has commenced is charged at actual hours expended plus 15% of the unbuilt balance.

**7.9 Priority does not mean free.** Labelling a CR "urgent", "critical", "priority" or "blocker" affects only its position in the queue, never its price. Work performed outside Working Hours to meet an urgency requested by the Client is charged at the out-of-hours multiplier in Annex E.

**7.10 The CR Register is the single source of truth.** If it is not in the CR Register, it is not being built. Both Parties shall refer to the CR Register in all discussions, and the Developer shall make it visible to the Client at all times.

---

## 8. Defect vs Change — Classification

**8.1** Correct classification is the most common source of dispute in projects of this kind. The following test is binding.

> **A Defect** is where the System does something **different** from what Annex A or the accepted specification for that feature says it should do.
>
> **A Change** is where the System does **exactly** what was specified, and the Client now wants it to do something else.

**8.2** The full classification matrix is at **Annex D** and forms part of this Agreement.

**8.3 Burden of proof.** A Party asserting that an item is a Defect must identify the specification, acceptance criterion or Annex A entry that the System contradicts. Absent that, the item is a Change.

**8.4 Regressions.** If an approved CR breaks a previously accepted feature, that breakage is a Defect of the CR and is corrected free of charge within the CR warranty at Clause 16.2. However, work required **on** a previously accepted feature **in order to** deliver a new CR is part of that CR's scope and price.

**8.5 Disputed classification.** Where the Parties cannot agree, the item is logged as `CLASSIFICATION-DISPUTED`, escalated under Clause 12.5, and — if still unresolved after 10 Working Days — the Developer shall proceed with the fix and the charge shall be **split equally** between the Parties as a good-faith compromise. Neither Party's agreement to this split prejudices its position on future items.

**8.6 No reclassification after acceptance.** A feature accepted under Clause 9.7 cannot subsequently be recategorised as a Defect on grounds of preference, business change, or the opinion of a person who did not participate in acceptance testing.

---

## 9. Phase-Based Delivery and Commercials

**9.1 Work is delivered in Phases.** Approved CRs are grouped into Phases. A Phase is a fixed, priced, scheduled and separately signed-off batch of work. The Developer does not accept a continuous, open-ended stream of instruction.

**9.2 Phase planning cadence.** Phases are planned every **`[4]` weeks**, or when the value of approved-but-unscheduled CRs reaches **₹`[AMOUNT]`**, whichever occurs first.

**9.3 Every Phase requires a signed Phase Order** stating:

- the CR IDs included, each with its agreed acceptance criteria;
- total effort in hours and total price in INR;
- the start date and the delivery date;
- the Client dependencies on which the delivery date is conditional (Clause 13);
- the payment schedule under Clause 9.4;
- the exclusions and assumptions relied upon in pricing.

**9.4 Phase payment schedule.**

| Trigger                                               | % of Phase value |
| ----------------------------------------------------- | ---------------- |
| Signature of the Phase Order (mobilisation)           | `[40]`%          |
| Developer notifies Phase ready for acceptance testing | `[30]`%          |
| Phase acceptance under Clause 9.7                     | `[30]`%          |

Work on a Phase does not commence until the mobilisation payment is received in cleared funds.

**9.5 One Phase at a time.** Only one Phase is in active development at any time. A new Phase Order is not signed while a prior Phase is unpaid or unaccepted, unless the Developer agrees in writing.

**9.6 Mid-Phase changes.** Once a Phase Order is signed, its scope is **locked**. Any new requirement arising during a Phase — including one raised in a meeting — is raised as a fresh CR and scheduled into a later Phase. The Client may request mid-Phase insertion only by written variation, which shall carry a re-planning charge of **`[15]`%** of the inserted CR's value and a corresponding extension of the delivery date. Repeated mid-Phase insertion is the single largest cause of delay and cost on this project to date, and the Parties agree to avoid it.

**9.7 Acceptance testing.** On notification that a Phase is ready, the Client has **`[7]` Working Days** to test against the acceptance criteria in the Phase Order and to return either a written acceptance or a written list of failures against those criteria. If the Client does not respond within that period, the Phase is **deemed accepted** and the final instalment falls due. Items in a failure list which do not correspond to a stated acceptance criterion are logged as new CRs, not as failures.

**9.8 Re-test.** The Developer shall correct genuine failures and re-submit within `[5]` Working Days. The Client shall re-test only the corrected items, within `[3]` Working Days.

**9.9 Estimates are estimates.** Where actual effort on a Phase exceeds the estimate by more than **`[20]`%** for reasons within the Developer's control, the Developer bears the excess. Where the excess arises from Client-side changes, late information, or dependency failure, it is charged at the rate in Annex E, notified before it is incurred.

---

## 10. Working Hours and Working Days

**10.1 Working days.** **Monday to Saturday.**

**10.2 Weekly off.** **Sunday is a non-working day.** The Developer's team is not available on Sundays. No meeting, review, deployment, test, call, message or escalation shall be scheduled on a Sunday. Messages sent on a Sunday are read on the next Working Day.

**10.3 Daily working hours.** **8 hours per Working Day**, worked between **10:00 and 19:00 IST**, inclusive of a **1-hour break**. The standard pattern is:

|                                           |                   |
| ----------------------------------------- | ----------------- |
| Start                                     | 10:00 IST         |
| Scheduled meeting window (alternate days) | 10:00 – 11:30 IST |
| Break                                     | 14:00 – 15:00 IST |
| End                                       | 19:00 IST         |
| Contracted hours                          | 8 per day         |

**10.4 Weekly commitment.** `[48]` hours per week per allocated engineer, across 6 Working Days.

**10.5 Holidays.** The Developer observes declared public holidays and the annual holiday calendar issued to the Client each `[January]`. Holidays falling on a Working Day do not extend the Developer's obligations without a corresponding adjustment to committed dates, notified in advance.

**10.6 Outside hours.** The Developer is under no obligation to respond to calls, messages or emails outside Working Hours, on Sundays, or on holidays. Where the Client requests work outside Working Hours, it is chargeable at the multiplier in Annex E and requires written agreement in advance. This does not apply to a Severity 1 production incident, which is governed by Clause 16.3.

**10.7 Timesheets.** The Developer shall maintain a record of hours worked against each CR and Phase, and shall make it available with each invoice.

**10.8 No unpaid overtime.** Sustained work beyond contracted hours is not an implied part of this Agreement. Where a Client-driven deadline can only be met by additional hours, the Developer shall say so in writing, and the Client shall either fund those hours or accept a revised date.

---

## 11. Meeting Protocol

**11.1 Frequency — one meeting every two Working Days.** Meetings are held on **alternate Working Days**, not daily. The default fixed pattern is:

| Day           | Meeting                                |
| ------------- | -------------------------------------- |
| **Monday**    | ✅ Scheduled review, 10:00 – 11:30 IST |
| Tuesday       | ❌ No meeting — development day        |
| **Wednesday** | ✅ Scheduled review, 10:00 – 11:30 IST |
| Thursday      | ❌ No meeting — development day        |
| **Friday**    | ✅ Scheduled review, 10:00 – 11:30 IST |
| Saturday      | ❌ No meeting — development day        |
| Sunday        | ❌ Weekly off                          |

**11.2 Fixed window.** Meetings start at **10:00 IST** and end **no later than 11:30 IST**. Maximum duration is **90 minutes**. The Developer will join on time; if the Client is not present by **10:15**, the meeting is cancelled and the slot is returned to development.

**11.3 Hard stop.** The 11:30 end time is a hard stop. Any topic not covered is carried to the next scheduled meeting or handled in writing. Continuation beyond 11:30 requires the Developer's agreement and is charged as consultancy time under Annex E.

**11.4 Cap.** A maximum of **3 scheduled meetings per week** and **`[6]` hours of meeting time per week**. Meeting time is drawn from, not additional to, the contracted Working Hours — every hour in a meeting is an hour not spent building.

**11.5 Ad-hoc meetings.** Meetings outside the fixed slots are by exception only, require **24 hours' notice**, and are limited to **`[2]` per month** at no charge. Beyond that, or at shorter notice, they are chargeable under Annex E. A Severity 1 production incident is exempt.

**11.6 Minutes.** The Developer shall issue written Minutes within **`[24]` hours** of each meeting, recording:

- decisions taken;
- **any new requirement raised, and the CR ID assigned to it**;
- actions, owners and due dates;
- items expressly deferred or rejected.

**11.7 Minutes are binding.** Minutes are deemed accepted and become the authoritative record unless disputed in writing within **`[24]` hours** of issue. If it is not in the Minutes, it was not agreed.

**11.8 Meetings do not authorise work.** A requirement discussed, demonstrated, praised or agreed "in principle" in a meeting is recorded as a CR at status `RAISED` and progresses only through Clause 7. Discussion is not approval. Approval is written, and it is priced.

**11.9 Attendance and authority.** The Client shall nominate **one** Authorised Representative empowered to make decisions and approve CRs, plus one alternate. Requirements raised by any other person are not actionable until endorsed by the Authorised Representative. The Developer shall likewise nominate a single point of contact.

**11.10 Agenda.** An agenda shall be circulated by **17:00 IST on the preceding Working Day** using the template at Annex F. Items not on the agenda may be raised but will be logged for the next meeting rather than discussed, unless both Parties agree otherwise within the 90-minute window.

---

## 12. Communication and Written Record

**12.1 Channels.**

| Purpose                                     | Channel                                |
| ------------------------------------------- | -------------------------------------- |
| Contractual notices, Phase Orders, invoices | Email to the addresses in Clause 1     |
| Change Requests                             | CR mailbox: `[CR EMAIL / TRACKER URL]` |
| Day-to-day coordination                     | `[Slack / Teams / WhatsApp group]`     |
| Defect reports                              | `[TRACKER URL]`                        |
| Scheduled meetings                          | `[Google Meet / Zoom link]`            |

**12.2 Response times during Business Hours:** email `[8]` Business Hours; coordination channel `[4]` Business Hours; Severity 1 incident per Clause 16.3.

**12.3 Direct contact with engineers.** The Client shall not task, instruct or pressure individual engineers directly. All work instruction flows through the Developer's single point of contact. This clause protects delivery quality and the engineers concerned.

**12.4 Language.** All CRs, Minutes, specifications and notices shall be in English.

**12.5 Escalation.**

| Level | Developer            | Client                    | Response       |
| ----- | -------------------- | ------------------------- | -------------- |
| 1     | Project Lead         | Authorised Representative | 1 Working Day  |
| 2     | Delivery Manager     | Department Head           | 3 Working Days |
| 3     | Authorised Signatory | Authorised Signatory      | 5 Working Days |

A dispute may not proceed to Clause 26 until Level 3 has been exhausted.

---

## 13. Client Responsibilities and Dependencies

**13.1** The Client shall:

- **(a)** nominate and maintain an Authorised Representative available during the meeting window in Clause 11.1;
- **(b)** respond to CR estimates, clarification questions and acceptance requests within the periods in this Agreement;
- **(c)** provide business rules, sample data, tax and accounting treatment, and approval hierarchies in writing when requested;
- **(d)** provide timely access to any third-party system, credential, sandbox, bank portal or vendor contact required for an approved CR;
- **(e)** perform acceptance testing with staff who actually use the affected module;
- **(f)** pay invoices in accordance with Clause 18;
- **(g)** maintain its own licences, subscriptions and hosting accounts in good standing;
- **(h)** ensure that data supplied to the Developer is lawfully held and lawfully disclosable.

**13.2 Consequence of dependency failure.** Where a Client dependency is late, the affected delivery date extends by **at least** the period of the delay, and the Developer may re-plan. Where the delay exceeds `[10]` Working Days, Clause 14 applies.

---

## 14. Delay, Idle Time and Standby

**14.1** The Developer allocates named engineers to this engagement in reliance on the agreed Phase plan. Where those engineers cannot proceed because of a Client dependency failure, an unanswered decision, or a suspension requested by the Client, the time is **Idle Time**.

**14.2** Idle Time exceeding **`[3]` Working Days** in aggregate within a Phase is chargeable at **`[50]`%** of the standard hourly rate in Annex E, for the allocated team, until work can resume.

**14.3** The Developer shall notify the Client in writing as soon as Idle Time begins, identify the blocking dependency, and offer available alternative work. Idle Time is not charged for any period in which the Developer failed to give that notice.

**14.4** Where a Phase is suspended at the Client's request for more than `[20]` Working Days, the Developer may release the allocated team, and remobilisation shall be subject to availability and a remobilisation charge under Annex E.

---

## 15. Freeze Periods and Re-work

**15.1 Requirements freeze.** Requirements for a Phase freeze on signature of the Phase Order (Clause 9.6).

**15.2 UI/UX freeze.** Screen layout, navigation and wording freeze on the Client's written approval of the design or of the first working build of that screen. Subsequent changes of preference are new CRs.

**15.3 Re-work allowance.** Each Phase includes **`[2]` rounds** of Client-requested cosmetic refinement per screen at no charge. Further rounds, and any structural change, are chargeable.

**15.4 Re-work is the recurring cost driver.** The Parties record that a material share of effort on this project to date has been re-work arising from requirements changing after implementation. This clause exists to make that cost visible, not to prevent change.

---

## 16. Support, Warranty and Incident Response

**16.1 Baseline warranty.** The Developer warrants the Baseline against Defects for **`[90]` days** from acceptance under Clause 5. Defects reported in that period are corrected at no charge.

**16.2 CR warranty.** Each delivered CR carries a **`[30]`-day** Defect warranty from its Phase acceptance.

**16.3 Incident severity and response** (Working Hours, unless stated):

| Severity          | Definition                                                             | Response                                     | Target resolution |
| ----------------- | ---------------------------------------------------------------------- | -------------------------------------------- | ----------------- |
| **S1 — Critical** | System down, or a whole portal / billing cycle unusable; no workaround | 2 Business Hours; best-efforts outside hours | 1 Working Day     |
| **S2 — High**     | Major function unusable; workaround exists                             | 1 Working Day                                | 3 Working Days    |
| **S3 — Medium**   | Minor function affected; limited business impact                       | 2 Working Days                               | Next Phase        |
| **S4 — Low**      | Cosmetic, or an enhancement request                                    | Logged as a CR                               | Per Clause 7      |

**16.4 Post-warranty support.** After the warranty periods lapse, support is provided under an **Annual Maintenance Contract** at the rate in Annex E, or ad-hoc at the standard hourly rate. Absent an AMC, the Developer is under no obligation to respond outside a paid CR or Phase.

**16.5 Training.** `[2]` sessions of up to `[2]` hours each per Phase, delivered remotely, are included. Additional or on-site sessions are chargeable.

**16.6 Warranty exclusions.** The warranties above do not cover: misuse; incorrect data entry; unauthorised modification of code, configuration or database; third-party service outage or breaking change; infrastructure the Client controls; or any environment the Developer has not been given access to diagnose.

---

## 17. Environments, Access and Deployment

**17.1 Environments.** The Parties shall maintain separate **Development**, **Staging** and **Production** environments. No change is deployed to Production without passing Staging acceptance.

**17.2 Deployment window.** Production deployments are performed on Working Days between `[16:00]` and `[19:00]` IST, or at another time agreed in writing. **No deployments on a Sunday or on the last `[2]` Working Days of a financial month**, given the accounting nature of the System.

**17.3 Access.** The Client shall provide and maintain the Developer's access to source repositories, deployment pipelines, database instances, object storage and monitoring for the duration of this Agreement.

**17.4 Backups.** The Client is responsible for procuring and funding backup and disaster-recovery arrangements. The Developer shall advise on a suitable policy on request; implementation of that policy is a CR.

**17.5 Rollback.** Every Production deployment shall have a documented rollback path. Where a deployment must be rolled back due to a Defect, the correction is free of charge; where it is rolled back at the Client's request for a change of mind, Clause 7.8 applies.

---

## 18. Payment Terms

**18.1 Currency.** All amounts are in Indian Rupees (INR / ₹), exclusive of GST and any other applicable tax, which shall be charged additionally at the prevailing rate.

**18.2 Invoicing.** The Developer invoices on the triggers in Clause 9.4, monthly in arrears for AMC and for time-and-materials work, and on occurrence for Idle Time and out-of-hours charges.

**18.3 Payment period.** **`[15]` calendar days** from invoice date, by bank transfer to the account notified by the Developer.

**18.4 Disputed invoices.** The Client shall pay the undisputed portion within the period in Clause 18.3, and shall raise any dispute in writing within **`[7]` days** of invoice, failing which the invoice is deemed accepted in full.

**18.5 Late payment.** Interest accrues at **`[1.5]`% per month**, or part month, on overdue sums from the due date until payment.

**18.6 Set-off.** The Client shall not withhold or set off any sum against an unrelated claim, dispute or CR.

**18.7 Annual revision.** Rates in Annex E may be revised once per year, on `[30]` days' written notice, by no more than **`[10]`%** or the change in the All-India Consumer Price Index, whichever is greater.

**18.8 Taxes.** Each Party bears its own taxes on its own income. Any withholding required by law shall be supported by a certificate issued to the Developer.

---

## 19. Suspension of Services

**19.1** The Developer may suspend all work, and withhold delivery, deployment and access, on **`[7]` days'** written notice, where:

- **(a)** an undisputed invoice remains unpaid for more than `[15]` days beyond its due date; or
- **(b)** the Client materially breaches this Agreement and fails to remedy within the notice period.

**19.2** Suspension is without prejudice to the Developer's other rights, does not relieve the Client of accrued payment obligations, and extends all committed dates by the period of suspension plus a reasonable remobilisation period.

**19.3** During suspension the Developer shall continue to respond to **S1 production incidents** affecting data integrity or business continuity, and may charge for that work at the out-of-hours rate.

---

## 20. Intellectual Property

**20.1 Client IP.** On **full payment** of all sums due, the Developer assigns to the Client all right, title and interest in the bespoke source code, database schema and documentation written specifically for the System.

**20.2 Retained IP.** The Developer retains ownership of its pre-existing materials, frameworks, libraries, tooling, generic components, know-how and techniques ("**Developer IP**"), and grants the Client a perpetual, non-exclusive, non-transferable licence to use Developer IP solely as embedded within the System.

**20.3 Until payment.** Title in any deliverable does not pass until it is paid for in full. Deliverables used in Production before payment are used under a revocable licence.

**20.4 Third-party components.** The System incorporates open-source and third-party components under their own licences. The Client is responsible for compliance with those licences in its use of the System.

**20.5 Portfolio rights.** The Developer may describe the engagement, and use the Client's name and non-confidential screenshots, in its portfolio and credentials, unless the Client objects in writing.

---

## 21. Confidentiality and Data Protection

**21.1** Each Party shall keep the other's confidential information in confidence, use it only for this engagement, and disclose it only to personnel who need it and who are bound by equivalent obligations. This survives termination by **`[3]` years**.

**21.2** Confidentiality does not extend to information that is public, independently developed, lawfully received from a third party, or required to be disclosed by law or a competent authority.

**21.3** The Client is the controller of, and warrants that it is entitled to disclose, all personal and business data placed in the System. The Developer processes such data only as needed to perform this Agreement, applies reasonable technical and organisational safeguards, and does not use it for any other purpose.

**21.4** The Developer shall notify the Client without undue delay, and in any event within `[48]` hours, of any confirmed security incident affecting Client data of which it becomes aware.

**21.5** On termination, the Developer shall, at the Client's written election, return or securely destroy Client data in its possession, save for one archival copy retained for legal and audit purposes.

---

## 22. Team, Substitution and Non-Solicitation

**22.1** The Developer shall allocate `[NUMBER]` engineers to this engagement, as set out in Annex E, and shall name them to the Client.

**22.2** The Developer may substitute personnel of equivalent skill, giving reasonable notice and bearing the cost of handover. The Client may not require the removal of a specific individual except for documented misconduct or persistent underperformance.

**22.3** Neither Party shall, during the term and for **`[12]` months** afterwards, directly or indirectly solicit or employ personnel of the other who were engaged on this project, without written consent. Breach carries a fee equal to **`[6]` months** of that person's gross remuneration.

---

## 23. Limitation of Liability

**23.1** Neither Party excludes liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any liability which cannot lawfully be limited.

**23.2** Subject to Clause 23.1, neither Party is liable for indirect, special or consequential loss, loss of profit, loss of business, loss of goodwill, or loss of anticipated savings.

**23.3** Subject to Clause 23.1, the Developer's total aggregate liability under this Agreement is limited to the **total fees actually paid by the Client to the Developer in the `[6]` months immediately preceding the event giving rise to the claim**.

**23.4** The Developer is not liable for any financial, accounting, tax or regulatory decision the Client takes in reliance on output from the System. The System is a tool; the Client remains responsible for verifying its own books, filings and statutory returns.

**23.5** No claim may be brought more than `[12]` months after the Party became aware, or ought reasonably to have become aware, of the circumstances giving rise to it.

---

## 24. Force Majeure

**24.1** Neither Party is liable for failure or delay caused by an event beyond its reasonable control, including act of God, flood, fire, epidemic, war, civil unrest, act of government, failure of a public telecommunications or power network, or failure of a third-party cloud provider.

**24.2** The affected Party shall notify the other promptly and use reasonable endeavours to mitigate. If the event continues for more than `[30]` days, either Party may terminate on written notice, and the Client shall pay for work performed and committed costs incurred up to that date.

---

## 25. Term and Termination

**25.1 Term.** This Agreement commences on the Effective Date and continues for `[12]` months, renewing automatically for successive `[12]`-month terms unless either Party gives `[60]` days' written notice not to renew.

**25.2 Termination for convenience.** Either Party may terminate on **`[60]` days'** written notice. Any Phase in progress shall be completed and paid for, unless the Parties agree otherwise in writing.

**25.3 Termination for cause.** Either Party may terminate immediately on written notice where the other commits a material breach that is not remedied within `[15]` days of notice, or becomes insolvent, enters liquidation, or has a receiver appointed.

**25.4 Consequences.** On termination:

- the Client shall pay all sums due for work performed to the date of termination, including work in progress on a pro-rata basis;
- IP assigns under Clause 20.1 only to the extent paid for;
- the Developer shall, subject to payment, hand over source code, credentials, deployment documentation and a written handover note, and shall provide up to **`[20]` hours** of transition assistance at the standard rate;
- Clauses 20, 21, 22.3, 23 and 26 survive.

---

## 26. Dispute Resolution and Governing Law

**26.1** The Parties shall first attempt to resolve any dispute through the escalation ladder at Clause 12.5.

**26.2** Failing resolution within `[30]` days of Level 3 escalation, the dispute shall be referred to arbitration by a sole arbitrator appointed by agreement, under the **Arbitration and Conciliation Act, 1996**. The seat and venue shall be `[CITY]`, India, and the proceedings shall be in English. The award shall be final and binding.

**26.3** This Agreement is governed by the laws of the Republic of India, and, subject to Clause 26.2, the courts at `[CITY, STATE]` have exclusive jurisdiction.

**26.4** Pending resolution of any dispute, both Parties shall continue to perform their obligations, save where Clause 19 applies.

---

## 27. General

**27.1 Entire agreement.** This Agreement, with its Annexes, is the entire agreement between the Parties and supersedes all prior quotations, proposals, correspondence and understandings on its subject matter.

**27.2 Variation.** No variation is effective unless in writing and signed by an Authorised Signatory of each Party. **An email approving a CR or a signed Phase Order is a valid variation of scope only, and does not vary any other term.**

**27.3 Order of precedence.** In case of conflict: (1) this Agreement; (2) the Annexes; (3) a signed Phase Order; (4) an approved CR; (5) Minutes.

**27.4 No waiver.** Failure or delay in enforcing a right is not a waiver of it. In particular, the Developer's past practice of performing unbilled work does not waive its right to charge for Changes under this Agreement.

**27.5 Severability.** If any provision is held invalid, the remainder continues in full force.

**27.6 Assignment.** Neither Party may assign this Agreement without the other's written consent, not to be unreasonably withheld.

**27.7 Relationship.** The Parties are independent contractors. Nothing creates a partnership, joint venture, agency or employment relationship.

**27.8 Notices.** Notices shall be in writing and sent to the email and postal addresses in Clause 1, and are deemed received on the next Working Day after sending (email) or on delivery (courier).

**27.9 Counterparts.** This Agreement may be executed in counterparts and by electronic signature, each of which is an original.

---

## 28. Execution

By signing below, each Party confirms that its signatory is duly authorised and that it accepts the terms of this Agreement and its Annexes.

**For the Developer**

|              |                            |
| ------------ | -------------------------- |
| Name         | `________________________` |
| Designation  | `________________________` |
| Signature    | `________________________` |
| Date         | `________________________` |
| Company seal |                            |

**For the Client**

|              |                            |
| ------------ | -------------------------- |
| Name         | `________________________` |
| Designation  | `________________________` |
| Signature    | `________________________` |
| Date         | `________________________` |
| Company seal |                            |

---

---

# Annex A — Delivered Baseline Scope Register

> This Annex records the System **as delivered on the Effective Date**. It is the reference against which every future request is tested. Anything not listed here is a Change under Clause 4.2.

## A.1 Platform and Architecture

| #      | Component                  | Delivered                                                        |
| ------ | -------------------------- | ---------------------------------------------------------------- |
| A.1.1  | API Gateway                | Request proxying, authentication, rate limiting, session caching |
| A.1.2  | Employee Service           | HR directory, payroll, JWT token issuance                        |
| A.1.3  | CRM Service                | Customer directory (PostgreSQL) + lead management (MongoDB)      |
| A.1.4  | Billing Service            | Contracts, invoicing, ledger, full accounting — 64 tables        |
| A.1.5  | Vendor & Inventory Service | Procurement, warehouse, service management — 41 tables           |
| A.1.6  | Event bus                  | RabbitMQ event choreography between services                     |
| A.1.7  | Cache                      | Redis session and state caching                                  |
| A.1.8  | Data stores                | PostgreSQL (Neon) + MongoDB (Atlas)                              |
| A.1.9  | Object storage             | Cloudflare R2 with signed private URLs                           |
| A.1.10 | Frontend                   | Next.js 16 / React 19 / TypeScript / Tailwind CSS 4              |
| A.1.11 | CI/CD                      | GitHub Actions pipeline, PM2 process management                  |

## A.2 Authentication, Roles and Multi-Branch

| #     | Feature                                                                                       |
| ----- | --------------------------------------------------------------------------------------------- |
| A.2.1 | JWT authentication with refresh tokens                                                        |
| A.2.2 | Role-based access control across all portals                                                  |
| A.2.3 | Magic-link login and forgot-password flows                                                    |
| A.2.4 | Multi-branch data isolation and branch-scoped access                                          |
| A.2.5 | Roles: Admin, Manager, Finance, Employee, HR, Service Help Desk, Service Technician, Customer |
| A.2.6 | Unauthorised-access handling and route middleware                                             |

## A.3 Portals Delivered

| Portal    | Screens |
| --------- | ------- |
| Admin     | 55      |
| Manager   | 42      |
| Finance   | 42      |
| Employee  | 26      |
| HR        | 8       |
| Customer  | 1       |
| **Total** | **186** |

## A.4 Human Resources

| #     | Feature                         |
| ----- | ------------------------------- |
| A.4.1 | Employee directory and profiles |
| A.4.2 | Attendance tracking             |
| A.4.3 | Leave management                |
| A.4.4 | Payroll processing              |
| A.4.5 | Sales targets and achievements  |
| A.4.6 | Employee expense claims         |

## A.5 CRM and Sales

| #     | Feature                                                         |
| ----- | --------------------------------------------------------------- |
| A.5.1 | Lead capture, tracking and lead-to-customer conversion          |
| A.5.2 | Customer directory, B2B/B2C classification, Customer 360 view   |
| A.5.3 | Quotation creation, quotation templates and template assignment |
| A.5.4 | Quotation-to-contract conversion flow                           |
| A.5.5 | Orders, sales register and direct sale                          |
| A.5.6 | Sales returns                                                   |
| A.5.7 | Contract agreements and contract renewals                       |

## A.6 Contracts and Billing

| #      | Feature                                                               |
| ------ | --------------------------------------------------------------------- |
| A.6.1  | Sale workflow — end to end                                            |
| A.6.2  | Rent workflow — end to end                                            |
| A.6.3  | Lease workflow — end to end                                           |
| A.6.4  | Cost-per-copy (CPC) billing, including separate A3/A4 excess rates    |
| A.6.5  | FSM lease handling with warranty defaults                             |
| A.6.6  | Meter reading capture and usage-based billing                         |
| A.6.7  | Advance vs arrears billing modes                                      |
| A.6.8  | Periodic/recurring billing via scheduled jobs                         |
| A.6.9  | Machine replacement and machine swap flows, with customer e-signature |
| A.6.10 | Invoice generation, invoice ledger and settlement tracking            |
| A.6.11 | Credit notes and approvals                                            |
| A.6.12 | Security deposit handling, tracked separately from invoice payment    |
| A.6.13 | Sale payment requests and receipts                                    |

## A.7 Procurement and Inventory

| #     | Feature                                                                     |
| ----- | --------------------------------------------------------------------------- |
| A.7.1 | Vendor master and vendor statements                                         |
| A.7.2 | RFQ creation, comparison and award                                          |
| A.7.3 | Purchase orders, purchase receipts and international purchase cost tracking |
| A.7.4 | Lot management                                                              |
| A.7.5 | Product, brand and model masters, including bulk product upload             |
| A.7.6 | Machine serial tracking                                                     |
| A.7.7 | Spare-parts inventory with low-stock alerts                                 |
| A.7.8 | Warehouse management                                                        |
| A.7.9 | Inter-branch stock transfers with approval flow                             |

## A.8 Service Management

| #      | Feature                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------ |
| A.8.1  | Service ticket lifecycle: Open → Assigned → In Progress → Quoted → Customer Approved → Completed |
| A.8.2  | Technician assignment and visit scheduling                                                       |
| A.8.3  | Diagnosis logging and spare-part requests, including unregistered custom parts                   |
| A.8.4  | Service quotations and Finance approval                                                          |
| A.8.5  | Customer approval capture                                                                        |
| A.8.6  | Automatic inventory deduction on job completion                                                  |
| A.8.7  | Installation requests                                                                            |
| A.8.8  | Service contracts and service agreements                                                         |
| A.8.9  | Service estimates                                                                                |
| A.8.10 | Preventive maintenance and breakdown repair handling                                             |
| A.8.11 | Warranty limit verification on lease contracts                                                   |
| A.8.12 | Customer intelligence view — service history plus live contract/invoice history                  |

## A.9 Finance and Accounting

| #      | Feature                                                                              |
| ------ | ------------------------------------------------------------------------------------ |
| A.9.1  | Chart of Accounts with drill-down on every line                                      |
| A.9.2  | General Ledger with unified search and transaction-level detail                      |
| A.9.3  | Day Book and Branch Activity log                                                     |
| A.9.4  | Balance Sheet                                                                        |
| A.9.5  | Profit & Loss / Income Statement                                                     |
| A.9.6  | Segmented P&L — profit by Sale / Rent / Lease, per product and contract              |
| A.9.7  | Cash Flow statement                                                                  |
| A.9.8  | Cash & Bank accounts, with cash-account enforcement                                  |
| A.9.9  | Accounts Receivable, with ageing and drill-down                                      |
| A.9.10 | Accounts Payable, with a Payments tab and approval queue                             |
| A.9.11 | Cheque management — issue, deposit, clearance, two-date model and reminders          |
| A.9.12 | Guarantee cheque tracking                                                            |
| A.9.13 | Card fees (configurable MDR engine) and card settlements                             |
| A.9.14 | Fixed assets and depreciation                                                        |
| A.9.15 | Equity management                                                                    |
| A.9.16 | Expense management and expense approval requests                                     |
| A.9.17 | Other income management                                                              |
| A.9.18 | Tax / VAT handling, including customer VAT-exemption states and output-tax reporting |
| A.9.19 | Multi-currency support and exchange rates                                            |
| A.9.20 | Opening balances                                                                     |
| A.9.21 | Reports module and Generate Statement engine (customer, vendor, ledger)              |
| A.9.22 | Data integrity checks                                                                |
| A.9.23 | Manager purchase approval gate through the Finance queue                             |

## A.10 Cross-Cutting

| #      | Feature                                              |
| ------ | ---------------------------------------------------- |
| A.10.1 | Notification system with in-app delivery             |
| A.10.2 | Universal PDF export across documents                |
| A.10.3 | Audit logging                                        |
| A.10.4 | Public customer-facing signature pages (token-based) |
| A.10.5 | Responsive web UI                                    |

## A.11 Supported Environments

| Item              | Supported                                                |
| ----------------- | -------------------------------------------------------- |
| Browsers          | `[Chrome / Edge / Firefox / Safari — latest 2 versions]` |
| Devices           | Desktop and tablet, `[≥ 768px]`                          |
| Concurrent users  | `[NUMBER]`                                               |
| Data volume basis | `[NUMBER]` transactions per month                        |

> Any requirement beyond the versions, devices, user counts or volumes stated in A.11 is a Change.

---

# Annex B — Change Request Form

> A CR is not valid, and no clock starts, unless every field below is completed.

```
╔══════════════════════════════════════════════════════════════════════╗
║  XEROCARE ERP — CHANGE REQUEST                                       ║
╚══════════════════════════════════════════════════════════════════════╝

CR ID .....................  CR-[YYYY]-[NNN]        (assigned by Developer)
Date raised ...............
Raised by .................  (name, designation)
Authorised Representative .  (must endorse before estimation)

── 1. BUSINESS NEED ──────────────────────────────────────────────────
What business problem does this solve? Why now?


── 2. CURRENT BEHAVIOUR ──────────────────────────────────────────────
What does the System do today? (Attach screenshot.)


── 3. REQUIRED BEHAVIOUR ─────────────────────────────────────────────
What should it do instead? Be specific about every field, rule and case.


── 4. AFFECTED AREAS ─────────────────────────────────────────────────
Portal(s) .................  ☐ Admin  ☐ Manager  ☐ Finance
                             ☐ Employee  ☐ HR  ☐ Customer
Module(s) .................
Screen(s) .................
Roles affected ............
Accounting impact? ........  ☐ Yes  ☐ No     (if Yes → Complex CR)
Migration of existing data?  ☐ Yes  ☐ No

── 5. ACCEPTANCE CRITERIA (completed by Client) ──────────────────────
This CR is accepted when:
  1.
  2.
  3.
(Only these criteria may be cited as a failure at acceptance testing.)

── 6. PRIORITY ───────────────────────────────────────────────────────
☐ Must have   ☐ Should have   ☐ Could have   ☐ Won't have (this Phase)
Business justification for priority:

╔══════════════════════════════════════════════════════════════════════╗
║  DEVELOPER SECTION — do not complete                                 ║
╚══════════════════════════════════════════════════════════════════════╝
Classification ............  ☐ Change (chargeable)   ☐ Defect (free)
Reason for classification .
Complexity ................  ☐ Simple ☐ Medium ☐ Complex
Estimated effort ..........  ______ hours
Price .....................  ₹ ______  (+ GST)
Impact on committed dates .
Dependencies / assumptions
Estimate valid until ......  (30 days from issue)

╔══════════════════════════════════════════════════════════════════════╗
║  CLIENT DECISION                                                     ║
╚══════════════════════════════════════════════════════════════════════╝
☐ APPROVED — proceed, allocate to Phase ______
☐ REJECTED
☐ DEFERRED
☐ RE-SCOPE — see notes

Authorised Representative:  _______________   Date: ___________
Signature:                  _______________
```

---

# Annex C — Change Request Register

> Maintained by the Developer, visible to the Client at all times. It is the single source of truth under Clause 7.10.

| CR ID       | Date | Title | Class  | Complexity | Hours | Price (₹) | Status | Phase | Accepted |
| ----------- | ---- | ----- | ------ | ---------- | ----- | --------- | ------ | ----- | -------- |
| CR-2026-001 |      |       | Change | Medium     |       |           | RAISED | —     | —        |
|             |      |       |        |            |       |           |        |       |          |

**Status values:** `RAISED` → `CLARIFICATION` → `ESTIMATED` → `APPROVED` → `SCHEDULED` → `IN PROGRESS` → `READY FOR UAT` → `ACCEPTED` · or `REJECTED` / `DEFERRED` / `WITHDRAWN` / `CLASSIFICATION-DISPUTED`

---

# Annex D — Defect vs Change Classification Matrix

> The binding test under Clause 8.1:
> **Defect** = System does something _different_ from what was specified.
> **Change** = System does _exactly_ what was specified, and you now want something else.

## D.1 Defects — corrected free of charge within warranty

| Scenario                                                                        |
| ------------------------------------------------------------------------------- |
| A calculation produces a mathematically wrong result against the agreed formula |
| A saved record does not persist, or persists incorrectly                        |
| An error or crash occurs on a documented, supported user journey                |
| A role can access data outside its permitted branch or scope                    |
| A field displays a value different from the one stored                          |
| A report total does not equal the sum of its own line items                     |
| A previously accepted feature stops working after a Developer deployment        |
| A document (PDF/export) omits data that the specification says it must contain  |
| A workflow cannot advance through a state transition defined in Annex A         |

## D.2 Changes — chargeable

| Scenario                                                        | Frequently mislabelled as   |
| --------------------------------------------------------------- | --------------------------- |
| "Add one more field to this form"                               | "Small fix"                 |
| "Add a column to this table / report"                           | "Minor change"              |
| "Change this calculation — the business rule is different now"  | "Bug in the calculation"    |
| "This report should also show last year's comparison"           | "Report is incomplete"      |
| "Move this button / change this label / change this colour"     | "UI issue"                  |
| "This role should also be able to see this screen"              | "Permission bug"            |
| "Add an approval step before this action"                       | "Missing validation"        |
| "It should send an email/SMS when this happens"                 | "Notification not working"  |
| "Support a second currency / branch / tax rate here"            | "Configuration issue"       |
| "Integrate with `[bank / gateway / courier / portal]`"          | "Just an API"               |
| "Import our historical data into this module"                   | "Data issue"                |
| "It's too slow with 5 years of data" (no stated target in A.11) | "Performance bug"           |
| "Our process changed, so the workflow must change"              | "Doesn't match our process" |
| "The other portal has this, so this one should too"             | "Inconsistency"             |
| "Make it work on mobile phones" (outside A.11)                  | "Responsive bug"            |
| "We didn't realise it would work this way"                      | "Misunderstanding / bug"    |

## D.3 Edge cases

| Situation                                                       | Treatment                                 |
| --------------------------------------------------------------- | ----------------------------------------- |
| Specification was genuinely ambiguous, both readings reasonable | Cost shared 50/50 (Clause 8.5)            |
| Feature works, but is unusable for the stated business purpose  | Defect                                    |
| Feature works as specified, but the specification was wrong     | Change                                    |
| New CR breaks an accepted feature                               | Defect of that CR — free (Clause 8.4)     |
| Accepted feature must be modified to deliver a new CR           | Part of that CR — chargeable (Clause 8.4) |
| Third-party service changed its API                             | Change                                    |
| Legal or tax regulation changed                                 | Change                                    |
| Client staff entered data incorrectly                           | Not a Defect — support/training           |

---

# Annex E — Rate Card, Team and Phase Pricing

## E.1 Standard rates (INR, exclusive of GST)

| Item                                                   | Rate                             |
| ------------------------------------------------------ | -------------------------------- |
| Standard hourly rate — Developer                       | ₹ `[____]` / hour                |
| Standard hourly rate — Senior / Architect              | ₹ `[____]` / hour                |
| Standard daily rate (8 hours)                          | ₹ `[____]` / day                 |
| Out-of-hours / Sunday / holiday multiplier             | `[1.5]`× standard                |
| Emergency S1 response outside Working Hours            | `[2.0]`× standard                |
| Chargeable estimation (Clause 7.6)                     | Standard hourly rate             |
| Ad-hoc meeting beyond the free allowance (Clause 11.5) | ₹ `[____]` / hour                |
| Meeting overrun beyond 11:30 (Clause 11.3)             | ₹ `[____]` / hour                |
| Idle Time / standby (Clause 14.2)                      | `[50]`% of standard hourly rate  |
| Remobilisation after suspension (Clause 14.4)          | ₹ `[____]`                       |
| Mid-Phase insertion charge (Clause 9.6)                | `[15]`% of the inserted CR value |
| On-site visit (per day + travel at actuals)            | ₹ `[____]` / day                 |
| Additional training session                            | ₹ `[____]` / session             |

## E.2 Annual Maintenance Contract (optional)

| Tier     | Cover                                                                  | Annual fee |
| -------- | ---------------------------------------------------------------------- | ---------- |
| Basic    | S1/S2 support in Business Hours; no development hours                  | ₹ `[____]` |
| Standard | Above + `[__]` development hours per month, unused hours lapse monthly | ₹ `[____]` |
| Premium  | Above + `[__]` hours, priority queue, extended response                | ₹ `[____]` |

## E.3 Allocated team

| Role              | Name     | Allocation | Rate       |
| ----------------- | -------- | ---------- | ---------- |
| Project Lead      | `[NAME]` | `[__]`%    | ₹ `[____]` |
| Backend Engineer  | `[NAME]` | `[__]`%    | ₹ `[____]` |
| Frontend Engineer | `[NAME]` | `[__]`%    | ₹ `[____]` |
| QA                | `[NAME]` | `[__]`%    | ₹ `[____]` |

## E.4 Phase Order template

```
PHASE ORDER  —  Phase [N]                        Ref: XC-PO-[YYYY]-[NN]

CRs included:        CR-____ , CR-____ , CR-____
Total effort:        ______ hours
Total price:         ₹ ______        (+ GST)
Start date:          __________
Delivery date:       __________      (conditional on the dependencies below)

Client dependencies and required-by dates:
  1. ____________________________  by __________
  2. ____________________________  by __________

Assumptions relied on in pricing:
  1.
  2.

Exclusions:
  1.

Payment:   [40]% on signature  |  [30]% at UAT  |  [30]% on acceptance

Scope locked on signature. New requirements → new CR → later Phase (Cl. 9.6).

Developer: ____________  Date: ______   Client: ____________  Date: ______
```

---

# Annex F — Meeting Schedule and Agenda Template

## F.1 Fixed schedule

| Day           | Time (IST)        | Status                      |
| ------------- | ----------------- | --------------------------- |
| **Monday**    | **10:00 – 11:30** | Scheduled review            |
| Tuesday       | —                 | Development day, no meeting |
| **Wednesday** | **10:00 – 11:30** | Scheduled review            |
| Thursday      | —                 | Development day, no meeting |
| **Friday**    | **10:00 – 11:30** | Scheduled review            |
| Saturday      | —                 | Development day, no meeting |
| **Sunday**    | —                 | **Weekly off — no contact** |

**Rules:** start 10:00 · hard stop 11:30 · max 90 minutes · cancelled if Client absent at 10:15 · max 3 meetings and `[6]` hours per week · agenda by 17:00 the previous Working Day · Minutes within 24 hours · Minutes binding unless disputed within 24 hours.

## F.2 Agenda template

```
XEROCARE ERP — REVIEW MEETING
Date: __________     10:00 – 11:30 IST     Meeting #____

Attendees:  Developer ______________   Client ______________

10:00 – 10:10   Actions from previous Minutes
10:10 – 10:30   Progress on the active Phase (CR by CR)
10:30 – 10:50   Demonstration of completed items
10:50 – 11:05   Blockers and Client dependencies outstanding
11:05 – 11:20   NEW REQUIREMENTS — logged as CRs only, not discussed in depth
11:20 – 11:30   Next steps, owners, dates
11:30           HARD STOP

New requirements raised today  →  CR IDs assigned:
  CR-______  ____________________________________
  CR-______  ____________________________________

Reminder: discussion is not approval. Nothing is built until a CR is
estimated and approved in writing (Clauses 4.3 and 11.8).
```

## F.3 Minutes template

```
MINUTES — Meeting #____        Date: __________
Issued: __________ (within 24 hours)
Deemed accepted unless disputed in writing by: __________ (+24 hours)

1. DECISIONS TAKEN
   1.1

2. NEW REQUIREMENTS RAISED  (logged as CRs — not authorised for build)
   CR-______   Description ____________   Status: RAISED

3. ACTIONS
   #  Action                Owner      Due
   1

4. DEFERRED / REJECTED
   4.1

5. DEPENDENCIES AWAITED FROM CLIENT
   5.1  ____________________  required by __________
```

---

# Annex G — Acceptance Certificate (Baseline)

```
╔══════════════════════════════════════════════════════════════════════╗
║  BASELINE ACCEPTANCE CERTIFICATE  —  XEROCARE ERP                    ║
╚══════════════════════════════════════════════════════════════════════╝

Agreement reference:  XC-AGR-[YYYY]-[NN]
Baseline reference:   Annex A of the Agreement
Delivery period:      15 December 2025 to [DD Month YYYY]

The Client confirms that:

  1. It has reviewed Annex A in full.
  2. The System as described in Annex A has been delivered and is in
     productive use.
  3. The original engagement is complete and no further delivery is
     owed under it.
  4. All future requirements will be raised, estimated, approved and
     paid for under Clause 7 of the Agreement.
  5. The [90]-day Baseline warranty (Clause 16.1) begins today.

Outstanding items claimed as within the original quotation
(each must cite the written scope item relied upon — Clause 5.2):

  1. ____________________________________________
  2. ____________________________________________
  ☐ None

For the Client:

  Name        ____________________
  Designation ____________________
  Signature   ____________________
  Date        ____________________
```

---

## Document Control

| Version | Date              | Author   | Change                          |
| ------- | ----------------- | -------- | ------------------------------- |
| 1.0     | `[DD Month YYYY]` | `[NAME]` | Initial issue for Client review |

---

_End of Agreement._
