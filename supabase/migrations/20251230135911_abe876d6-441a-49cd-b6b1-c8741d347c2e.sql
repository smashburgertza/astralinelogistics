-- Create dedicated chart of accounts entries for each bank account
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, parent_id, currency, is_active, description)
VALUES 
  ('1101', 'M-Pesa', 'asset', 'bank', 'debit', '469a04ad-2a03-40f7-bd52-0ccd2137159b', 'TZS', true, 'M-Pesa mobile money account'),
  ('1102', 'Exim Bank', 'asset', 'bank', 'debit', '469a04ad-2a03-40f7-bd52-0ccd2137159b', 'TZS', true, 'Exim Bank main account');

-- Update bank_accounts to use the new dedicated chart accounts
UPDATE public.bank_accounts 
SET chart_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '1101')
WHERE account_name = 'M-Pesa';

UPDATE public.bank_accounts 
SET chart_account_id = (SELECT id FROM public.chart_of_accounts WHERE account_code = '1102')
WHERE account_name = 'Exim Bank';