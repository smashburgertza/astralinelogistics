import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ship, Plane, DollarSign, Calendar, Package } from 'lucide-react';
import { useCurrentBatch, useUpdateFreightCost } from '@/hooks/useCargoBatches';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BatchFreightCostCardProps {
  cargoType?: 'air' | 'sea';
}

export function BatchFreightCostCard({ cargoType = 'air' }: BatchFreightCostCardProps) {
  const { data: batch, isLoading } = useCurrentBatch(cargoType);
  const updateFreightCost = useUpdateFreightCost();
  const [freightAmount, setFreightAmount] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveFreight = async () => {
    if (!batch) return;
    
    const amount = parseFloat(freightAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    await updateFreightCost.mutateAsync({
      batchId: batch.id,
      amount,
      currency: 'USD',
    });

    setIsEditing(false);
    setFreightAmount('');
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!batch) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No active batch for this week.</p>
          <p className="text-xs mt-1">Create a shipment to start a new batch.</p>
        </CardContent>
      </Card>
    );
  }

  const Icon = cargoType === 'sea' ? Ship : Plane;

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-heading text-base">
                {cargoType === 'sea' ? 'Sea Cargo' : 'Air Cargo'} Batch
              </CardTitle>
              <CardDescription className="text-xs">
                {batch.batch_number}
              </CardDescription>
            </div>
          </div>
          <Badge variant={batch.status === 'open' ? 'default' : 'secondary'}>
            {batch.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>
            Week of {format(new Date(batch.arrival_week_start), 'MMM d')} - {format(new Date(batch.arrival_week_end), 'MMM d, yyyy')}
          </span>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Freight Cost to Tanzania
            </Label>
            {batch.freight_cost !== null && !isEditing && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFreightAmount(batch.freight_cost?.toString() || '');
                  setIsEditing(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>

          {batch.freight_cost !== null && !isEditing ? (
            <div className="text-2xl font-bold text-primary">
              ${batch.freight_cost.toLocaleString()}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={freightAmount}
                  onChange={(e) => setFreightAmount(e.target.value)}
                  className="pl-7"
                  min="0"
                  step="0.01"
                />
              </div>
              <Button 
                onClick={handleSaveFreight}
                disabled={updateFreightCost.isPending}
                size="sm"
              >
                {updateFreightCost.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
              {isEditing && (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setFreightAmount('');
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Enter the total shipping cost for this week's {cargoType} cargo batch.
        </p>
      </CardContent>
    </Card>
  );
}
