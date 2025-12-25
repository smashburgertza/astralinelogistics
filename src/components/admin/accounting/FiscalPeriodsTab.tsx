import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Lock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useFiscalPeriods, useCreateFiscalPeriod, useCloseFiscalPeriod } from '@/hooks/useAccounting';

export function FiscalPeriodsTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: periods = [], isLoading } = useFiscalPeriods();
  const closePeriod = useCloseFiscalPeriod();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'locked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fiscal Periods</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Period
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No fiscal periods defined
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.period_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{period.period_type}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(period.start_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{format(new Date(period.end_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{period.fiscal_year}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(period.status)}>
                        {period.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {period.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => closePeriod.mutate(period.id)}
                          disabled={closePeriod.isPending}
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Close
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CreateFiscalPeriodDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </Card>
  );
}

function CreateFiscalPeriodDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [periodName, setPeriodName] = useState('');
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [periodNumber, setPeriodNumber] = useState(1);

  const createPeriod = useCreateFiscalPeriod();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPeriod.mutate({
      period_name: periodName,
      period_type: periodType,
      start_date: startDate,
      end_date: endDate,
      fiscal_year: fiscalYear,
      period_number: periodNumber,
      status: 'open',
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setPeriodName('');
        setStartDate('');
        setEndDate('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Fiscal Period</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="period_name">Period Name *</Label>
            <Input
              id="period_name"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              placeholder="e.g., January 2025"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_type">Period Type</Label>
              <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period_number">Period Number</Label>
              <Input
                id="period_number"
                type="number"
                min="1"
                max="12"
                value={periodNumber}
                onChange={(e) => setPeriodNumber(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscal_year">Fiscal Year</Label>
            <Input
              id="fiscal_year"
              type="number"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(parseInt(e.target.value) || new Date().getFullYear())}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPeriod.isPending}>
              {createPeriod.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
