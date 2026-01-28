
# System Data Reset for Testing

## Summary

Delete all transactional/operational data while preserving master data (customers, agents, employees, and configuration).

## Current Data to Delete

| Table | Records | Description |
|-------|---------|-------------|
| **Billing & Payments** | | |
| invoice_items | 14 | Line items on invoices |
| invoices | 6 | Customer and agent invoices |
| payments | 5 | Payment records |
| estimates | 4 | Price estimates |
| **Shipping** | | |
| parcels | 4 | Individual parcels |
| shipments | 5 | Shipment records |
| cargo_batches | 1 | Cargo batch groupings |
| batch_costs | 0 | Batch cost allocations |
| shipment_cost_allocations | 0 | Cost allocations |
| **Accounting** | | |
| journal_lines | 36 | Journal entry line items |
| journal_entries | 17 | Accounting journal entries |
| bank_transactions | 0 | Bank transaction records |
| account_balances | 0 | Period account balances |
| **Settlements** | | |
| settlement_items | 0 | Settlement line items |
| settlements | 0 | Agent settlements |
| commissions | 0 | Employee commissions |
| **Payroll** | | |
| payroll_items | 0 | Payroll line items |
| payroll_runs | 1 | Payroll runs |
| salary_advances | 1 | Salary advances |
| **Orders** | | |
| order_items | 7 | Shop for me order items |
| order_requests | 7 | Shop for me orders |
| **Other** | | |
| approval_requests | 1 | Pending approvals |
| notifications | 3 | User notifications |
| audit_logs | 30 | System audit logs |
| teaser_conversion_events | 36 | Website analytics |
| contact_submissions | 1 | Contact form submissions |

## Bank Account Balances to Reset

| Account | Current Balance | Reset To |
|---------|-----------------|----------|
| Exim Bank | 3,212.40 | 0 |
| M-Pesa | 6,674.40 | 0 |
| Airtel Money | 0 | 0 |

## Document Counters to Reset

| Counter | Current Value | Reset To |
|---------|---------------|----------|
| invoice | 20 | 0 |
| estimate | 0 | 0 |
| journal | 79 | 0 |
| batch | 0 | 0 |
| payroll | 1 | 0 |
| settlement | 0 | 0 |
| tracking | 0 | 0 |

**Keep unchanged:**
- customer: 14
- agent: 2
- employee: 1

---

## Deletion Order (Critical for Foreign Keys)

Must delete in correct order to respect foreign key constraints:

```text
Phase 1: Deepest child records
├── invoice_items (depends on invoices)
├── payments (depends on invoices)
├── journal_lines (depends on journal_entries)
├── settlement_items (depends on settlements)
├── payroll_items (depends on payroll_runs)
├── order_items (depends on order_requests)
├── shipment_cost_allocations (depends on shipments, batch_costs)
└── batch_costs (depends on cargo_batches)

Phase 2: Parent records
├── invoices (depends on estimates, shipments)
├── estimates (depends on shipments)
├── journal_entries
├── settlements
├── commissions
├── parcels (depends on shipments)
├── bank_transactions
├── account_balances
├── payroll_runs
├── salary_advances
├── approval_requests
├── notifications
├── order_requests
└── audit_logs

Phase 3: Top-level records
├── shipments (depends on cargo_batches)
└── cargo_batches

Phase 4: Reset counters & balances
├── bank_accounts (reset current_balance to opening_balance)
└── document_counters (reset counter_value for transactions)
```

---

## Data Preserved (Not Deleted)

| Category | Tables |
|----------|--------|
| **Master Data** | customers, profiles, user_roles |
| **Agents** | agent_regions, agent_settings (but agent invoices deleted) |
| **Employees** | employee_salaries, employee_badges, employee_milestones, employee_permissions, commission_rules |
| **Configuration** | regions, region_pricing, region_delivery_times, transit_routes |
| **Pricing** | container_pricing, vehicle_pricing, vehicle_duty_rates |
| **Products** | products_services, service_types, expense_categories |
| **Settings** | settings, page_content, chart_of_accounts, fiscal_periods, tax_rates |
| **Calculator** | shipping_calculator_charges, shop_for_me_charges, shop_for_me_product_rates, shop_for_me_vehicle_rates |
| **Bank Accounts** | bank_accounts (structure preserved, balance reset) |

---

## Technical Implementation

### SQL Migration Script

```sql
-- Phase 1: Delete deepest child records
DELETE FROM invoice_items;
DELETE FROM payments;
DELETE FROM journal_lines;
DELETE FROM settlement_items;
DELETE FROM payroll_items;
DELETE FROM order_items;
DELETE FROM shipment_cost_allocations;
DELETE FROM batch_costs;

-- Phase 2: Delete parent records
DELETE FROM invoices;
DELETE FROM estimates;
DELETE FROM journal_entries;
DELETE FROM settlements;
DELETE FROM commissions;
DELETE FROM parcels;
DELETE FROM bank_transactions;
DELETE FROM account_balances;
DELETE FROM payroll_runs;
DELETE FROM salary_advances;
DELETE FROM approval_requests;
DELETE FROM notifications;
DELETE FROM order_requests;
DELETE FROM audit_logs;
DELETE FROM teaser_conversion_events;
DELETE FROM contact_submissions;
DELETE FROM expenses;

-- Phase 3: Delete top-level shipping records
DELETE FROM shipments;
DELETE FROM cargo_batches;

-- Phase 4: Reset bank account balances
UPDATE bank_accounts SET current_balance = opening_balance;

-- Phase 5: Reset document counters (keep customer/agent/employee)
UPDATE document_counters 
SET counter_value = 0 
WHERE counter_key IN ('invoice', 'estimate', 'journal', 'batch', 'payroll', 'settlement', 'tracking');
```

---

## Summary of Changes

| Action | Count |
|--------|-------|
| Tables cleared | 26 |
| Bank balances reset | 3 |
| Document counters reset | 7 |
| **Master data preserved** | ✅ Customers, Agents, Employees |
| **Configuration preserved** | ✅ Regions, Pricing, Products, Settings |

After execution, the system will be ready for fresh testing with all master data intact.
