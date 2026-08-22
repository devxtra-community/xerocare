# Rent/Lease Billing Workflow with Accounts

_How a Rent or Lease contract actually moves money today — from quotation to a cleared payment — based on the current code, not the original design brief._

---

## Overview

A Rent/Lease contract collects money twice, structurally: once as an **Advance** at signing, and then repeatedly as a **periodic usage charge** for every billing cycle (monthly, quarterly, half-yearly, or yearly, depending on the contract). Both kinds of charge go through the same two-stage pattern:

1. **A Bill is created and the customer signs off on it.** This is a formal document — it states an amount, and the customer either approves it or disputes it.
2. **Only after approval can the money actually be collected**, and even then, collecting it doesn't move any accounting figures by itself — a separate Accounts approval does that.

This two-stage split (**Bill + customer approval**, then **collection + Accounts approval**) is the core idea to understand. Everything below is really just "where does this pattern apply, and what happens at each step."

---

## 1. The Full Flow, Step by Step

### Stage 0 — From Quotation to Active Contract

1. **Employee** creates a Rent or Lease quotation: machine, billing plan (Fixed Limit / CPC / EMI / FSM), billing cycle, and price.
2. The quotation goes through the customer and the Employee's own sign-off, then to **Finance**, who approves the pricing.
3. **Employee** converts the approved quotation into a live contract and **allocates a specific physical machine** to it.
4. **Employee takes the Advance** — a cash/bank/cheque payment recorded against the contract. This is automatically labeled as the contract's Advance (the first payment on any Rent/Lease contract is tagged that way).
5. **Employee activates the contract.** The contract's status becomes Active. Signing the contract agreement, taking the advance, and activating are three independent actions — the system does not enforce a strict order between them, or require the advance to be approved first.

### Stage 1 — Installation

6. Once active, the contract appears on the **Service Help Desk**'s list. A Help Desk staffer creates an Installation Request and **assigns a Technician**.
7. The **Technician** starts the job, then stops it. On stop, for a Rent/Lease job specifically, the Technician is required to enter the machine's **starting meter readings** (black & white count is mandatory; color and A3 counts are optional) before the job can be marked complete. These become the baseline every future bill is calculated from.

### Stage 2 — The Advance Bill

8. On the Finance side, once the Advance payment exists, Finance can **generate an Advance Bill** for it — a formal document showing the advance amount, payment mode, and date.
9. Finance sends it to the customer, either through a **remote signing link** or by marking it approved manually on the customer's behalf (which requires Finance to write a short note explaining why — there's no silent override).
10. The customer either **Approves** it via the link, or **Disputes** it. A disputed Advance Bill can be reset and resent for a fresh approval — but its amount can't be edited, since it represents money that's already been collected, not a figure still open to negotiation.
11. **Important:** the Advance Bill's approval status is purely a documentation/sign-off record. It does **not** block or gate the Advance _payment's_ own approval — that goes through the ordinary Accounts approval step (see Stage 4) completely independently, in either order.

### Stage 3 — Periodic Usage Bills (repeats every billing cycle)

12. Each cycle, **Finance enters the period's meter readings** (Cash/Bank/Cheque isn't involved yet — this step is purely readings). The moment those readings are submitted, the system automatically calculates the period's charge and creates the **Bill** for that period — one action does both the reading entry and the bill creation.
13. **The instant that Bill is created, its amount becomes Outstanding on Accounts Receivable** — before anyone has approved anything, before any money has moved. This is deliberate: the charge is real and owed as soon as it's calculated, not only once collected.
14. The Bill is sent to the customer (same remote-link-or-manual-approval mechanism as the Advance Bill).
15. The customer **Approves** or **Disputes** it.
    - If disputed, Finance can correct the actual meter numbers and resend it — unlike the Advance Bill, a periodic Bill's _amount_ genuinely can be corrected, because it's a calculated figure, not an already-collected payment.
16. **Only once the customer has approved does "Add Collect Amount" become available.** Trying to collect against an unapproved Bill is explicitly blocked with the message _"This bill has not been approved by the customer yet."_
17. Finance/Accounts records the collection (amount, mode, account). This creates a collection request — still not real money yet.
18. **Accounts approves the collection.** Only at this point does money actually move:
    - **Cash or Bank Transfer** — the cashbook entry posts and the account balance updates immediately.
    - **Cheque** — nothing moves yet. A cheque record is created as _Pending_; cash only moves later, when that cheque is separately **Deposited** and then **Cleared** in the Cheques module.

### Stage 4 — Machine Replacement (if it happens mid-contract)

19. If a machine on a Rent/Lease contract needs replacing, **Finance or Admin** does it directly (this is a different path from the Sale-side "machine swap," which is deliberately blocked for Rent/Lease contracts, since that path captures no meter readings and would silently corrupt the next bill).
20. The old machine's **final reading is frozen** at the moment of replacement, and the new machine starts from its own initial reading.
21. The **next Bill automatically combines both**: the old machine contributes only the usage between its last billed reading and its frozen final reading; the new machine contributes its usage from its own start. Each machine's usage window is bounded to itself, so nothing is double-counted and nothing needs to be manually combined.

---

## 2. Who's Responsible at Each Step

| Step                       | Role                | What they do                                                                     | What happens next                                                         |
| -------------------------- | ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Create quotation           | Employee            | Sets machine, plan, cycle, price                                                 | Goes to Finance for pricing approval                                      |
| Approve pricing            | Finance             | Approves the quoted terms                                                        | Employee can convert it                                                   |
| Convert & allocate machine | Employee            | Turns the quotation into a live contract, assigns a physical machine             | Contract awaits signing/advance/activation                                |
| Take Advance               | Employee            | Records the advance payment                                                      | Sits pending until Accounts approves it                                   |
| Activate contract          | Employee            | Marks the contract Active                                                        | Appears on the Service Help Desk                                          |
| Assign technician          | Help Desk / Manager | Creates the installation job, assigns a Technician                               | Technician sees the job                                                   |
| Install & capture readings | Technician          | Starts, stops, and enters starting meter readings                                | Job marked Complete; readings become the billing baseline                 |
| Generate Advance Bill      | Finance             | Creates the Advance Bill from the recorded advance                               | Sent to customer for sign-off                                             |
| Approve Advance Bill       | Customer            | Approves or disputes via remote link (or Finance marks it manually, with a note) | Documentation-only; doesn't affect the advance payment's own approval     |
| Approve advance payment    | Accounts            | Approves the advance collection request                                          | Cash/Bank move immediately; Cheque waits for Deposit + Clear              |
| Record period usage        | Finance             | Enters meter readings for the cycle                                              | Bill is created immediately; Outstanding appears on Accounts Receivable   |
| Approve periodic Bill      | Customer            | Approves or disputes the period's Bill                                           | Approval unlocks collection; dispute allows Finance to correct and resend |
| Collect payment            | Finance/Accounts    | Records the collection against an approved Bill                                  | Creates a pending collection request                                      |
| Approve collection         | Accounts            | Approves Cash/Bank (moves immediately) or Cheque (moves at Clear)                | Outstanding decreases, Paid increases                                     |
| Replace machine            | Finance/Admin       | Closes the old allocation, opens a new one                                       | Old machine's reading frozen; next Bill combines both automatically       |

---

## 3. Key Business Rules

- **A Bill's amount hits Accounts Receivable the moment the Bill is created** — not when it's approved, and not when it's paid. Outstanding is real the instant the charge is calculated.
- **Collection is only possible after the customer has approved that specific Bill.** This is a hard block, not a soft warning — there is no way to record a collection against a Bill still sitting unapproved.
- **Recording a collection or generating a receipt doesn't move any accounting figures by itself.** Only Accounts' approval (for Cash/Bank) or Deposit-then-Clear (for Cheque) actually decreases Outstanding and increases Paid. Everything before that is a pending request.
- **A disputed Bill can be edited and re-sent** — but only a periodic usage Bill's _amount_ can be corrected (it's a recalculated figure). An Advance Bill can only be re-sent as-is, since its amount is money already collected, not something still open to adjustment.
- **The Advance Bill's approval is documentation, not a gate.** It runs in parallel with, and never blocks, the advance payment's own Accounts approval.

---

## 4. How This Differs from the Sale Flow

A Direct Sale's advance/payment collection uses the **exact same underlying mechanism** as Rent/Lease — the same "Employee records → Accounts approves" pipeline, with the same Cash/Bank-immediate vs. Cheque-at-Clear rule. There's no special-casing inside that core approval logic for Sale vs. Rent vs. Lease at all.

The difference is that **Sale never gets the Bill + customer-approval layer wrapped around it.** A Sale is a single, complete transaction — there's nothing recurring to confirm. Rent/Lease gets that extra layer because it's an ongoing relationship: every billing cycle produces a _new_ charge based on _new_ meter readings that only the customer can really vouch for, so the system asks them to confirm each period's numbers are accurate before Finance can collect against them. It's the recurring, self-reported nature of usage billing — not the money itself — that justifies the extra step.

---

## 5. Where the Real Implementation Differs from the Original Design

- **The entire collection mechanism was redesigned since the original plan, and this document describes the version that's actually live today.** An earlier build tracked each contract through a three-status "Usage Pending → Invoice Pending → Summary Pending" progression, with a Finance-side "Collect Now / Collect Later" toggle that sent a collection request straight to Accounts the moment usage was recorded — with no customer sign-off step in between. That toggle no longer exists in the current Bill-collection screens; recording usage now creates a formal Bill first, and collection is impossible until the customer approves it. (The old three-status labels do still exist in the code, but only as a due-date reminder system — "this contract's next reading is due" — not as the mechanism that governs when collection is allowed.)
- **Advance and Security Deposit are collected at the same moment but treated inconsistently.** The Advance goes through the full Accounts-approval queue like every other payment. The optional Security Deposit taken during activation is recorded as an immediate, direct payment that bypasses that queue entirely — it's real money in, but it never sits pending for Accounts to approve the way everything else does. This looks like a leftover inconsistency rather than a deliberate design choice.
- **A separate written document about machine replacement is out of date.** It describes a gap — Finance having to manually add together the old and new machine's usage — that the current billing code has already automated (see Stage 4 above). If you're looking at that older document, the combined-billing logic it describes as missing is actually implemented.
- **A Finance-side fallback for entering initial meter readings, if the Technician's numbers are wrong, was never built.** The original plan called for one; today, the Technician's reading at installation is the only path — a wrong reading currently needs a direct correction outside the normal flow.
