-- Delete all transactional data (child tables first, respecting foreign keys)

-- 1. Delete invoice-related child tables
DELETE FROM invoice_items;
DELETE FROM payments;
DELETE FROM commissions;

-- 2. Delete approval requests
DELETE FROM approval_requests;

-- 3. Delete shipment-related tables
DELETE FROM parcels;
DELETE FROM shipment_cost_allocations;

-- 4. Delete batch-related tables
DELETE FROM batch_costs;

-- 5. Delete settlement-related tables
DELETE FROM settlement_items;
DELETE FROM settlements;

-- 6. Delete payroll-related tables
DELETE FROM payroll_items;
DELETE FROM payroll_runs;
DELETE FROM salary_advances;

-- 7. Delete order-related tables
DELETE FROM order_items;
DELETE FROM order_requests;

-- 8. Delete legacy journal entries
DELETE FROM journal_lines;
DELETE FROM journal_entries;
DELETE FROM account_balances;

-- 9. Delete parent tables
DELETE FROM invoices;
DELETE FROM estimates;
DELETE FROM expenses;
DELETE FROM shipments;
DELETE FROM cargo_batches;

-- 10. Delete other transactional data
DELETE FROM notifications;
DELETE FROM audit_logs;
DELETE FROM employee_badges;
DELETE FROM employee_milestones;
DELETE FROM teaser_conversion_events;
DELETE FROM contact_submissions;
DELETE FROM bank_transactions;

-- 11. Reset bank account balances to 0
UPDATE bank_accounts SET current_balance = 0;

-- 12. Reset document counters (keep customer/employee/agent counters)
UPDATE document_counters 
SET counter_value = 0 
WHERE counter_key NOT IN ('customer', 'employee', 'agent');