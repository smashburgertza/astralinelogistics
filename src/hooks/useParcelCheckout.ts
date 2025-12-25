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
}

interface CheckoutResult {
  success: boolean;
  parcel?: ParcelWithShipment;
  error?: string;
}

export function useParcelCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [scannedParcel, setScannedParcel] = useState<ParcelWithShipment | null>(null);
  const [recentCheckouts, setRecentCheckouts] = useState<ParcelWithShipment[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const lookupParcel = useCallback(async (barcode: string): Promise<CheckoutResult> => {
    setIsLoading(true);
    try {
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
        .eq('barcode', barcode.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { success: false, error: 'Parcel not found. Please check the barcode.' };
      }

      const parcel = data as unknown as ParcelWithShipment;
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
