// Simplified Agent Upload Form - Just cargo data, no pricing/invoicing
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, Plus, Trash2, Globe, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAgentAssignedRegions } from '@/hooks/useAgentRegions';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGetOrCreateBatch } from '@/hooks/useCargoBatches';
import { Database } from '@/integrations/supabase/types';

type AgentRegion = Database['public']['Enums']['agent_region'];

// Generate a unique barcode for each parcel
const generateBarcode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PKG-${timestamp}-${random}`;
};

// Generate tracking number
const generateTrackingNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AST${year}${month}${day}${random}`;
};

interface CargoLine {
  id: string;
  customer_name: string;
  description: string;
  weight_kg: number;
}

export function SimpleUploadForm() {
  const { user, getRegion } = useAuth();
  const defaultRegion = getRegion();
  const { data: assignedRegions = [], isLoading: regionsLoading } = useAgentAssignedRegions();
  const getOrCreateBatch = useGetOrCreateBatch();

  const [selectedRegion, setSelectedRegion] = useState<AgentRegion | undefined>(defaultRegion);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [lines, setLines] = useState<CargoLine[]>([
    { id: crypto.randomUUID(), customer_name: '', description: '', weight_kg: 0 }
  ]);

  // Set default region when assigned regions load
  useEffect(() => {
    if (assignedRegions.length > 0 && !selectedRegion) {
      setSelectedRegion(assignedRegions[0].region_code);
    } else if (defaultRegion && !selectedRegion) {
      setSelectedRegion(defaultRegion);
    }
  }, [assignedRegions, defaultRegion, selectedRegion]);

  const hasMultipleRegions = assignedRegions.length > 1;
  const currentRegionInfo = assignedRegions.find(r => r.region_code === selectedRegion);

  // Calculate totals
  const totalWeight = lines.reduce((sum, line) => sum + (line.weight_kg || 0), 0);
  const validLines = lines.filter(l => l.customer_name.trim() && l.weight_kg > 0);

  // Add new line
  const addLine = () => {
    setLines([...lines, { 
      id: crypto.randomUUID(), 
      customer_name: '',
      description: '', 
      weight_kg: 0 
    }]);
  };

  // Remove line
  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  // Update line
  const updateLine = (id: string, field: keyof CargoLine, value: string | number) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // Reset form
  const resetForm = () => {
    setLines([{ id: crypto.randomUUID(), customer_name: '', description: '', weight_kg: 0 }]);
    setSubmitSuccess(false);
  };

  // Submit manifest
  const onSubmit = async () => {
    if (validLines.length === 0) {
      toast.error('Please add at least one line with customer name and weight');
      return;
    }

    if (!selectedRegion) {
      toast.error('Please select a region');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get or create batch for this week
      let batchId: string | null = null;
      try {
        batchId = await getOrCreateBatch.mutateAsync({
          originRegion: selectedRegion,
          cargoType: 'air',
        });
      } catch (batchError) {
        console.error('Failed to create batch:', batchError);
      }

      // Create shipments for each line (status: collected, no invoice yet)
      for (const line of validLines) {
        const trackingNumber = generateTrackingNumber();
        const parcelBarcode = generateBarcode();

        // Create shipment - minimal data, pricing will be added by admin
        const { data: shipment, error: shipmentError } = await supabase
          .from('shipments')
          .insert({
            customer_name: line.customer_name.trim(),
            origin_region: selectedRegion,
            total_weight_kg: line.weight_kg,
            description: line.description || null,
            created_by: user?.id,
            agent_id: user?.id,
            tracking_number: trackingNumber,
            batch_id: batchId,
            status: 'collected',
            is_draft: false,
            // No pricing fields - admin will set these
          })
          .select()
          .single();

        if (shipmentError) throw shipmentError;

        // Create parcel
        await supabase.from('parcels').insert({
          shipment_id: shipment.id,
          barcode: parcelBarcode,
          weight_kg: line.weight_kg,
          description: line.description || line.customer_name,
        });
      }

      toast.success(`${validLines.length} shipment(s) uploaded successfully!`);
      setSubmitSuccess(true);

    } catch (error: any) {
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (submitSuccess) {
    return (
      <Card className="shadow-lg border-0 max-w-2xl mx-auto">
        <CardContent className="p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold">Manifest Uploaded!</h2>
            <p className="text-muted-foreground mt-2">
              {validLines.length} shipment(s) have been submitted for processing.
              <br />
              The admin team will review and apply pricing.
            </p>
          </div>
          <Button onClick={resetForm} size="lg">
            Upload More Cargo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Card */}
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-heading text-lg">Upload Cargo Manifest</CardTitle>
                <CardDescription>
                  Add customer shipments - pricing handled by admin
                </CardDescription>
              </div>
            </div>
            
            {/* Region Selector */}
            <div className="flex items-center gap-4">
              {regionsLoading ? (
                <Badge variant="outline" className="gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </Badge>
              ) : hasMultipleRegions ? (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <Select
                    value={selectedRegion}
                    onValueChange={(value) => setSelectedRegion(value as AgentRegion)}
                  >
                    <SelectTrigger className="w-[200px] bg-background">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedRegions.map((r) => (
                        <SelectItem key={r.region_code} value={r.region_code}>
                          <span className="flex items-center gap-2">
                            <span>{r.flag_emoji}</span>
                            <span>{r.region_name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : currentRegionInfo ? (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {currentRegionInfo.flag_emoji} {currentRegionInfo.region_name}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cargo Lines Table */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 p-4 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
            <div className="col-span-5">Customer Name</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-2 text-right">Weight (kg)</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y">
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 p-3 items-center group hover:bg-muted/30">
                {/* Customer Name */}
                <div className="col-span-5">
                  <Input
                    placeholder="Customer name..."
                    value={line.customer_name}
                    onChange={(e) => updateLine(line.id, 'customer_name', e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Description */}
                <div className="col-span-4">
                  <Input
                    placeholder="e.g., Electronics, Clothing..."
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
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
                    onChange={(e) => updateLine(line.id, 'weight_kg', parseFloat(e.target.value) || 0)}
                    className="h-10 text-right"
                  />
                </div>

                {/* Remove */}
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Line Button */}
          <div className="p-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Line
            </Button>
          </div>

          {/* Totals Row */}
          <div className="grid grid-cols-12 gap-2 p-4 bg-muted/50 border-t font-medium">
            <div className="col-span-5 text-muted-foreground">
              {validLines.length} shipment{validLines.length !== 1 ? 's' : ''} ready
            </div>
            <div className="col-span-4"></div>
            <div className="col-span-2 text-right">
              <span className="text-muted-foreground text-sm">Total:</span>{' '}
              <span className="font-bold">{totalWeight.toFixed(2)} kg</span>
            </div>
            <div className="col-span-1"></div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={isSubmitting || validLines.length === 0}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Manifest ({validLines.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
