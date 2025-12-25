import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, FileText, Package, 
  DollarSign, Award, Eye, Mail, BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';

interface EmployeeMetrics {
  userId: string;
  fullName: string;
  email: string;
  employeeRole: string | null;
  estimatesCreated: number;
  invoicesIssued: number;
  shipmentsHandled: number;
  revenueGenerated: number;
  expensesSubmitted: number;
}

export function EmployeePerformanceInsights() {
  const [employees, setEmployees] = useState<EmployeeMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [topPerformer, setTopPerformer] = useState<EmployeeMetrics | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchEmployeePerformance();
  }, []);

  const fetchEmployeePerformance = async () => {
    try {
      // Fetch employees
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, employee_role')
        .in('role', ['employee', 'super_admin']);

      if (rolesError) throw rolesError;

      const userIds = userRoles?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) {
        setEmployees([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      // Fetch estimates created by each employee
      const { data: estimates } = await supabase
        .from('estimates')
        .select('created_by')
        .in('created_by', userIds);

      // Fetch invoices created by each employee
      const { data: invoices } = await supabase
        .from('invoices')
        .select('created_by, amount_in_tzs, amount, status')
        .in('created_by', userIds);

      // Fetch shipments created by each employee
      const { data: shipments } = await supabase
        .from('shipments')
        .select('created_by')
        .in('created_by', userIds);

      // Fetch expenses submitted by each employee
      const { data: expenses } = await supabase
        .from('expenses')
        .select('submitted_by, created_by')
        .or(`submitted_by.in.(${userIds.join(',')}),created_by.in.(${userIds.join(',')})`);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const roleMap = new Map(userRoles?.map(r => [r.user_id, r.employee_role]) || []);

      const employeeMetrics: EmployeeMetrics[] = userIds.map(userId => {
        const profile = profileMap.get(userId);
        const employeeEstimates = estimates?.filter(e => e.created_by === userId) || [];
        const employeeInvoices = invoices?.filter(i => i.created_by === userId) || [];
        const employeeShipments = shipments?.filter(s => s.created_by === userId) || [];
        const employeeExpenses = expenses?.filter(e => e.submitted_by === userId || e.created_by === userId) || [];

        const paidInvoices = employeeInvoices.filter(i => i.status === 'paid');
        const revenue = paidInvoices.reduce((sum, i) => sum + Number(i.amount_in_tzs || i.amount), 0);

        return {
          userId,
          fullName: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          employeeRole: roleMap.get(userId) || null,
          estimatesCreated: employeeEstimates.length,
          invoicesIssued: employeeInvoices.length,
          shipmentsHandled: employeeShipments.length,
          revenueGenerated: revenue,
          expensesSubmitted: employeeExpenses.length,
        };
      });

      // Sort by total activity
      const sortedEmployees = employeeMetrics.sort((a, b) => {
        const aScore = a.estimatesCreated + a.invoicesIssued + a.shipmentsHandled;
        const bScore = b.estimatesCreated + b.invoicesIssued + b.shipmentsHandled;
        return bScore - aScore;
      });

      setEmployees(sortedEmployees);
      setTopPerformer(sortedEmployees[0] || null);
    } catch (error) {
      console.error('Error fetching employee performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'manager': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'operations': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'finance': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'customer_support': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const maxActivity = Math.max(...employees.map(e => 
    e.estimatesCreated + e.invoicesIssued + e.shipmentsHandled
  ), 1);

  if (loading) {
    return (
      <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            Employee Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              Employee Performance
            </CardTitle>
            <CardDescription className="mt-1">Team productivity metrics</CardDescription>
          </div>
          {topPerformer && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">
                Top: {topPerformer.fullName.split(' ')[0]}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm">No employees found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.slice(0, 5).map((employee, index) => {
              const totalActivity = employee.estimatesCreated + employee.invoicesIssued + employee.shipmentsHandled;
              const activityPercent = (totalActivity / maxActivity) * 100;

              return (
                <div key={employee.userId} className="group p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-md">
                        <AvatarFallback className="bg-gradient-to-br from-accent/80 to-accent text-accent-foreground font-medium text-sm">
                          {getInitials(employee.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-background">
                          <Award className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{employee.fullName}</p>
                        {employee.employeeRole && (
                          <Badge variant="outline" className={`text-xs capitalize ${getRoleBadgeColor(employee.employeeRole)}`}>
                            {employee.employeeRole.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {employee.estimatesCreated}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {employee.invoicesIssued}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {employee.shipmentsHandled}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedEmployeeId(employee.userId);
                                setDrawerOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">View Details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                window.location.href = `mailto:${employee.email}`;
                                toast.success('Opening email client...');
                              }}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Send Email</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              asChild
                            >
                              <Link to="/admin/reports">
                                <BarChart3 className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">View Reports</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-600">
                        TZS {employee.revenueGenerated.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">revenue</p>
                    </div>
                  </div>
                  <Progress value={activityPercent} className="h-1.5" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <EmployeeProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        employeeId={selectedEmployeeId}
      />
    </Card>
  );
}
