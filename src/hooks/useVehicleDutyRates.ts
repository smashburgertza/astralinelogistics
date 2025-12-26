import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleDutyRate {
  id: string;
  rate_key: string;
  rate_name: string;
  rate_type: 'percentage' | 'fixed';
  rate_value: number;
  applies_to: string;
  engine_cc_min: number | null;
  engine_cc_max: number | null;
  vehicle_age_min: number | null;
  vehicle_category: string | null;
  display_order: number;
  is_active: boolean;
  description: string | null;
}

export interface DutyCalculation {
  importDuty: number;
  exciseDuty: number;
  vat: number;
  oldVehicleFee: number;
  registrationFees: number;
  totalDuties: number;
  breakdown: { name: string; amount: number; rate?: string }[];
}

export function useVehicleDutyRates() {
  const { data: dutyRates = [], isLoading } = useQuery({
    queryKey: ['vehicle-duty-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_duty_rates')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as VehicleDutyRate[];
    },
  });

  const calculateDuties = (
    cifValue: number, // CIF value in TZS
    engineCc?: number,
    vehicleYear?: number,
    isUtility: boolean = false
  ): DutyCalculation => {
    const breakdown: { name: string; amount: number; rate?: string }[] = [];
    
    // 1. Import Duty (25% of CIF)
    const importDutyRate = dutyRates.find(r => r.rate_key === 'import_duty');
    const importDuty = importDutyRate 
      ? (cifValue * importDutyRate.rate_value / 100) 
      : (cifValue * 0.25);
    
    breakdown.push({ 
      name: 'Import Duty', 
      amount: importDuty, 
      rate: `${importDutyRate?.rate_value || 25}%` 
    });

    // 2. Excise Duty (based on engine CC)
    let exciseDuty = 0;
    let exciseRate = 0;
    
    if (engineCc) {
      const exciseRates = dutyRates.filter(r => r.rate_key.startsWith('excise_duty_'));
      const applicableExcise = exciseRates.find(r => {
        const min = r.engine_cc_min || 0;
        const max = r.engine_cc_max || Infinity;
        return engineCc >= min && engineCc <= max;
      });
      
      if (applicableExcise) {
        exciseRate = applicableExcise.rate_value;
        exciseDuty = cifValue * exciseRate / 100;
        breakdown.push({ 
          name: `Excise Duty (${engineCc}cc)`, 
          amount: exciseDuty, 
          rate: `${exciseRate}%` 
        });
      }
    } else {
      // Default to middle tier if engine CC unknown
      exciseDuty = cifValue * 0.05;
      breakdown.push({ 
        name: 'Excise Duty (est.)', 
        amount: exciseDuty, 
        rate: '5%' 
      });
    }

    // 3. Old vehicle surcharge (8+ years)
    let oldVehicleFee = 0;
    if (vehicleYear) {
      const currentYear = new Date().getFullYear();
      const vehicleAge = currentYear - vehicleYear;
      
      if (vehicleAge >= 8) {
        const oldVehicleRate = isUtility 
          ? dutyRates.find(r => r.rate_key === 'old_vehicle_utility')
          : dutyRates.find(r => r.rate_key === 'old_vehicle_non_utility');
        
        const rate = oldVehicleRate?.rate_value || (isUtility ? 5 : 25);
        oldVehicleFee = cifValue * rate / 100;
        
        breakdown.push({ 
          name: `Old Vehicle Fee (${vehicleAge}yrs)`, 
          amount: oldVehicleFee, 
          rate: `${rate}%` 
        });
      }
    }

    // 4. Dutiable value for VAT calculation
    const dutiableValue = cifValue + importDuty + exciseDuty + oldVehicleFee;
    
    // 5. VAT (18% on dutiable value)
    const vatRate = dutyRates.find(r => r.rate_key === 'vat');
    const vat = vatRate 
      ? (dutiableValue * vatRate.rate_value / 100) 
      : (dutiableValue * 0.18);
    
    breakdown.push({ 
      name: 'VAT', 
      amount: vat, 
      rate: `${vatRate?.rate_value || 18}%` 
    });

    // 6. Fixed registration fees
    let registrationFees = 0;
    const regFee = dutyRates.find(r => r.rate_key === 'registration_fee');
    const plateFee = dutyRates.find(r => r.rate_key === 'plate_number_fee');
    
    if (regFee && regFee.rate_type === 'fixed') {
      registrationFees += regFee.rate_value;
      breakdown.push({ name: regFee.rate_name, amount: regFee.rate_value });
    }
    if (plateFee && plateFee.rate_type === 'fixed') {
      registrationFees += plateFee.rate_value;
      breakdown.push({ name: plateFee.rate_name, amount: plateFee.rate_value });
    }

    const totalDuties = importDuty + exciseDuty + oldVehicleFee + vat + registrationFees;

    return {
      importDuty,
      exciseDuty,
      vat,
      oldVehicleFee,
      registrationFees,
      totalDuties,
      breakdown,
    };
  };

  return {
    dutyRates,
    isLoading,
    calculateDuties,
  };
}
