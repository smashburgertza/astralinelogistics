import { supabase } from '@/integrations/supabase/client';

// Account code mappings for automatic journal entries
const ACCOUNT_CODES = {
  // Assets
  CASH_TZS: '1120',
  CASH_USD: '1130',
  CASH_GBP: '1140',
  ACCOUNTS_RECEIVABLE: '1210',
  
  // Liabilities
  ACCOUNTS_PAYABLE: '2110',
  AGENT_PAYABLES: '2120',
  
  // Revenue
  SHIPPING_REVENUE: '4110',
  HANDLING_FEE_REVENUE: '4120',
  
  // Expenses by category
  EXPENSES: {
    shipping: '5200',
    handling: '5200',
    customs: '5300',
    insurance: '6600',
    packaging: '6400',
    storage: '6200',
    fuel: '5200',
    other: '6900',
  } as Record<string, string>,
};

interface JournalLineInput {
  account_code: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  currency: string;
  exchange_rate: number;
}

interface JournalLineMixedInput {
  account_id?: string;
  account_code?: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  currency: string;
  exchange_rate: number;
}

async function getAccountByCode(code: string) {
  const { data } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('account_code', code)
    .maybeSingle();
  return data?.id;
}

// Version that supports mixed account_id and account_code lines
async function createJournalEntryWithAccountIds({
  description,
  referenceType,
  referenceId,
  lines,
  autoPost = false,
}: {
  description: string;
  referenceType: 'invoice' | 'payment' | 'expense' | 'adjustment';
  referenceId: string;
  lines: JournalLineMixedInput[];
  autoPost?: boolean;
}) {
  try {
    const { data: entryNumber, error: numError } = await supabase.rpc('generate_journal_number');
    if (numError) throw numError;

    const { data: userData } = await supabase.auth.getUser();

    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        description,
        reference_type: referenceType,
        reference_id: referenceId,
        status: autoPost ? 'posted' : 'draft',
        posted_at: autoPost ? new Date().toISOString() : null,
        posted_by: autoPost ? userData.user?.id : null,
        created_by: userData.user?.id,
      })
      .select()
      .single();

    if (entryError) throw entryError;

    const journalLines = await Promise.all(
      lines.map(async (line) => {
        // Use account_id directly if provided, otherwise resolve from account_code
        const accountId = line.account_id || (line.account_code ? await getAccountByCode(line.account_code) : null);
        if (!accountId) {
          console.warn(`Account not found for: ${line.account_id || line.account_code}`);
          return null;
        }
        
        const amountInTzs = (line.debit_amount || line.credit_amount) * line.exchange_rate;
        
        return {
          journal_entry_id: journalEntry.id,
          account_id: accountId,
          description: line.description,
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          currency: line.currency,
          exchange_rate: line.exchange_rate,
          amount_in_tzs: amountInTzs,
        };
      })
    );

    const validLines = journalLines.filter(Boolean);

    if (validLines.length > 0) {
      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(validLines);

      if (linesError) throw linesError;
    }

    return journalEntry;
  } catch (error) {
    console.error('Failed to create journal entry:', error);
    throw error;
  }
}

export async function createJournalEntry({
  description,
  referenceType,
  referenceId,
  lines,
  autoPost = false,
}: {
  description: string;
  referenceType: 'invoice' | 'payment' | 'expense' | 'adjustment';
  referenceId: string;
  lines: JournalLineInput[];
  autoPost?: boolean;
}) {
  try {
    // Generate entry number
    const { data: entryNumber, error: numError } = await supabase.rpc('generate_journal_number');
    if (numError) throw numError;

    // Get current user
    const { data: userData } = await supabase.auth.getUser();

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        description,
        reference_type: referenceType,
        reference_id: referenceId,
        status: autoPost ? 'posted' : 'draft',
        posted_at: autoPost ? new Date().toISOString() : null,
        posted_by: autoPost ? userData.user?.id : null,
        created_by: userData.user?.id,
      })
      .select()
      .single();

    if (entryError) throw entryError;

    // Resolve account IDs and create lines
    const journalLines = await Promise.all(
      lines.map(async (line) => {
        const accountId = await getAccountByCode(line.account_code);
        if (!accountId) {
          console.warn(`Account not found for code: ${line.account_code}`);
          return null;
        }
        
        const amountInTzs = (line.debit_amount || line.credit_amount) * line.exchange_rate;
        
        return {
          journal_entry_id: journalEntry.id,
          account_id: accountId,
          description: line.description,
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          currency: line.currency,
          exchange_rate: line.exchange_rate,
          amount_in_tzs: amountInTzs,
        };
      })
    );

    // Filter out null entries (accounts not found)
    const validLines = journalLines.filter(Boolean);

    if (validLines.length > 0) {
      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(validLines);

      if (linesError) throw linesError;
    }

    return journalEntry;
  } catch (error) {
    console.error('Failed to create journal entry:', error);
    throw error;
  }
}

export async function createInvoicePaymentJournalEntry({
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  exchangeRate = 1,
  paymentCurrency,
  depositAccountId,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  paymentCurrency?: string;
  depositAccountId?: string;
}) {
  const effectiveCurrency = paymentCurrency || currency;
  const effectiveRate = paymentCurrency === 'TZS' ? 1 : exchangeRate;

  // If a specific deposit account was selected, use it directly
  if (depositAccountId) {
    return createJournalEntryWithAccountIds({
      description: `Payment received for Invoice ${invoiceNumber}`,
      referenceType: 'payment',
      referenceId: invoiceId,
      autoPost: true,
      lines: [
        {
          account_id: depositAccountId,
          description: `Cash received - Invoice ${invoiceNumber}`,
          debit_amount: amount,
          credit_amount: 0,
          currency: effectiveCurrency,
          exchange_rate: effectiveRate,
        },
        {
          account_code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
          description: `Clear AR - Invoice ${invoiceNumber}`,
          debit_amount: 0,
          credit_amount: amount,
          currency: effectiveCurrency,
          exchange_rate: effectiveRate,
        },
      ],
    });
  }

  // Fallback: Determine which cash account to use based on payment currency
  let cashAccountCode = ACCOUNT_CODES.CASH_TZS;
  if (paymentCurrency === 'USD' || (currency === 'USD' && !paymentCurrency)) {
    cashAccountCode = ACCOUNT_CODES.CASH_USD;
  } else if (paymentCurrency === 'GBP' || (currency === 'GBP' && !paymentCurrency)) {
    cashAccountCode = ACCOUNT_CODES.CASH_GBP;
  }

  return createJournalEntry({
    description: `Payment received for Invoice ${invoiceNumber}`,
    referenceType: 'payment',
    referenceId: invoiceId,
    autoPost: true,
    lines: [
      {
        account_code: cashAccountCode,
        description: `Cash received - Invoice ${invoiceNumber}`,
        debit_amount: amount,
        credit_amount: 0,
        currency: effectiveCurrency,
        exchange_rate: effectiveRate,
      },
      {
        account_code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        description: `Clear AR - Invoice ${invoiceNumber}`,
        debit_amount: 0,
        credit_amount: amount,
        currency: effectiveCurrency,
        exchange_rate: effectiveRate,
      },
    ],
  });
}

export async function createExpenseApprovalJournalEntry({
  expenseId,
  category,
  amount,
  currency,
  description,
  exchangeRate = 1,
}: {
  expenseId: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  exchangeRate?: number;
}) {
  const expenseAccountCode = ACCOUNT_CODES.EXPENSES[category] || ACCOUNT_CODES.EXPENSES.other;

  return createJournalEntry({
    description: `Expense approved: ${description || category}`,
    referenceType: 'expense',
    referenceId: expenseId,
    autoPost: true,
    lines: [
      {
        account_code: expenseAccountCode,
        description: description || `${category} expense`,
        debit_amount: amount,
        credit_amount: 0,
        currency,
        exchange_rate: exchangeRate,
      },
      {
        account_code: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
        description: `Payable for expense: ${description || category}`,
        debit_amount: 0,
        credit_amount: amount,
        currency,
        exchange_rate: exchangeRate,
      },
    ],
  });
}

/**
 * Create journal entry when expense is approved and paid from a bank account
 * This directly debits expense and credits the bank account (no AP involved)
 * Accounting: Debit Expense Account, Credit Bank Account
 */
export async function createExpensePaymentJournalEntry({
  expenseId,
  category,
  amount,
  currency,
  description,
  exchangeRate = 1,
  bankAccountChartId,
}: {
  expenseId: string;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  exchangeRate?: number;
  bankAccountChartId: string;
}) {
  const expenseAccountCode = ACCOUNT_CODES.EXPENSES[category] || ACCOUNT_CODES.EXPENSES.other;

  return createJournalEntryWithAccountIds({
    description: `Expense paid: ${description || category}`,
    referenceType: 'expense',
    referenceId: expenseId,
    autoPost: true,
    lines: [
      {
        account_code: expenseAccountCode,
        description: description || `${category} expense`,
        debit_amount: amount,
        credit_amount: 0,
        currency,
        exchange_rate: exchangeRate,
      },
      {
        account_id: bankAccountChartId,
        description: `Paid from bank - ${description || category}`,
        debit_amount: 0,
        credit_amount: amount,
        currency,
        exchange_rate: exchangeRate,
      },
    ],
  });
}

export async function createInvoiceJournalEntry({
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  exchangeRate = 1,
  customerName,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  customerName?: string;
}) {
  return createJournalEntry({
    description: `Invoice ${invoiceNumber} issued${customerName ? ` to ${customerName}` : ''}`,
    referenceType: 'invoice',
    referenceId: invoiceId,
    autoPost: true,
    lines: [
      {
        account_code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        description: `AR - Invoice ${invoiceNumber}`,
        debit_amount: amount,
        credit_amount: 0,
        currency,
        exchange_rate: exchangeRate,
      },
      {
        account_code: ACCOUNT_CODES.SHIPPING_REVENUE,
        description: `Revenue - Invoice ${invoiceNumber}`,
        debit_amount: 0,
        credit_amount: amount,
        currency,
        exchange_rate: exchangeRate,
      },
    ],
  });
}

/**
 * Create journal entry when agent submits an invoice to us (from_agent)
 * This creates a liability (we owe the agent) and an expense
 * Accounting: Debit Agent Costs (expense), Credit Agent Payables (liability)
 */
export async function createAgentInvoiceJournalEntry({
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  exchangeRate = 1,
  agentName,
  originRegion,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  agentName?: string;
  originRegion?: string;
}) {
  // Map region to expense account code
  const regionExpenseMap: Record<string, string> = {
    europe: '5110',
    dubai: '5120',
    china: '5130',
    india: '5140',
    usa: '5150',
    uk: '5160',
  };
  
  const expenseAccountCode = originRegion ? (regionExpenseMap[originRegion.toLowerCase()] || '5100') : '5100';

  return createJournalEntry({
    description: `Agent invoice ${invoiceNumber}${agentName ? ` from ${agentName}` : ''}`,
    referenceType: 'invoice',
    referenceId: invoiceId,
    autoPost: true,
    lines: [
      {
        account_code: expenseAccountCode,
        description: `Agent cost - Invoice ${invoiceNumber}`,
        debit_amount: amount,
        credit_amount: 0,
        currency,
        exchange_rate: exchangeRate,
      },
      {
        account_code: ACCOUNT_CODES.AGENT_PAYABLES,
        description: `Payable to agent - Invoice ${invoiceNumber}`,
        debit_amount: 0,
        credit_amount: amount,
        currency,
        exchange_rate: exchangeRate,
      },
    ],
  });
}

/**
 * Create journal entry for paying an agent (B2B payment where we owe the agent)
 * This is for invoices with invoice_direction = 'from_agent'
 * Accounting: Debit Agent Payables (clearing liability), Credit Cash (money going out)
 */
export async function createAgentPaymentJournalEntry({
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  exchangeRate = 1,
  paymentCurrency,
  sourceAccountId,
  amountInTzs,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  paymentCurrency?: string;
  sourceAccountId?: string;
  amountInTzs?: number;
}) {
  const effectiveCurrency = paymentCurrency || currency;
  // Use the provided exchange rate or calculate from amountInTzs
  const effectiveRate = amountInTzs && amount ? (amountInTzs / amount) : (effectiveCurrency === 'TZS' ? 1 : exchangeRate);

  // If a specific source account was selected, use it directly
  if (sourceAccountId) {
    return createJournalEntryWithAccountIds({
      description: `Payment to agent for Invoice ${invoiceNumber}`,
      referenceType: 'payment',
      referenceId: invoiceId,
      autoPost: true,
      lines: [
        {
          account_code: ACCOUNT_CODES.AGENT_PAYABLES,
          description: `Clear agent payable - Invoice ${invoiceNumber}`,
          debit_amount: amount,
          credit_amount: 0,
          currency: effectiveCurrency,
          exchange_rate: effectiveRate,
        },
        {
          account_id: sourceAccountId,
          description: `Payment to agent - Invoice ${invoiceNumber}`,
          debit_amount: 0,
          credit_amount: amount,
          currency: effectiveCurrency,
          exchange_rate: effectiveRate,
        },
      ],
    });
  }

  // Fallback: Determine which cash account to use based on payment currency
  let cashAccountCode = ACCOUNT_CODES.CASH_TZS;
  if (paymentCurrency === 'USD' || (currency === 'USD' && !paymentCurrency)) {
    cashAccountCode = ACCOUNT_CODES.CASH_USD;
  } else if (paymentCurrency === 'GBP' || (currency === 'GBP' && !paymentCurrency)) {
    cashAccountCode = ACCOUNT_CODES.CASH_GBP;
  }

  return createJournalEntry({
    description: `Payment to agent for Invoice ${invoiceNumber}`,
    referenceType: 'payment',
    referenceId: invoiceId,
    autoPost: true,
    lines: [
      {
        account_code: ACCOUNT_CODES.AGENT_PAYABLES,
        description: `Clear agent payable - Invoice ${invoiceNumber}`,
        debit_amount: amount,
        credit_amount: 0,
        currency: effectiveCurrency,
        exchange_rate: effectiveRate,
      },
      {
        account_code: cashAccountCode,
        description: `Payment to agent - Invoice ${invoiceNumber}`,
        debit_amount: 0,
        credit_amount: amount,
        currency: effectiveCurrency,
        exchange_rate: effectiveRate,
      },
    ],
  });
}

/**
 * Create journal entry when Astraline bills an agent (to_agent)
 * This creates a receivable (agent owes us) and revenue
 * Accounting: Debit Agent Receivables (or AR), Credit Service Revenue
 */
export async function createAgentBillingJournalEntry({
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  exchangeRate = 1,
  agentName,
}: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  agentName?: string;
}) {
  return createJournalEntry({
    description: `Agent invoice ${invoiceNumber}${agentName ? ` to ${agentName}` : ''} (clearing services)`,
    referenceType: 'invoice',
    referenceId: invoiceId,
    autoPost: true,
    lines: [
      {
        account_code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        description: `Receivable from agent - Invoice ${invoiceNumber}`,
        debit_amount: amount,
        credit_amount: 0,
        currency,
        exchange_rate: exchangeRate,
      },
      {
        account_code: ACCOUNT_CODES.SHIPPING_REVENUE,
        description: `Clearing service revenue - Invoice ${invoiceNumber}`,
        debit_amount: 0,
        credit_amount: amount,
        currency,
        exchange_rate: exchangeRate,
      },
    ],
  });
}
