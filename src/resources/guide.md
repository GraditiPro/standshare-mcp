# StandShare Domain Guide

## What is StandShare?

StandShare is a family fundraising platform for organizations (sports booster clubs, nonprofits) that run concession stand events. Organizations sign up families who send workers to events. Workers earn commissions that are credited to their family's account. The platform handles event management, worker scheduling, financial tracking, settlement, compliance, and reporting.

## Who Uses This

- **Organization Admins** — manage the organization, events, families, users, and finances
- **Event Coordinators** — create and manage events, assign workers, handle settlement
- **Treasurers** — review financial reports, approve scholarships, manage fund balances
- **Support Staff** — look up family accounts, troubleshoot issues, answer questions

## Entity Model

Organization (top-level tenant)
├── Users (people with accounts)
├── Families (groups of workers)
│   ├── Family Members (users linked to a family)
│   └── Family Account (balance, transactions)
├── Events (concession stand shifts)
│   ├── Stands (physical stations at the event)
│   └── Worker Assignments (who works which stand)
├── Venues (where events happen)
└── Settlement Templates (how to calculate payouts)

## Event Lifecycle

1. **Upcoming** — event created, workers can sign up
2. **Active** — event day, check-in happening
3. **Completed** — event done, financial data entered
4. **Settlement In Progress** — settlement engine running
5. **Settled** — commissions distributed to family accounts

## Financial Model

### How Commissions Work

1. Event generates revenue from stand commissions and credit card tips
2. Fund deductions are applied (general fund ~6%, board fund ~3%, insurance ~$5/worker)
3. Net income is divided equally among attended workers
4. Each worker's share is credited to their family's account

**Per-worker payout = (Total Commission + CC Tips - Fund Deductions) ÷ Attended Workers**

### Settlement

Settlement uses configurable templates with line items:
- **Income sources:** stand commission, CC tips, per-person venue payments
- **Deductions:** general fund %, board fund %, insurance per-worker
- **Distribution:** equal split among attended workers

Templates are created in the UI and referenced by ID when settling events.

### Transaction Types

- `event_commission` — earnings from working an event
- `fund_deduction` — general/board/insurance deductions
- `scholarship_payment` — scholarship credit
- `bonus` — manual bonus from admin

## Worker Assignment Flow

### Registration Status
- `confirmed` — worker is assigned and confirmed
- `waitlisted` — event is full, worker is on the waitlist
- `cancelled_by_family` — family cancelled the assignment
- `declined` — worker declined the assignment

### Attendance Status
- `assigned` — initial state
- `confirmed` — worker confirmed they'll attend
- `attended` — worker showed up and worked (earns commission)
- `no_show` — worker didn't show up
- `cancelled` — assignment cancelled

**Only workers with `attended` status earn commissions.**

## Roles

| Role | Can Do |
|------|--------|
| Organization Admin | Everything within the org |
| Event Coordinator | Create/edit events, manage workers, run settlement |
| Treasurer | View/manage finances, approve scholarships |
| Family Lead | Manage own family members, view balance |
| Family Worker | View own assignments and balance |

## Data Migration Playbook

When loading historical data, follow this order (each step depends on the previous):

1. **Users** — create user accounts (users tool, create action)
2. **Families** — create family units (families tool, create action)
3. **Family Members** — link users to families (families tool, add_member action)
4. **Venues** — verify venues exist (venues tool, search action)
5. **Events** — create historical events (events tool, create action)
6. **Stands** — add stands to events (events tool, add_stand action)
7. **Worker Assignments** — assign workers (workers tool, assign action)
8. **Attendance** — mark historical attendance (workers tool, update_assignment with attendanceStatus: "attended")
Settlement, account credits and scholarships are recorded in the StandShare web app, not through this server.

## Glossary

- **Stand** — A physical concession station at a venue where workers serve
- **Worker Assignment** — Links a worker (user) to an event and optionally a specific stand
- **Settlement** — The process of calculating and distributing commissions after an event
- **Settlement Template** — A reusable configuration defining how settlement math works
- **Fund Distribution** — Whether an event's earnings are split among workers (vs. flat payout)
- **Per-Person Rate** — A fixed dollar amount paid per attended worker by the venue
- **Compliance Hold** — A block preventing a family from signing up until required docs are submitted
- **Tenant** — An organization on StandShare (multi-tenant SaaS)
- **Slug** — The URL-safe identifier for a tenant (e.g., "westlake")
