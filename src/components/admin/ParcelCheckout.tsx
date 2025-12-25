import { useState, useRef, useEffect } from 'react';
import { ScanLine, Package, User, Phone, Mail, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useParcelCheckout } from '@/hooks/useParcelCheckout';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function ParcelCheckout() {
  const [barcode, setBarcode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading, scannedParcel, recentCheckouts, lookupParcel, releaseParcel, clearScannedParcel } = useParcelCheckout();
  const [error, setError] = useState<string | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setError(null);
    const result = await lookupParcel(barcode.trim());
    
    if (!result.success) {
      setError(result.error || 'Failed to lookup parcel');
    }
    setBarcode('');
    inputRef.current?.focus();
  };

  const handleRelease = async () => {
    if (!scannedParcel) return;
    
    const result = await releaseParcel(scannedParcel.id);
    if (result.success) {
      inputRef.current?.focus();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'in_transit': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'collected': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'delivered': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Input */}
      <Card className="border-2 border-dashed border-accent/50 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-accent/10">
              <ScanLine className="h-5 w-5 text-accent" />
            </div>
            Scan Parcel Barcode
          </CardTitle>
          <CardDescription>
            Scan or enter the parcel barcode to look up and release to customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex gap-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Enter or scan barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="text-lg h-12 font-mono"
              autoComplete="off"
              autoFocus
            />
            <Button type="submit" size="lg" disabled={isLoading || !barcode.trim()}>
              {isLoading ? 'Scanning...' : 'Lookup'}
            </Button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanned Parcel Details */}
      {scannedParcel && (
        <Card className={cn(
          "border-2 transition-all duration-300",
          scannedParcel.picked_up_at 
            ? "border-amber-500/50 bg-amber-500/5" 
            : "border-emerald-500/50 bg-emerald-500/5"
        )}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Parcel Found
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={clearScannedParcel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parcel Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Barcode</p>
                  <p className="font-mono text-lg font-semibold">{scannedParcel.barcode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{scannedParcel.description || 'No description'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <p className="font-medium">{scannedParcel.weight_kg} kg</p>
                </div>
              </div>

              {/* Shipment & Customer Info */}
              {scannedParcel.shipment && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-mono font-semibold">{scannedParcel.shipment.tracking_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shipment Status</p>
                    <Badge variant="outline" className={getStatusColor(scannedParcel.shipment.status)}>
                      {scannedParcel.shipment.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {scannedParcel.shipment.customer && (
                    <div className="p-4 rounded-lg bg-background border space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{scannedParcel.shipment.customer.name}</span>
                      </div>
                      {scannedParcel.shipment.customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{scannedParcel.shipment.customer.phone}</span>
                        </div>
                      )}
                      {scannedParcel.shipment.customer.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{scannedParcel.shipment.customer.email}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {scannedParcel.picked_up_at ? (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700">Already Released</p>
                  <p className="text-sm text-amber-600">
                    This parcel was released on {format(new Date(scannedParcel.picked_up_at), 'PPp')}
                  </p>
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleRelease} 
                size="lg" 
                className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                disabled={isLoading}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Release Parcel to Customer
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Checkouts */}
      {recentCheckouts.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Releases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCheckouts.map((parcel) => (
                <div 
                  key={parcel.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-mono font-medium">{parcel.barcode}</p>
                      <p className="text-sm text-muted-foreground">
                        {parcel.shipment?.customer?.name || 'Unknown customer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {parcel.picked_up_at && format(new Date(parcel.picked_up_at), 'HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
