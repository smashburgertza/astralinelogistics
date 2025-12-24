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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, UserX, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { Agent, useDeleteAgent, useUpdateAgentRegion } from '@/hooks/useAgents';
import { REGIONS } from '@/lib/constants';

interface AgentTableProps {
  agents: Agent[] | undefined;
  isLoading: boolean;
}

export function AgentTable({ agents, isLoading }: AgentTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const deleteAgent = useDeleteAgent();
  const updateRegion = useUpdateAgentRegion();

  const handleDelete = async () => {
    if (agentToDelete) {
      await deleteAgent.mutateAsync(agentToDelete.user_id);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };

  const handleRegionChange = async (userId: string, region: string) => {
    await updateRegion.mutateAsync({ 
      userId, 
      region: region as 'europe' | 'dubai' | 'china' | 'india' 
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Agent</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Region</TableHead>
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
              <TableHead className="font-semibold">Region</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => {
              const region = agent.region ? REGIONS[agent.region] : null;
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
                    <Select
                      value={agent.region || ''}
                      onValueChange={(value) => handleRegionChange(agent.user_id, value)}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue>
                          {region ? (
                            <span className="flex items-center gap-2">
                              <span>{region.flag}</span>
                              <span>{region.label}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(REGIONS).map(([key, r]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span>{r.flag}</span>
                              <span>{r.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agent.created_at 
                      ? format(new Date(agent.created_at), 'MMM d, yyyy')
                      : 'Unknown'
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

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
    </>
  );
}
