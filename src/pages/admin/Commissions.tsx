import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { 
  Calculator, Plus, DollarSign, Users, TrendingUp, 
  CheckCircle2, Clock, Trash2, Settings2
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  useCommissions,
  useCommissionRules,
  useCreateCommissionRule,
  useUpdateCommissionRule,
  useDeleteCommissionRule,
  useMarkCommissionPaid,
  useCalculateCommissions,
  COMMISSION_TYPES,
} from '@/hooks/useCommissions';
import { useEmployees } from '@/hooks/useEmployees';

const ruleSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  commission_type: z.string().min(1, 'Type is required'),
  rate: z.coerce.number().min(0.01, 'Rate must be greater than 0'),
  description: z.string().optional(),
});

export default function CommissionsPage() {
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();
  const { data: rules, isLoading: rulesLoading } = useCommissionRules();
  const { data: employees } = useEmployees();
  const createRule = useCreateCommissionRule();
  const updateRule = useUpdateCommissionRule();
  const deleteRule = useDeleteCommissionRule();
  const markPaid = useMarkCommissionPaid();
  const calculateCommissions = useCalculateCommissions();

  const form = useForm({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      employee_id: '',
      commission_type: '',
      rate: 0,
      description: '',
    },
  });

  const onSubmitRule = async (data: z.infer<typeof ruleSchema>) => {
    await createRule.mutateAsync({
      employee_id: data.employee_id,
      commission_type: data.commission_type,
      rate: data.rate,
      description: data.description,
    });
    form.reset();
    setRuleDialogOpen(false);
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!commissions) return { total: 0, pending: 0, paid: 0, pendingAmount: 0, paidAmount: 0 };
    
    const pending = commissions.filter(c => c.status === 'pending');
    const paid = commissions.filter(c => c.status === 'paid');
    
    return {
      total: commissions.length,
      pending: pending.length,
      paid: paid.length,
      pendingAmount: pending.reduce((sum, c) => sum + c.amount, 0),
      paidAmount: paid.reduce((sum, c) => sum + c.amount, 0),
    };
  }, [commissions]);

  // Group commissions by employee for payroll view
  const employeePayroll = useMemo(() => {
    if (!commissions) return [];
    
    const grouped = new Map<string, { 
      employee_id: string; 
      name: string; 
      email: string;
      pending: number; 
      paid: number;
      pendingCount: number;
      paidCount: number;
    }>();
    
    commissions.forEach(c => {
      const existing = grouped.get(c.employee_id) || {
        employee_id: c.employee_id,
        name: c.employee_profile?.full_name || 'Unknown',
        email: c.employee_profile?.email || '',
        pending: 0,
        paid: 0,
        pendingCount: 0,
        paidCount: 0,
      };
      
      if (c.status === 'pending') {
        existing.pending += c.amount;
        existing.pendingCount += 1;
      } else {
        existing.paid += c.amount;
        existing.paidCount += 1;
      }
      
      grouped.set(c.employee_id, existing);
    });
    
    return Array.from(grouped.values());
  }, [commissions]);

  const isLoading = commissionsLoading || rulesLoading;

  if (isLoading) {
    return (
      <AdminLayout title="Commissions" subtitle="Manage employee commissions and payroll">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Commissions" subtitle="Manage employee commissions and payroll">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Commissions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payout</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">${stats.pendingAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{stats.pending} commissions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid Out</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${stats.paidAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{stats.paid} commissions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Rules</CardTitle>
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rules?.filter(r => r.is_active).length || 0}</div>
              <p className="text-xs text-muted-foreground">Commission rules</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={() => calculateCommissions.mutate()} disabled={calculateCommissions.isPending}>
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Commissions
          </Button>
          <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Commission Rule</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitRule)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="employee_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees?.map((emp) => (
                              <SelectItem key={emp.user_id} value={emp.user_id}>
                                {emp.profile?.full_name || emp.profile?.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commission_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMMISSION_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="e.g., 5 for 5%" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Standard sales commission" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createRule.isPending}>
                    Create Rule
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="commissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Summary</TabsTrigger>
            <TabsTrigger value="rules">Commission Rules</TabsTrigger>
          </TabsList>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>All Commissions</CardTitle>
                <CardDescription>Track and manage employee commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No commissions yet. Click "Calculate Commissions" to process paid invoices.
                        </TableCell>
                      </TableRow>
                    ) : (
                      commissions?.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell className="font-medium">
                            {commission.employee_profile?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{commission.invoices?.invoice_number || '-'}</TableCell>
                          <TableCell>{commission.invoices?.customers?.name || '-'}</TableCell>
                          <TableCell className="font-semibold">
                            ${commission.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                              {commission.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(commission.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {commission.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markPaid.mutate(commission.id)}
                                disabled={markPaid.isPending}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Summary Tab */}
          <TabsContent value="payroll">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Summary</CardTitle>
                <CardDescription>Commission totals by employee</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeePayroll.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No payroll data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      employeePayroll.map((emp) => (
                        <TableRow key={emp.employee_id}>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                          <TableCell>
                            <span className="text-amber-600">${emp.pending.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground ml-1">({emp.pendingCount})</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-green-600">${emp.paid.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground ml-1">({emp.paidCount})</span>
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${(emp.pending + emp.paid).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Commission Rules</CardTitle>
                <CardDescription>Define how commissions are calculated for each employee</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No commission rules defined. Add a rule to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rules?.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            {rule.employee_profile?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {COMMISSION_TYPES.find(t => t.value === rule.commission_type)?.label || rule.commission_type}
                          </TableCell>
                          <TableCell>
                            {rule.commission_type === 'per_kg' ? `$${rule.rate}` : `${rule.rate}%`}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {rule.description || '-'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) => 
                                updateRule.mutate({ id: rule.id, is_active: checked })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteRule.mutate(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
