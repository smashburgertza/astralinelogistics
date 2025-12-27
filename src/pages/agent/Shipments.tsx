import { useMemo, useState } from 'react';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { StatCard } from '@/components/admin/StatCard';
import { AgentShipmentFilters } from '@/components/agent/ShipmentFilters';
import { AgentShipmentTable } from '@/components/agent/ShipmentTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentShipments, useAgentShipmentStats, useAgentDraftShipments, useFinalizeDraftShipment, useDeleteDraftShipment } from '@/hooks/useAgentShipments';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/hooks/useAuth';
import { useRegions } from '@/hooks/useRegions';
import { Package, Plane, MapPin, CheckCircle, Upload, Scale, FileEdit, Trash2, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AgentShipmentsPage() {
  const { getRegion } = useAuth();
  const region = getRegion();
  const { data: regions = [] } = useRegions();
  const regionInfo = region ? regions.find(r => r.code === region) : null;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('shipments');
  
  const debouncedSearch = useDebounce(search, 300);
  
  const filters = useMemo(() => ({
    status,
    search: debouncedSearch,
  }), [status, debouncedSearch]);

  const { data: shipments, isLoading } = useAgentShipments(filters);
  const { data: stats } = useAgentShipmentStats();
  const { data: drafts, isLoading: draftsLoading } = useAgentDraftShipments();
  const finalizeDraft = useFinalizeDraftShipment();
  const deleteDraft = useDeleteDraftShipment();

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
  };

  return (
    <AgentLayout 
      title="My Shipments" 
      subtitle={regionInfo ? `Shipments from ${regionInfo.name}` : 'View all your uploaded shipments'}
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

      {/* Tabs for Shipments and Drafts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="shipments" className="gap-2">
              <Package className="w-4 h-4" />
              Shipments
            </TabsTrigger>
            <TabsTrigger value="drafts" className="gap-2">
              <FileEdit className="w-4 h-4" />
              Drafts
              {drafts && drafts.length > 0 && (
                <Badge variant="secondary" className="ml-1">{drafts.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <Button asChild>
            <Link to="/agent/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Shipment
            </Link>
          </Button>
        </div>

        <TabsContent value="shipments" className="space-y-6">
          <AgentShipmentFilters
            search={search}
            status={status}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onClear={clearFilters}
          />
          <AgentShipmentTable shipments={shipments} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="drafts">
          {draftsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : drafts && drafts.length > 0 ? (
            <div className="space-y-4">
              {drafts.map((draft: any) => (
                <Card key={draft.id} className="shadow-sm border-dashed border-2 border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                            Draft
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Created {format(new Date(draft.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span>
                            <span className="font-medium">Customer:</span>{' '}
                            {draft.customers?.name || draft.customer_name || 'N/A'}
                          </span>
                          <span>
                            <span className="font-medium">Weight:</span>{' '}
                            {draft.total_weight_kg} kg
                          </span>
                          {draft.rate_per_kg > 0 && (
                            <span>
                              <span className="font-medium">Rate:</span>{' '}
                              ${draft.rate_per_kg}/kg
                            </span>
                          )}
                          {draft.parcels && draft.parcels.length > 0 && (
                            <span>
                              <span className="font-medium">Parcels:</span>{' '}
                              {draft.parcels.length}
                            </span>
                          )}
                        </div>
                        {draft.description && (
                          <p className="text-sm text-muted-foreground mt-1">{draft.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          disabled={finalizeDraft.isPending || !draft.rate_per_kg}
                          onClick={() => finalizeDraft.mutate(draft.id)}
                        >
                          {finalizeDraft.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Finalize
                            </>
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this draft shipment. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteDraft.mutate(draft.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-dashed">
              <FileEdit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No drafts</h3>
              <p className="text-muted-foreground mb-4">
                Save shipments as drafts while receiving cargo, then finalize when ready.
              </p>
              <Button asChild>
                <Link to="/agent/upload">
                  <Upload className="h-4 w-4 mr-2" />
                  Create New Shipment
                </Link>
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AgentLayout>
  );
}
