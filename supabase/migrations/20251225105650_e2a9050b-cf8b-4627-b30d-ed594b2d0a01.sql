-- Chart of Accounts - Double-entry bookkeeping foundation
CREATE TABLE public.chart_of_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code text NOT NULL UNIQUE,
    account_name text NOT NULL,
    account_type text NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    account_subtype text, -- e.g., 'cash', 'accounts_receivable', 'accounts_payable', 'sales_revenue', 'cost_of_goods'
    parent_id uuid REFERENCES public.chart_of_accounts(id),
    description text,
    is_active boolean DEFAULT true,
    normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    currency text DEFAULT 'TZS',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Journal Entries - Core of double-entry bookkeeping
CREATE TABLE public.journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number text NOT NULL UNIQUE,
    entry_date date NOT NULL DEFAULT CURRENT_DATE,
    description text NOT NULL,
    reference_type text, -- 'invoice', 'payment', 'expense', 'adjustment', 'opening_balance'
    reference_id uuid, -- Links to invoices, payments, expenses, etc.
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
    posted_at timestamptz,
    posted_by uuid,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    notes text
);

-- Journal Lines - Individual debit/credit entries
CREATE TABLE public.journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),
    description text,
    debit_amount numeric DEFAULT 0,
    credit_amount numeric DEFAULT 0,
    currency text DEFAULT 'TZS',
    exchange_rate numeric DEFAULT 1,
    amount_in_tzs numeric, -- Converted amount
    created_at timestamptz DEFAULT now(),
    CONSTRAINT debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0) OR
        (debit_amount = 0 AND credit_amount = 0)
    )
);

-- Fiscal Periods for reporting
CREATE TABLE public.fiscal_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period_name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    fiscal_year integer NOT NULL,
    period_number integer NOT NULL, -- 1-12 for months, 1-4 for quarters
    period_type text DEFAULT 'month' CHECK (period_type IN ('month', 'quarter', 'year')),
    status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
    closed_at timestamptz,
    closed_by uuid,
    created_at timestamptz DEFAULT now()
);

-- Account Balances (running balances for performance)
CREATE TABLE public.account_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),
    fiscal_period_id uuid REFERENCES public.fiscal_periods(id),
    opening_balance numeric DEFAULT 0,
    total_debits numeric DEFAULT 0,
    total_credits numeric DEFAULT 0,
    closing_balance numeric DEFAULT 0,
    currency text DEFAULT 'TZS',
    updated_at timestamptz DEFAULT now(),
    UNIQUE (account_id, fiscal_period_id)
);

-- Tax Rates for tax reporting
CREATE TABLE public.tax_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_name text NOT NULL,
    tax_code text NOT NULL UNIQUE,
    rate numeric NOT NULL, -- as percentage, e.g., 18 for 18%
    tax_type text DEFAULT 'vat' CHECK (tax_type IN ('vat', 'withholding', 'excise', 'other')),
    account_id uuid REFERENCES public.chart_of_accounts(id), -- Tax liability account
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Bank Accounts for reconciliation
CREATE TABLE public.bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name text NOT NULL,
    bank_name text NOT NULL,
    account_number text,
    currency text DEFAULT 'TZS',
    chart_account_id uuid REFERENCES public.chart_of_accounts(id), -- Links to chart of accounts
    opening_balance numeric DEFAULT 0,
    current_balance numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Bank Transactions for reconciliation
CREATE TABLE public.bank_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
    transaction_date date NOT NULL,
    description text,
    reference text,
    debit_amount numeric DEFAULT 0,
    credit_amount numeric DEFAULT 0,
    balance numeric,
    is_reconciled boolean DEFAULT false,
    reconciled_at timestamptz,
    journal_entry_id uuid REFERENCES public.journal_entries(id),
    created_at timestamptz DEFAULT now()
);

-- Generate journal entry number function
CREATE OR REPLACE FUNCTION public.generate_journal_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'JE-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins/employees can manage accounting
CREATE POLICY "Admins can manage chart of accounts" ON public.chart_of_accounts
    FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Admins can manage journal entries" ON public.journal_entries
    FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Admins can manage journal lines" ON public.journal_lines
    FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Admins can manage fiscal periods" ON public.fiscal_periods
    FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Admins can manage account balances" ON public.account_balances
    FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Admins can manage tax rates" ON public.tax_rates
    FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Admins can manage bank accounts" ON public.bank_accounts
    FOR ALL USING (is_admin_or_employee(auth.uid()));

CREATE POLICY "Admins can manage bank transactions" ON public.bank_transactions
    FOR ALL USING (is_admin_or_employee(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at
    BEFORE UPDATE ON public.chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default chart of accounts for a logistics company
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, description) VALUES
-- Assets
('1000', 'Assets', 'asset', 'header', 'debit', 'All asset accounts'),
('1100', 'Cash and Bank', 'asset', 'cash', 'debit', 'Cash and bank accounts'),
('1110', 'Petty Cash', 'asset', 'cash', 'debit', 'Petty cash on hand'),
('1120', 'Bank Account - TZS', 'asset', 'cash', 'debit', 'Main TZS bank account'),
('1130', 'Bank Account - USD', 'asset', 'cash', 'debit', 'USD bank account'),
('1140', 'Bank Account - GBP', 'asset', 'cash', 'debit', 'GBP bank account'),
('1200', 'Accounts Receivable', 'asset', 'accounts_receivable', 'debit', 'Customer receivables'),
('1210', 'Trade Receivables', 'asset', 'accounts_receivable', 'debit', 'Outstanding customer invoices'),
('1300', 'Prepaid Expenses', 'asset', 'prepaid', 'debit', 'Prepaid expenses'),

-- Liabilities
('2000', 'Liabilities', 'liability', 'header', 'credit', 'All liability accounts'),
('2100', 'Accounts Payable', 'liability', 'accounts_payable', 'credit', 'Vendor payables'),
('2110', 'Trade Payables', 'liability', 'accounts_payable', 'credit', 'Outstanding vendor bills'),
('2120', 'Agent Payables', 'liability', 'accounts_payable', 'credit', 'Amounts owed to shipping agents'),
('2200', 'Tax Liabilities', 'liability', 'tax', 'credit', 'Tax obligations'),
('2210', 'VAT Payable', 'liability', 'tax', 'credit', 'VAT collected to be paid'),
('2220', 'Withholding Tax Payable', 'liability', 'tax', 'credit', 'Withholding tax to be remitted'),
('2300', 'Accrued Expenses', 'liability', 'accrued', 'credit', 'Accrued but unpaid expenses'),

-- Equity
('3000', 'Equity', 'equity', 'header', 'credit', 'Owner equity accounts'),
('3100', 'Share Capital', 'equity', 'capital', 'credit', 'Contributed capital'),
('3200', 'Retained Earnings', 'equity', 'retained_earnings', 'credit', 'Accumulated profits'),
('3300', 'Current Year Earnings', 'equity', 'current_earnings', 'credit', 'Profit/loss for current year'),

-- Revenue
('4000', 'Revenue', 'revenue', 'header', 'credit', 'All revenue accounts'),
('4100', 'Shipping Revenue', 'revenue', 'operating', 'credit', 'Income from shipping services'),
('4110', 'Air Freight Revenue', 'revenue', 'operating', 'credit', 'Air cargo shipping income'),
('4120', 'Handling Fee Revenue', 'revenue', 'operating', 'credit', 'Handling and service fees'),
('4200', 'Other Income', 'revenue', 'other', 'credit', 'Miscellaneous income'),
('4210', 'Foreign Exchange Gain', 'revenue', 'other', 'credit', 'Gains from currency exchange'),

-- Expenses
('5000', 'Cost of Services', 'expense', 'header', 'debit', 'Direct costs'),
('5100', 'Agent Costs', 'expense', 'cost_of_goods', 'debit', 'Payments to shipping agents'),
('5110', 'Europe Agent Costs', 'expense', 'cost_of_goods', 'debit', 'European agent payments'),
('5120', 'Dubai Agent Costs', 'expense', 'cost_of_goods', 'debit', 'Dubai agent payments'),
('5130', 'China Agent Costs', 'expense', 'cost_of_goods', 'debit', 'China agent payments'),
('5140', 'India Agent Costs', 'expense', 'cost_of_goods', 'debit', 'India agent payments'),
('5150', 'USA Agent Costs', 'expense', 'cost_of_goods', 'debit', 'USA agent payments'),
('5160', 'UK Agent Costs', 'expense', 'cost_of_goods', 'debit', 'UK agent payments'),
('5200', 'Freight Costs', 'expense', 'cost_of_goods', 'debit', 'Direct freight and shipping costs'),
('5300', 'Customs and Duties', 'expense', 'cost_of_goods', 'debit', 'Import duties and customs fees'),

('6000', 'Operating Expenses', 'expense', 'header', 'debit', 'Operating expenses'),
('6100', 'Salaries and Wages', 'expense', 'operating', 'debit', 'Employee salaries'),
('6110', 'Employee Salaries', 'expense', 'operating', 'debit', 'Regular employee wages'),
('6120', 'Commissions', 'expense', 'operating', 'debit', 'Sales commissions paid'),
('6200', 'Rent and Utilities', 'expense', 'operating', 'debit', 'Office and warehouse rent'),
('6210', 'Office Rent', 'expense', 'operating', 'debit', 'Office space rental'),
('6220', 'Warehouse Rent', 'expense', 'operating', 'debit', 'Warehouse rental'),
('6230', 'Utilities', 'expense', 'operating', 'debit', 'Electricity, water, etc.'),
('6300', 'Transportation', 'expense', 'operating', 'debit', 'Local transportation costs'),
('6400', 'Office Expenses', 'expense', 'operating', 'debit', 'Office supplies and expenses'),
('6500', 'Professional Fees', 'expense', 'operating', 'debit', 'Legal, accounting, consulting'),
('6600', 'Insurance', 'expense', 'operating', 'debit', 'Business insurance'),
('6700', 'Depreciation', 'expense', 'operating', 'debit', 'Asset depreciation'),
('6800', 'Foreign Exchange Loss', 'expense', 'other', 'debit', 'Losses from currency exchange'),
('6900', 'Other Expenses', 'expense', 'other', 'debit', 'Miscellaneous expenses');