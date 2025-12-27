import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  User
} from 'lucide-react';
import { Agent } from '@/hooks/useAgents';
import { useTransitRoutes, TRANSIT_POINT_LABELS, TRANSIT_POINT_OPTIONS, TransitPointType, useCreateTransitRoute, useUpdateTransitRoute, useDeleteTransitRoute } from '@/hooks/useTransitRoutes';
import { useAllAgentBalances } from '@/hooks/useAgentBalance';
import { useRegions } from '@/hooks/useRegions';
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
  const createRoute = useCreateTransitRoute();
  const updateRoute = useUpdateTransitRoute();
  const deleteRoute = useDeleteTransitRoute();

  const [newRoute, setNewRoute] = useState({
    region_id: '',
    transit_point: 'nairobi' as TransitPointType,
    additional_cost: 0,
    currency: 'USD',
    estimated_days: 0,
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
    if (confirm('Delete this transit route?')) {
      await deleteRoute.mutateAsync(routeId);
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
          <Tabs defaultValue="routes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
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
                                  onClick={() => handleDeleteRoute(route.id)}
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
    </Sheet>
  );
}
