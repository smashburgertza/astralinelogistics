import { AgentLayout } from '@/components/layout/AgentLayout';
import { ShipmentUploadForm } from '@/components/agent/ShipmentUploadForm';

export default function AgentUploadPage() {
  return (
    <AgentLayout 
      title="Upload Shipment" 
      subtitle="Add a new shipment to the system with automatic cost calculation"
    >
      <ShipmentUploadForm />
    </AgentLayout>
  );
}
