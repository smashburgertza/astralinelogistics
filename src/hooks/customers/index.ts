// Customer-related hooks
// Using explicit exports to avoid naming conflicts

export {
  useCustomersList,
  useCustomer,
  useCustomerShipments,
  useCustomerInvoices,
  useCreateCustomer,
  useCreateCustomerWithAuth,
  useBulkCreateCustomers,
  useUpdateCustomer,
  useDeleteCustomer,
  type Customer,
} from '../useCustomers';

export {
  useCustomerOrders,
  type OrderRequest,
  type OrderItem,
} from '../useCustomerOrders';

export { useCustomerEstimates } from '../useCustomerEstimates';

export {
  useCustomerProfile,
  useCustomerShipments as useCustomerPortalShipments,
  useCustomerInvoices as useCustomerPortalInvoices,
  useCustomerStats,
  type CustomerShipment,
  type CustomerInvoice,
} from '../useCustomerPortal';

export { useCustomerPayments, useCustomerMarkInvoicePaid } from '../useCustomerPayments';
