import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgentInvoicesToMe, useAgentMarkInvoicePaid } from '@/hooks/useAgentInvoices';
import { useAgentFullConfig } from '@/hooks/useAgentSettings';
import { format } from 'date-fns';
import { Loader2, Search, FileText, Download, Printer, Eye, ArrowDownLeft, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { InvoicePDF } from '@/components/agent/InvoicePDF';
import { MarkPaymentDialog, MarkPaymentData } from '@/components/agent/MarkPaymentDialog';
import { cn } from '@/lib/utils';

function AgentInvoicesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'from_me' | 'to_me'>('from_me');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [markPaymentOpen, setMarkPaymentOpen] = useState(false);
  const [invoiceToMark, setInvoiceToMark] = useState<any | null>(null);
  
  const printRef = useRef<HTMLDivElement>(null);

  // Invoices created by agent (from_agent direction)
  const { data: myInvoices, isLoading: isLoadingMyInvoices } = useQuery({
    queryKey: ['agent-invoices', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(name, phone, email, address),
          shipment:shipments(tracking_number, origin_region, total_weight_kg)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Invoices to agent (from Astraline)
  const { data: invoicesToMe, isLoading: isLoadingToMe } = useAgentInvoicesToMe();
  const markPayment = useAgentMarkInvoicePaid();
  const { data: agentConfig } = useAgentFullConfig();
  
  // Get the agent's base currency for display
  const agentCurrency = agentConfig?.settings?.base_currency || 'USD';
  const agentCurrencySymbol = CURRENCY_SYMBOLS[agentCurrency] || '$';

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedInvoice ? `Invoice-${selectedInvoice.invoice_number}` : 'Invoice',
  });

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPreviewOpen(true);
  };

  const handleDownloadPDF = (invoice: any) => {
    setSelectedInvoice(invoice);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const handleOpenMarkPayment = (invoice: any) => {
    setInvoiceToMark(invoice);
    setMarkPaymentOpen(true);
  };

  const handleMarkPayment = (data: MarkPaymentData) => {
    markPayment.mutate({
      invoiceId: data.invoiceId,
      paymentMethod: data.paymentMethod,
      paymentReference: `${data.paymentReference}${data.bankName ? ` | ${data.bankName}` : ''}${data.notes ? ` | ${data.notes}` : ''}`,
    }, {
      onSuccess: () => {
        setMarkPaymentOpen(false);
        setInvoiceToMark(null);
      },
    });
  };

  const currentInvoices = activeTab === 'from_me' ? myInvoices : invoicesToMe;
  const isLoading = activeTab === 'from_me' ? isLoadingMyInvoices : isLoadingToMe;

  const filteredInvoices = currentInvoices?.filter(inv => {
    const invoiceAny = inv as any;
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (activeTab === 'from_me' && invoiceAny.customer?.name?.toLowerCase().includes(search.toLowerCase())) ||
      inv.shipment?.tracking_number?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, hasPendingVerification?: boolean) => {
    if (hasPendingVerification) {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
          <Clock className="h-3 w-3" />
          Pending Verification
        </Badge>
      );
    }
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Stats for "From Me" tab
  const myInvoicesStats = {
    total: myInvoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
    pending: myInvoices?.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
    paid: myInvoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
  };

  // Stats for "To Me" tab
  const toMeStats = {
    total: invoicesToMe?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
    pending: invoicesToMe?.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
    paid: invoicesToMe?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
  };

  const currentStats = activeTab === 'from_me' ? myInvoicesStats : toMeStats;
  const pendingToMeCount = invoicesToMe?.filter(inv => inv.status === 'pending').length || 0;

  return (
    <AgentLayout title="My Invoices" subtitle="View and manage your invoices">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'from_me' | 'to_me')} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="from_me" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              From Me
            </TabsTrigger>
            <TabsTrigger value="to_me" className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              To Me
              {pendingToMeCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs px-1">
                  {pendingToMeCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold">{agentCurrencySymbol}{currentStats.total.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {activeTab === 'to_me' ? 'Awaiting Payment' : 'Pending'}
                    </p>
                    <p className="text-2xl font-bold text-amber-600">{agentCurrencySymbol}{currentStats.pending.toFixed(2)}</p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                    {filteredInvoices?.filter(inv => inv.status === 'pending').length || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold text-emerald-600">{agentCurrencySymbol}{currentStats.paid.toFixed(2)}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {filteredInvoices?.filter(inv => inv.status === 'paid').length || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === 'from_me' 
                      ? "Search by invoice #, customer, or tracking..." 
                      : "Search by invoice # or tracking..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tab Content */}
          <TabsContent value="from_me" className="mt-0">
            <Card className="border-0 shadow-md">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredInvoices?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                    <p className="text-muted-foreground">
                      {search || statusFilter !== 'all' 
                        ? 'Try adjusting your filters'
                        : 'Invoices will appear here when you create shipments'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Tracking #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices?.map((invoice) => {
                        const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$';
                        return (
                          <TableRow key={invoice.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono font-medium">
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{(invoice as any).customer?.name || 'N/A'}</p>
                                {(invoice as any).customer?.phone && (
                                  <p className="text-xs text-muted-foreground">{(invoice as any).customer.phone}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {invoice.shipment?.tracking_number || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(invoice.created_at!), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {currencySymbol}{Number(invoice.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status || 'pending')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewInvoice(invoice)}
                                  title="Preview Invoice"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownloadPDF(invoice)}
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="to_me" className="mt-0">
            <Card className="border-0 shadow-md">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-primary" />
                  Invoices from Astraline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredInvoices?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No invoices from Astraline</h3>
                    <p className="text-muted-foreground">
                      Invoices for clearing charges and services will appear here
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Shipment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices?.map((invoice) => {
                        const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || 'USD'] || '$';
                        const isPending = invoice.status === 'pending';
                        
                        return (
                          <TableRow key={invoice.id} className={cn(
                            "hover:bg-muted/30",
                            isPending && "bg-amber-50/50 dark:bg-amber-950/20"
                          )}>
                            <TableCell className="font-mono font-medium">
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell>
                              {invoice.shipment ? (
                                <div>
                                  <p className="font-mono text-sm">{invoice.shipment.tracking_number}</p>
                                  <p className="text-xs text-muted-foreground">{invoice.shipment.total_weight_kg} kg</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {invoice.due_date 
                                ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {currencySymbol}{Number(invoice.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status || 'pending')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isPending && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => handleOpenMarkPayment(invoice)}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Mark Payment
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewInvoice(invoice)}
                                  title="Preview Invoice"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Hidden print container */}
        <div className="hidden">
          <div ref={printRef}>
            {selectedInvoice && <InvoicePDF invoice={selectedInvoice} />}
          </div>
        </div>

        {/* Invoice Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Invoice Preview</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handlePrint()}
                >
                  <Printer className="w-4 h-4" />
                  Print / Download
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden">
              {selectedInvoice && <InvoicePDF invoice={selectedInvoice} />}
            </div>
          </DialogContent>
        </Dialog>

        {/* Mark Payment Dialog */}
        <MarkPaymentDialog
          invoice={invoiceToMark}
          open={markPaymentOpen}
          onOpenChange={setMarkPaymentOpen}
          onMarkPayment={handleMarkPayment}
          isLoading={markPayment.isPending}
        />
      </div>
    </AgentLayout>
  );
}

export default AgentInvoicesPage;
