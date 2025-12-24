import { useMemo, useState } from 'react';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { StatCard } from '@/components/admin/StatCard';
import { AgentShipmentFilters } from '@/components/agent/ShipmentFilters';
import { AgentShipmentTable } from '@/components/agent/ShipmentTable';
import { Button } from '@/components/ui/button';
import { useAgentShipments, useAgentShipmentStats } from '@/hooks/useAgentShipments';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';
import { REGIONS } from '@/lib/constants';
import { Package, Plane, MapPin, CheckCircle, Upload, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AgentShipmentsPage() {
  const { getRegion } = useAuth();
  const region = getRegion();
  const regionInfo = region ? REGIONS[region] : null;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  
  const debouncedSearch = useDebounce(search, 300);
  
  const filters = useMemo(() => ({
    status,
    search: debouncedSearch,
  }), [status, debouncedSearch]);

  const { data: shipments, isLoading } = useAgentShipments(filters);
  const { data: stats } = useAgentShipmentStats();

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
  };

  return (
    <AgentLayout 
      title="My Shipments" 
      subtitle={regionInfo ? `Shipments from ${regionInfo.label}` : 'View all your uploaded shipments'}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Total"
          value={stats?.total ?? 0}
          icon={Package}
          variant="default"
        />
        <StatCard
          title="Collected"
          value={stats?.collected ?? 0}
          icon={Package}
          variant="warning"
        />
        <StatCard
          title="In Transit"
          value={stats?.inTransit ?? 0}
          icon={Plane}
          variant="primary"
        />
        <StatCard
          title="Arrived"
          value={stats?.arrived ?? 0}
          icon={MapPin}
          variant="navy"
        />
        <StatCard
          title="Delivered"
          value={stats?.delivered ?? 0}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Total Weight"
          value={`${stats?.totalWeight?.toFixed(1) ?? 0} kg`}
          icon={Scale}
          variant="default"
        />
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Button asChild>
          <Link to="/agent/upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Shipment
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <AgentShipmentFilters
          search={search}
          status={status}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onClear={clearFilters}
        />
      </div>

      {/* Table */}
      <AgentShipmentTable shipments={shipments} isLoading={isLoading} />
    </AgentLayout>
  );
}
