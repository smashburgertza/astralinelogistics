// Billing Party utilities for the new simplified ownership model

export type BillingPartyType = 'customer_direct' | 'agent_collect' | 'astraline_internal';

export const BILLING_PARTIES = {
  customer_direct: {
    label: 'Customer Direct',
    description: 'Customer pays Astraline directly. Agent receives commission.',
    invoiceFlow: 'Astraline → Customer',
    color: 'bg-blue-100 text-blue-800',
  },
  agent_collect: {
    label: 'Agent Collect',
    description: 'Agent collects payment from customer. Agent settles with Astraline.',
    invoiceFlow: 'Agent → Customer, then Agent → Astraline',
    color: 'bg-amber-100 text-amber-800',
  },
  astraline_internal: {
    label: 'Astraline Internal',
    description: 'Internal shipment. No customer billing.',
    invoiceFlow: 'Internal cost tracking only',
    color: 'bg-gray-100 text-gray-800',
  },
} as const;

/**
 * Determines if a settlement is required for this billing party type
 */
export function requiresSettlement(billingParty: BillingPartyType): boolean {
  return billingParty === 'agent_collect';
}

/**
 * Determines who the invoice should be issued to
 */
export function getInvoiceRecipient(billingParty: BillingPartyType): 'customer' | 'agent' | 'internal' {
  switch (billingParty) {
    case 'customer_direct':
      return 'customer';
    case 'agent_collect':
      return 'agent';
    case 'astraline_internal':
      return 'internal';
  }
}

/**
 * Determines who pays whom based on billing party
 */
export function getPaymentDirection(billingParty: BillingPartyType): {
  payer: string;
  payee: string;
} | null {
  switch (billingParty) {
    case 'customer_direct':
      return { payer: 'Customer', payee: 'Astraline' };
    case 'agent_collect':
      return { payer: 'Customer → Agent', payee: 'Agent → Astraline' };
    case 'astraline_internal':
      return null;
  }
}

/**
 * Convert old shipment_owner + invoice_direction to new billing_party
 * Used for migration/compatibility
 */
export function convertToBillingParty(
  shipmentOwner: 'astraline' | 'agent' | null,
  invoiceDirection: 'from_agent' | 'to_agent' | null
): BillingPartyType {
  if (shipmentOwner === 'agent') {
    return 'agent_collect';
  }
  if (shipmentOwner === 'astraline' && invoiceDirection === 'to_agent') {
    return 'customer_direct';
  }
  return 'customer_direct';
}
