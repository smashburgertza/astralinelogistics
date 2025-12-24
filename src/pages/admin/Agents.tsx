import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateAgentDialog } from '@/components/admin/CreateAgentDialog';
import { AgentTable } from '@/components/admin/AgentTable';
import { RegionManagement } from '@/components/admin/RegionManagement';
import { useAgents } from '@/hooks/useAgents';
import { REGIONS } from '@/lib/constants';
import { Users, Globe } from 'lucide-react';

export default function AgentsPage() {
  const { data: agents, isLoading } = useAgents();

  // Calculate stats
  const totalAgents = agents?.length || 0;
  const agentsByRegion = agents?.reduce((acc, agent) => {
    if (agent.region) {
      acc[agent.region] = (acc[agent.region] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <AdminLayout
      title="Agents & Regions"
      subtitle="Manage regional agents and configure region settings"
    >
      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agents" className="gap-2">
            <Users className="w-4 h-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="regions" className="gap-2">
            <Globe className="w-4 h-4" />
            Regions & Pricing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalAgents}</p>
              </CardContent>
            </Card>

            {Object.entries(REGIONS).map(([key, region]) => (
              <Card key={key} className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span>{region.flag}</span>
                    {region.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {agentsByRegion[key] || 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">All Agents</h2>
              <p className="text-sm text-muted-foreground">
                {totalAgents} agent{totalAgents !== 1 ? 's' : ''} registered
              </p>
            </div>
            <CreateAgentDialog />
          </div>

          {/* Agents Table */}
          <AgentTable agents={agents} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="regions">
          <RegionManagement />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
