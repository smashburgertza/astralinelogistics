import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Settings, 
  Route, 
  DollarSign, 
  TrendingUp,
  Loader2,
  Plus,
  Trash2,
  User,
  Tag,
  Save
} from 'lucide-react';
import { Agent } from '@/hooks/useAgents';
import { useTransitRoutes, TRANSIT_POINT_LABELS, TRANSIT_POINT_OPTIONS, TransitPointType, useCreateTransitRoute, useUpdateTransitRoute, useDeleteTransitRoute } from '@/hooks/useTransitRoutes';
import { useAllAgentBalances } from '@/hooks/useAgentBalance';
import { useRegions } from '@/hooks/useRegions';
import { useRegionPricing, useUpdateRegionPricing, useCreateRegionPricing, useDeleteRegionPricing } from '@/hooks/useRegionPricing';
import { CURRENCY_SYMBOLS } from '@/lib/constants';

interface AgentConfigDrawerProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentConfigDrawer({ agent, open, onOpenChange }: AgentConfigDrawerProps) {
  const { data: allRoutes = [], isLoading: routesLoading } = useTransitRoutes();
  const { data: allBalances = [] } = useAllAgentBalances();
  const { data: regions = [] } = useRegions();
  const { data: allPricing = [] } = useRegionPricing();
  const createRoute = useCreateTransitRoute();
  const updateRoute = useUpdateTransitRoute();
  const deleteRoute = useDeleteTransitRoute();
  const updatePricing = useUpdateRegionPricing();
  const createPricing = useCreateRegionPricing();
  const deletePricing = useDeleteRegionPricing();

  const [newRoute, setNewRoute] = useState({
    region_id: '',
    transit_point: 'nairobi' as TransitPointType,
    additional_cost: 0,
    currency: 'USD',
    estimated_days: 0,
  });

  const [editingPricing, setEditingPricing] = useState<Record<string, { agent_rate_per_kg: number }>>({});

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'pricing' | 'route'; id: string } | null>(null);
  const [newPricing, setNewPricing] = useState({
    region: '' as 'europe' | 'dubai' | 'china' | 'india' | 'usa' | 'uk' | '',
    cargo_type: 'air' as 'sea' | 'air',
    service_type: '' as 'door_to_door' | 'airport_to_airport' | '',
    transit_point: 'direct' as 'direct' | 'nairobi' | 'zanzibar',
    agent_rate_per_kg: 0,
    customer_rate_per_kg: 0,
    handling_fee: 0,
    currency: 'USD',
  });
  if (!agent) return null;

  // Get agent's assigned regions
  const agentRegionCodes = agent.regions.length > 0 
    ? agent.regions.map(r => r.region_code) 
    : agent.region ? [agent.region] : [];
  
  const agentRegions = regions.filter(r => agentRegionCodes.includes(r.code));
  
  // Filter routes for agent's regions
  const agentRoutes = allRoutes.filter(route => 
    agentRegions.some(r => r.id === route.region_id)
  );

  // Get agent's balance
  const agentBalance = allBalances.find(b => b.agent_id === agent.user_id);

  // Filter pricing for agent's regions
  const agentPricing = allPricing.filter(p => 
    agentRegionCodes.includes(p.region)
  );

  const handlePricingChange = (pricingId: string, value: number) => {
    setEditingPricing(prev => ({
      ...prev,
      [pricingId]: { agent_rate_per_kg: value }
    }));
  };

  const handleSavePricing = async (pricingId: string) => {
    const editedValue = editingPricing[pricingId];
    if (!editedValue) return;
    
    await updatePricing.mutateAsync({
      id: pricingId,
      agent_rate_per_kg: editedValue.agent_rate_per_kg,
    });
    
    setEditingPricing(prev => {
      const newState = { ...prev };
      delete newState[pricingId];
      return newState;
    });
  };

  const handleAddPricing = async () => {
    if (!newPricing.region) return;
    
    await createPricing.mutateAsync({
      region: newPricing.region as 'europe' | 'dubai' | 'china' | 'india' | 'usa' | 'uk',
      cargo_type: newPricing.cargo_type,
      service_type: newPricing.service_type || null,
      transit_point: newPricing.transit_point,
      agent_rate_per_kg: newPricing.agent_rate_per_kg,
      customer_rate_per_kg: newPricing.customer_rate_per_kg,
      handling_fee: newPricing.handling_fee,
      currency: newPricing.currency,
    });
    
    setNewPricing({
      region: '',
      cargo_type: 'air',
      service_type: '',
      transit_point: 'direct',
      agent_rate_per_kg: 0,
      customer_rate_per_kg: 0,
      handling_fee: 0,
      currency: 'USD',
    });
  };

  const handleAddRoute = async () => {
    if (!newRoute.region_id) return;
    await createRoute.mutateAsync({
      region_id: newRoute.region_id,
      transit_point: newRoute.transit_point,
      additional_cost: newRoute.additional_cost,
      currency: newRoute.currency,
      estimated_days: newRoute.estimated_days,
      is_active: true,
    });
    setNewRoute({
      region_id: '',
      transit_point: 'nairobi',
      additional_cost: 0,
      currency: 'USD',
      estimated_days: 0,
    });
  };

  const handleToggleRoute = async (routeId: string, isActive: boolean) => {
    await updateRoute.mutateAsync({ id: routeId, is_active: isActive });
  };

  const handleDeleteRoute = async (routeId: string) => {
    await deleteRoute.mutateAsync(routeId);
    setDeleteConfirm(null);
  };

  const handleDeletePricing = async (pricingId: string) => {
    await deletePricing.mutateAsync(pricingId);
    setDeleteConfirm(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'route') {
      handleDeleteRoute(deleteConfirm.id);
    } else {
      handleDeletePricing(deleteConfirm.id);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {agent.profile?.full_name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <SheetTitle>{agent.profile?.full_name || 'Agent'}</SheetTitle>
              <SheetDescription>{agent.profile?.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="pricing" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pricing" className="gap-1.5">
                <Tag className="w-4 h-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="routes" className="gap-1.5">
                <Route className="w-4 h-4" />
                Routes
              </TabsTrigger>
              <TabsTrigger value="balance" className="gap-1.5">
                <DollarSign className="w-4 h-4" />
                Balance
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Agent Shipping Rates</CardTitle>
                  <CardDescription>
                    Configure rates the agent charges for shipping per kg
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agentPricing.length > 0 ? (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Region</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Agent Rate/kg</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agentPricing.map((pricing) => {
                            const isEditing = editingPricing[pricing.id] !== undefined;
                            const currentRate = isEditing 
                              ? editingPricing[pricing.id].agent_rate_per_kg 
                              : pricing.agent_rate_per_kg;
                            const regionInfo = regions.find(r => r.code === pricing.region);
                            
                            return (
                              <TableRow key={pricing.id}>
                                <TableCell>
                                  <span className="flex items-center gap-1.5">
                                    {regionInfo?.flag_emoji}
                                    <span className="text-sm">{regionInfo?.name || pricing.region}</span>
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {pricing.cargo_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {TRANSIT_POINT_LABELS[pricing.transit_point || 'direct']}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">
                                    {pricing.service_type?.replace(/_/g, ' ') || '—'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">
                                      {CURRENCY_SYMBOLS[pricing.currency] || pricing.currency}
                                    </span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={currentRate}
                                      onChange={(e) => handlePricingChange(pricing.id, parseFloat(e.target.value) || 0)}
                                      className="w-24 h-8"
                                    />
                                    <span className="text-xs text-muted-foreground">/kg</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {isEditing && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleSavePricing(pricing.id)}
                                        disabled={updatePricing.isPending}
                                      >
                                        {updatePricing.isPending ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Save className="w-4 h-4" />
                                        )}
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setDeleteConfirm({ type: 'pricing', id: pricing.id })}
                                      disabled={deletePricing.isPending}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No pricing configured for this agent's regions yet.
                      <br />
                      <span className="text-xs">Configure region pricing in Settings → Pricing first.</span>
                    </div>
                  )}

                  <Separator />

                  {/* Add New Pricing */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Add New Pricing</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={newPricing.region}
                        onValueChange={(value) => setNewPricing({ ...newPricing, region: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {agentRegions.map((region) => (
                            <SelectItem key={region.code} value={region.code}>
                              {region.flag_emoji} {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={newPricing.cargo_type}
                        onValueChange={(value) => setNewPricing({ ...newPricing, cargo_type: value as 'sea' | 'air' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="air">Air Cargo</SelectItem>
                          <SelectItem value="sea">Sea Cargo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Select
                        value={newPricing.service_type}
                        onValueChange={(value) => setNewPricing({ ...newPricing, service_type: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Service type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="door_to_door">Door to Door</SelectItem>
                          <SelectItem value="airport_to_airport">Airport to Airport</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={newPricing.transit_point}
                        onValueChange={(value) => setNewPricing({ ...newPricing, transit_point: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="nairobi">Via Nairobi</SelectItem>
                          <SelectItem value="zanzibar">Via Zanzibar</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={newPricing.currency}
                        onValueChange={(value) => setNewPricing({ ...newPricing, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Agent Rate/kg</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPricing.agent_rate_per_kg}
                          onChange={(e) => setNewPricing({ ...newPricing, agent_rate_per_kg: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Customer Rate/kg</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPricing.customer_rate_per_kg}
                          onChange={(e) => setNewPricing({ ...newPricing, customer_rate_per_kg: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Handling Fee</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPricing.handling_fee}
                          onChange={(e) => setNewPricing({ ...newPricing, handling_fee: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleAddPricing}
                      disabled={!newPricing.region || createPricing.isPending}
                      className="w-full"
                    >
                      {createPricing.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Add Pricing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transit Routes Tab */}
            <TabsContent value="routes" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Transit Routes</CardTitle>
                  <CardDescription>
                    Configure routing options for this agent's regions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Routes */}
                  {agentRoutes.length > 0 ? (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Region</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agentRoutes.map((route) => (
                            <TableRow key={route.id}>
                              <TableCell>
                                <span className="flex items-center gap-1.5">
                                  {route.region?.flag_emoji}
                                  <span className="text-sm">{route.region?.name}</span>
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {TRANSIT_POINT_LABELS[route.transit_point]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {route.additional_cost > 0 ? (
                                  <span className="text-sm font-medium">
                                    +{CURRENCY_SYMBOLS[route.currency]}{route.additional_cost}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={route.is_active}
                                  onCheckedChange={(checked) => handleToggleRoute(route.id, checked)}
                                  disabled={updateRoute.isPending}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setDeleteConfirm({ type: 'route', id: route.id })}
                                  disabled={deleteRoute.isPending}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No transit routes configured for this agent's regions.
                    </div>
                  )}

                  <Separator />

                  {/* Add New Route */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Add Transit Route</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        value={newRoute.region_id}
                        onValueChange={(value) => setNewRoute({ ...newRoute, region_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {agentRegions.map((region) => (
                            <SelectItem key={region.id} value={region.id}>
                              {region.flag_emoji} {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={newRoute.transit_point}
                        onValueChange={(value) => setNewRoute({ ...newRoute, transit_point: value as TransitPointType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSIT_POINT_OPTIONS.filter(o => o.value !== 'direct').map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Extra Cost</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newRoute.additional_cost}
                          onChange={(e) => setNewRoute({ ...newRoute, additional_cost: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Currency</Label>
                        <Select
                          value={newRoute.currency}
                          onValueChange={(value) => setNewRoute({ ...newRoute, currency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Extra Days</Label>
                        <Input
                          type="number"
                          min="0"
                          value={newRoute.estimated_days}
                          onChange={(e) => setNewRoute({ ...newRoute, estimated_days: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleAddRoute}
                      disabled={!newRoute.region_id || createRoute.isPending}
                      className="w-full"
                    >
                      {createRoute.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Add Route
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Balance Tab */}
            <TabsContent value="balance" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Account Balance</CardTitle>
                  <CardDescription>
                    Summary of invoices between agent and Astraline
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {agentBalance ? (
                    <div className="space-y-4">
                      {/* Net Balance */}
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Net Balance</p>
                        <p className={`text-3xl font-bold ${
                          agentBalance.net_balance > 0 
                            ? 'text-green-600' 
                            : agentBalance.net_balance < 0 
                              ? 'text-red-600' 
                              : ''
                        }`}>
                          ${Math.abs(agentBalance.net_balance).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {agentBalance.net_balance > 0 
                            ? 'Agent owes Astraline' 
                            : agentBalance.net_balance < 0 
                              ? 'Astraline owes Agent'
                              : 'Balanced'}
                        </p>
                      </div>

                      <Separator />

                      {/* Breakdown */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">From Agent (Agent Owes)</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Paid</span>
                              <span className="font-medium">${agentBalance.paid_from_agent.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Pending</span>
                              <span className="font-medium text-amber-600">${agentBalance.pending_from_agent.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">To Agent (Astraline Owes)</p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Paid</span>
                              <span className="font-medium">${agentBalance.paid_to_agent.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Pending</span>
                              <span className="font-medium text-amber-600">${agentBalance.pending_to_agent.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No invoice history for this agent yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Agent Settings</CardTitle>
                  <CardDescription>
                    General configuration for this agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assigned Regions</Label>
                    <div className="flex flex-wrap gap-2">
                      {agentRegions.map((region) => (
                        <Badge key={region.code} variant="secondary">
                          {region.flag_emoji} {region.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Contact Information</Label>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span>{agent.profile?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span>{agent.profile?.phone || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="text-sm text-muted-foreground">
                    More agent-specific settings coming soon (custom rates, commission rules, etc.)
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type === 'route' ? 'Transit Route' : 'Pricing Entry'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deleteConfirm?.type === 'route' ? 'transit route' : 'pricing entry'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
