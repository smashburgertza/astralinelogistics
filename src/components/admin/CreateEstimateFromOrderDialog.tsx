import { useState, useEffect } from 'react';
import { Calculator, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useCreateEstimate } from '@/hooks/useEstimates';
import { useRegions } from '@/hooks/useRegions';
import { useRegionPricing } from '@/hooks/useRegionPricing';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { toast } from 'sonner';
import { OrderRequest, OrderItem } from '@/hooks/useOrderRequests';

interface CreateEstimateFromOrderDialogProps {
  order: OrderRequest;
  items: OrderItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateEstimateFromOrderDialog({
  order,
  items,
  open,
  onOpenChange,
  onSuccess,
}: CreateEstimateFromOrderDialogProps) {
  const { data: regions } = useRegions();
  const { data: regionPricing } = useRegionPricing('air');
  const { data: exchangeRates } = useExchangeRates();
  const createEstimate = useCreateEstimate();

  // Calculate total weight from items
  const totalWeight = items.reduce((sum, item) => {
    return sum + (item.estimated_weight_kg || 0) * item.quantity;
  }, 0);

  const [originRegion, setOriginRegion] = useState<string>('');
  const [weightKg, setWeightKg] = useState(totalWeight.toFixed(2));
  const [ratePerKg, setRatePerKg] = useState('10');
  const [handlingFee, setHandlingFee] = useState(order.handling_fee.toString());
  const [productCost, setProductCost] = useState(order.total_product_cost.toString());
  const [purchaseFee, setPurchaseFee] = useState('0');
  const [validDays, setValidDays] = useState('7');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update rate when region changes
  useEffect(() => {
    if (originRegion && regionPricing) {
      const pricing = regionPricing.find(p => p.region === originRegion);
      if (pricing?.customer_rate_per_kg) {
        setRatePerKg(pricing.customer_rate_per_kg.toString());
      }
      if (pricing?.handling_fee) {
        setHandlingFee(pricing.handling_fee.toString());
      }
    }
  }, [originRegion, regionPricing]);

  // Calculate totals
  const weight = parseFloat(weightKg) || 0;
  const rate = parseFloat(ratePerKg) || 0;
  const handling = parseFloat(handlingFee) || 0;
  const product = parseFloat(productCost) || 0;
  const purchase = parseFloat(purchaseFee) || 0;

  const shippingSubtotal = weight * rate;
  const subtotal = shippingSubtotal + product;
  const total = subtotal + handling + purchase;

  const usdRate = exchangeRates?.find(r => r.currency_code === 'USD')?.rate_to_tzs || 2500;
  const totalInTZS = total * usdRate;

  const handleSubmit = async () => {
    if (!originRegion) {
      toast.error('Please select an origin region');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find or create customer by email
      let customerId: string;

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', order.customer_email)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone,
            address: order.customer_address,
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create estimate
      const estimate = await createEstimate.mutateAsync({
        customer_id: customerId,
        origin_region: originRegion,
        weight_kg: weight,
        rate_per_kg: rate,
        handling_fee: handling,
        currency: 'USD',
        notes: notes || `Order Request: ${order.id}`,
        valid_days: parseInt(validDays) || 7,
        estimate_type: 'purchase_shipping',
        product_cost: product,
        purchase_fee: purchase,
      });

      // Link estimate to order request
      await supabase
        .from('order_requests')
        .update({ 
          estimate_id: estimate.id,
          status: 'confirmed'
        })
        .eq('id', order.id);

      toast.success('Estimate created and sent to customer');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create estimate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Create Estimate
          </DialogTitle>
          <DialogDescription>
            Create an estimate for {order.customer_name} to approve before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Origin Region */}
          <div className="space-y-2">
            <Label htmlFor="region">Origin Region *</Label>
            <Select value={originRegion} onValueChange={setOriginRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select shipping origin" />
              </SelectTrigger>
              <SelectContent>
                {regions?.map((region) => (
                  <SelectItem key={region.id} value={region.code}>
                    {region.name} ({region.code.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Product Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productCost">Product Cost (USD)</Label>
              <Input
                id="productCost"
                type="number"
                step="0.01"
                value={productCost}
                onChange={(e) => setProductCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseFee">Purchase Fee (USD)</Label>
              <Input
                id="purchaseFee"
                type="number"
                step="0.01"
                value={purchaseFee}
                onChange={(e) => setPurchaseFee(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Shipping Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Est. Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate per kg (USD)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                value={ratePerKg}
                onChange={(e) => setRatePerKg(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="handling">Handling Fee (USD)</Label>
              <Input
                id="handling"
                type="number"
                step="0.01"
                value={handlingFee}
                onChange={(e) => setHandlingFee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validDays">Valid for (days)</Label>
              <Input
                id="validDays"
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product Cost</span>
              <span>${product.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Purchase Fee</span>
              <span>${purchase.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping ({weight.toFixed(2)} kg × ${rate.toFixed(2)})</span>
              <span>${shippingSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Handling Fee</span>
              <span>${handling.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>TZS Equivalent</span>
              <span>TZS {totalInTZS.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes for the customer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !originRegion}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create & Send Estimate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
