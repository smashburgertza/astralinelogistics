import { useSearchParams } from 'react-router-dom';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { ShipmentUploadForm } from '@/components/agent/ShipmentUploadForm';

export default function AgentUploadPage() {
  const [searchParams] = useSearchParams();
  const isDraft = searchParams.has('draft');
  
  return (
    <AgentLayout 
      title={isDraft ? "Continue Draft" : "Upload Shipment"}
      subtitle={isDraft ? "Complete and finalize your draft shipment" : "Add a new shipment to the system with automatic cost calculation"}
    >
      <ShipmentUploadForm />
    </AgentLayout>
  );
}
