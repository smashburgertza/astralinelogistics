import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerSelector } from './CustomerSelector';

export interface ShipmentLine {
  id: string;
  customer_id: string;
  customer_name: string;
  description: string;
  weight_kg: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

interface ShipmentLinesTableProps {
  lines: ShipmentLine[];
  customers: Customer[] | undefined;
  customersLoading: boolean;
  currencySymbol: string;
  calculateLineAmount: (weight: number) => number;
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  onUpdateLine: (id: string, field: keyof ShipmentLine, value: any) => void;
  onUpdateLineCustomer: (id: string, customerId: string, customerName: string) => void;
}

export function ShipmentLinesTable({
  lines,
  customers,
  customersLoading,
  currencySymbol,
  calculateLineAmount,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
  onUpdateLineCustomer,
}: ShipmentLinesTableProps) {
  const totals = {
    totalWeight: lines.reduce((sum, line) => sum + (line.weight_kg || 0), 0),
    totalAmount: lines.reduce((sum, line) => sum + calculateLineAmount(line.weight_kg), 0),
    validLines: lines.filter(l => (l.customer_id || l.customer_name) && l.weight_kg > 0).length,
  };

  return (
    <Card className="shadow-lg border-0">
      <CardContent className="p-0">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 p-4 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
          <div className="col-span-4">Customer Name</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-2 text-right">Weight (kg)</div>
          <div className="col-span-2 text-right">Amount ({currencySymbol})</div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {lines.map((line) => {
            const amount = calculateLineAmount(line.weight_kg);
            return (
              <div key={line.id} className="grid grid-cols-12 gap-2 p-3 items-center group hover:bg-muted/30">
                {/* Customer Name */}
                <div className="col-span-4">
                  <CustomerSelector
                    value={line.customer_id}
                    customerName={line.customer_name}
                    onChange={(id, name) => onUpdateLineCustomer(line.id, id, name)}
                    customers={customers}
                    isLoading={customersLoading}
                  />
                </div>

                {/* Description */}
                <div className="col-span-4">
                  <Input
                    placeholder="e.g., Electronics, Clothing..."
                    value={line.description}
                    onChange={(e) => onUpdateLine(line.id, 'description', e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Weight */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={line.weight_kg || ''}
                    onChange={(e) => onUpdateLine(line.id, 'weight_kg', parseFloat(e.target.value) || 0)}
                    className="h-10 text-right"
                  />
                </div>

                {/* Amount (calculated) */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <span className={cn(
                    "font-semibold tabular-nums",
                    amount > 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {currencySymbol}{amount.toFixed(2)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveLine(line.id)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Line Button */}
        <div className="p-3 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddLine}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Line
          </Button>
        </div>

        {/* Totals Row */}
        <div className="grid grid-cols-12 gap-2 p-4 bg-muted/50 border-t font-medium">
          <div className="col-span-4 text-muted-foreground">
            {totals.validLines} shipment{totals.validLines !== 1 ? 's' : ''}
          </div>
          <div className="col-span-4"></div>
          <div className="col-span-2 text-right">
            <span className="text-muted-foreground text-sm">Total:</span>{' '}
            <span className="font-bold">{totals.totalWeight.toFixed(2)} kg</span>
          </div>
          <div className="col-span-2 text-right">
            <span className={cn(
              "text-xl font-bold",
              totals.totalAmount > 0 ? "text-primary" : "text-muted-foreground"
            )}>
              {currencySymbol}{totals.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
