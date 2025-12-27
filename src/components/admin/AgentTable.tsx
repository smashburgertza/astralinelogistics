import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MoreHorizontal, UserX, MapPin, User, Loader2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { Agent, useDeleteAgent, useUpdateAgentRegions } from '@/hooks/useAgents';
import { useRegions } from '@/hooks/useRegions';
import { AgentConfigDrawer } from './AgentConfigDrawer';

interface AgentTableProps {
  agents: Agent[] | undefined;
  isLoading: boolean;
}

export function AgentTable({ agents, isLoading }: AgentTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [editRegionsAgent, setEditRegionsAgent] = useState<Agent | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [configAgent, setConfigAgent] = useState<Agent | null>(null);
  
  const deleteAgent = useDeleteAgent();
  const updateRegions = useUpdateAgentRegions();
  const { data: regions = [] } = useRegions();

  const handleDelete = async () => {
    if (agentToDelete) {
      await deleteAgent.mutateAsync(agentToDelete.user_id);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const handleOpenEditRegions = (agent: Agent) => {
    const currentRegions = agent.regions.map(r => r.region_code);
    // Fallback to legacy region if no regions in new table
    if (currentRegions.length === 0 && agent.region) {
      setSelectedRegions([agent.region]);
    } else {
      setSelectedRegions(currentRegions);
    }
    setEditRegionsAgent(agent);
  };

  const handleSaveRegions = async () => {
    if (editRegionsAgent && selectedRegions.length > 0) {
      await updateRegions.mutateAsync({
        userId: editRegionsAgent.user_id,
        regions: selectedRegions,
      });
      setEditRegionsAgent(null);
    }
  };

  const toggleRegion = (regionCode: string) => {
    setSelectedRegions(prev => 
      prev.includes(regionCode)
        ? prev.filter(r => r !== regionCode)
        : [...prev, regionCode]
    );
  };

  const getAgentRegions = (agent: Agent) => {
    // Use new regions array if available, otherwise fallback to legacy
    if (agent.regions.length > 0) {
      return agent.regions.map(r => r.region_code);
    }
    return agent.region ? [agent.region] : [];
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Agent</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Regions</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!agents?.length) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-1">No agents found</h3>
        <p className="text-muted-foreground">
          Create your first agent to start managing regional shipments.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Agent</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Regions</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => {
              const agentRegionCodes = getAgentRegions(agent);
              const agentRegionInfos = regions.filter(r => agentRegionCodes.includes(r.code));
              
              return (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {agent.profile?.full_name?.charAt(0).toUpperCase() || 'A'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {agent.profile?.full_name || 'Unknown'}
                        </div>
                        {agent.profile?.phone && (
                          <div className="text-xs text-muted-foreground">
                            {agent.profile.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agent.profile?.email || 'No email'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agentRegionInfos.length > 0 ? (
                        agentRegionInfos.map((r) => (
                          <Badge key={r.code} variant="secondary" className="text-xs">
                            {r.flag_emoji} {r.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">Not assigned</span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => handleOpenEditRegions(agent)}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agent.created_at 
                      ? format(new Date(agent.created_at), 'MMM d, yyyy')
                      : 'Unknown'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setConfigAgent(agent)}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Configure
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setConfigAgent(agent)}>
                            <Settings className="w-4 h-4 mr-2" />
                            Configure Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEditRegions(agent)}>
                            <MapPin className="w-4 h-4 mr-2" />
                            Edit Regions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setAgentToDelete(agent);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Remove Agent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Regions Dialog */}
      <Dialog open={!!editRegionsAgent} onOpenChange={(open) => !open && setEditRegionsAgent(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Edit Regions for {editRegionsAgent?.profile?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select the regions this agent can manage.
            </p>
            <div className="space-y-2">
              {regions.map((region) => (
                <div
                  key={region.code}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleRegion(region.code)}
                >
                  <Checkbox
                    checked={selectedRegions.includes(region.code)}
                    onCheckedChange={() => toggleRegion(region.code)}
                  />
                  <span className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{region.flag_emoji}</span>
                    <span className="font-medium">{region.name}</span>
                  </span>
                </div>
              ))}
            </div>
            {selectedRegions.length === 0 && (
              <p className="text-sm text-destructive mt-2">
                Please select at least one region.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRegionsAgent(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRegions} 
              disabled={selectedRegions.length === 0 || updateRegions.isPending}
            >
              {updateRegions.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Regions'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold">
                {agentToDelete?.profile?.full_name || 'this agent'}
              </span>
              ? They will lose access to the agent portal but their account will remain active as a customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Agent Config Drawer */}
      <AgentConfigDrawer
        agent={configAgent}
        open={!!configAgent}
        onOpenChange={(open) => !open && setConfigAgent(null)}
      />
    </>
  );
}
