// Agent-related hooks
// Using explicit exports to avoid naming conflicts

export {
  useAgents,
  useCreateAgent,
  useUpdateAgentRegions,
  useUpdateAgentRegion,
  useDeleteAgent,
  useAgentSettings,
  useUpdateAgentSettings,
} from '../useAgents';

export { useAgentAssignedRegions } from '../useAgentRegions';

export { useAgentBalance, useAllAgentBalances } from '../useAgentBalance';

export {
  useAgentShipments,
  useAgentDraftShipments,
  useAgentShipmentStats,
  useFinalizeDraftShipment,
  useDeleteDraftShipment,
  useUpdateDraftShipment,
  useUpdateAgentShipment,
} from '../useAgentShipments';

export {
  useAgentInvoicesToMe,
  useAgentMarkInvoicePaid,
  usePaymentsPendingVerification,
  useVerifyPayment,
  type AgentInvoice,
  type AgentPayment,
} from '../useAgentInvoices';
