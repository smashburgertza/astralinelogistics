import { Package, Weight, MapPin, User, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

interface ParcelLabelProps {
  parcel: {
    barcode: string;
    weight_kg: number;
    description?: string;
  };
  shipmentInfo: {
    tracking_number: string;
    customer_name: string;
    customer_phone?: string;
    origin_region: string;
    created_at: string;
    parcel_index: number;
    total_parcels: number;
  };
}

export function ParcelLabel({ parcel, shipmentInfo }: ParcelLabelProps) {
  // Generate QR code data with all relevant parcel info
  const qrData = JSON.stringify({
    tracking: shipmentInfo.tracking_number,
    barcode: parcel.barcode,
    parcel: `${shipmentInfo.parcel_index}/${shipmentInfo.total_parcels}`,
    weight: parcel.weight_kg,
    origin: shipmentInfo.origin_region,
  });

  return (
    <div className="w-[4in] h-[6in] p-4 border-2 border-black bg-white text-black print:break-after-page">
      {/* Header */}
      <div className="border-b-2 border-black pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ASTRALINE</h1>
            <p className="text-xs text-gray-600">Global Shipping Solutions</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Parcel</p>
            <p className="text-lg font-bold">{shipmentInfo.parcel_index} of {shipmentInfo.total_parcels}</p>
          </div>
        </div>
      </div>

      {/* Tracking Number - Large */}
      <div className="bg-black text-white p-3 mb-3 text-center">
        <p className="text-xs mb-1">TRACKING NUMBER</p>
        <p className="text-2xl font-mono font-bold tracking-wider">{shipmentInfo.tracking_number}</p>
      </div>

      {/* QR Code Section */}
      <div className="border-2 border-dashed border-gray-400 p-4 mb-3">
        <div className="flex items-center gap-4">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <QRCodeSVG 
              value={qrData}
              size={100}
              level="M"
              includeMargin={false}
            />
          </div>
          
          {/* Parcel ID */}
          <div className="flex-1">
            <span className="text-xs font-semibold text-gray-600 block mb-1">PARCEL ID</span>
            <p className="font-mono text-xl font-bold tracking-wider">{parcel.barcode}</p>
            <p className="text-xs text-gray-500 mt-2">Scan QR for full details</p>
          </div>
        </div>
      </div>

      {/* Shipment Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="border border-gray-300 p-2 rounded">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Weight className="w-3 h-3" />
            <span className="text-xs">WEIGHT</span>
          </div>
          <p className="font-bold text-lg">{parcel.weight_kg} kg</p>
        </div>
        <div className="border border-gray-300 p-2 rounded">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <MapPin className="w-3 h-3" />
            <span className="text-xs">ORIGIN</span>
          </div>
          <p className="font-bold text-lg capitalize">{shipmentInfo.origin_region}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="border border-gray-300 p-3 rounded mb-3">
        <div className="flex items-center gap-1 text-gray-600 mb-2">
          <User className="w-3 h-3" />
          <span className="text-xs font-semibold">CUSTOMER</span>
        </div>
        <p className="font-bold text-lg">{shipmentInfo.customer_name}</p>
        {shipmentInfo.customer_phone && (
          <div className="flex items-center gap-1 text-gray-600 mt-1">
            <Phone className="w-3 h-3" />
            <span className="text-sm">{shipmentInfo.customer_phone}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {parcel.description && (
        <div className="border border-gray-300 p-2 rounded mb-3">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Package className="w-3 h-3" />
            <span className="text-xs">CONTENTS</span>
          </div>
          <p className="text-sm">{parcel.description}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-gray-300 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Created: {format(new Date(shipmentInfo.created_at), 'MMM d, yyyy HH:mm')}</span>
          <span>Handle with care</span>
        </div>
      </div>
    </div>
  );
}
