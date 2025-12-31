import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ParcelWithShipment {
  id: string;
  barcode: string;
  description: string | null;
  weight_kg: number;
  picked_up_at: string | null;
  shipment: {
    id: string;
    tracking_number: string;
    status: string;
    customer: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
    } | null;
  } | null;
  // Approval status for parcel release
  approvalStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  approvalId?: string;
}

interface CheckoutResult {
  success: boolean;
  parcel?: ParcelWithShipment;
  error?: string;
  requiresApproval?: boolean;
  approvalPending?: boolean;
}

export function useParcelCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [scannedParcel, setScannedParcel] = useState<ParcelWithShipment | null>(null);
  const [recentCheckouts, setRecentCheckouts] = useState<ParcelWithShipment[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const lookupParcel = useCallback(async (barcodeInput: string): Promise<CheckoutResult> => {
    setIsLoading(true);
    
    let barcodeToSearch = barcodeInput.trim();
    
    // Check if the scanned value is JSON (from a QR code with embedded data)
    if (barcodeToSearch.startsWith('{') && barcodeToSearch.endsWith('}')) {
      try {
        const parsedData = JSON.parse(barcodeToSearch);
        // Extract barcode from common field names
        barcodeToSearch = parsedData.BARCODE || parsedData.barcode || 
                          parsedData.TRACKING || parsedData.tracking ||
                          parsedData.CODE || parsedData.code || barcodeToSearch;
      } catch {
        // Not valid JSON, use as-is
      }
    }
    
    try {
      // Use ilike for case-insensitive matching
      const { data, error } = await supabase
        .from('parcels')
        .select(`
          id,
          barcode,
          description,
          weight_kg,
          picked_up_at,
          shipment:shipments(
            id,
            tracking_number,
            status,
            customer:customers(
              id,
              name,
              phone,
              email
            )
          )
        `)
        .ilike('barcode', barcodeToSearch)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { success: false, error: 'Parcel not found. Please check the barcode.' };
      }

      // Check for existing approval request for this parcel
      const { data: approvalData } = await supabase
        .from('approval_requests')
        .select('id, status')
        .eq('parcel_id', data.id)
        .eq('approval_type', 'parcel_release')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let approvalStatus: 'none' | 'pending' | 'approved' | 'rejected' = 'none';
      let approvalId: string | undefined;

      if (approvalData) {
        approvalStatus = approvalData.status as 'pending' | 'approved' | 'rejected';
        approvalId = approvalData.id;
      }

      const parcel: ParcelWithShipment = {
        ...(data as unknown as ParcelWithShipment),
        approvalStatus,
        approvalId,
      };
      
      setScannedParcel(parcel);
      return { success: true, parcel };
    } catch (error: any) {
      console.error('Error looking up parcel:', error);
      return { success: false, error: error.message || 'Failed to lookup parcel' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const releaseParcel = useCallback(async (parcelId: string): Promise<CheckoutResult> => {
    if (!user?.id) {
      return { success: false, error: 'You must be logged in to release parcels' };
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('parcels')
        .update({
          picked_up_at: new Date().toISOString(),
          picked_up_by: user.id,
        })
        .eq('id', parcelId)
        .select(`
          id,
          barcode,
          description,
          weight_kg,
          picked_up_at,
          shipment:shipments(
            id,
            tracking_number,
            status,
            customer:customers(
              id,
              name,
              phone,
              email
            )
          )
        `)
        .single();

      if (error) throw error;

      const parcel = data as unknown as ParcelWithShipment;
      
      // Add to recent checkouts
      setRecentCheckouts(prev => [parcel, ...prev.slice(0, 9)]);
      setScannedParcel(null);

      toast({
        title: 'Parcel Released',
        description: `Parcel ${parcel.barcode} has been released to customer.`,
      });

      return { success: true, parcel };
    } catch (error: any) {
      console.error('Error releasing parcel:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to release parcel',
        variant: 'destructive',
      });
      return { success: false, error: error.message || 'Failed to release parcel' };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  const clearScannedParcel = useCallback(() => {
    setScannedParcel(null);
  }, []);

  return {
    isLoading,
    scannedParcel,
    recentCheckouts,
    lookupParcel,
    releaseParcel,
    clearScannedParcel,
  };
}
