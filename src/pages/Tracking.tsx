import { useState } from 'react';
import { Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [result, setResult] = useState<null | 'not_found'>(null);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber) {
      setResult('not_found');
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Track Your Shipment</h1>
          <p className="text-muted-foreground">
            Enter your tracking number to see real-time status updates.
          </p>
        </div>

        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Shipment Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter tracking number (e.g., AST241224ABC123)"
                  className="pl-10"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                />
              </div>
              <Button type="submit">Track</Button>
            </form>

            {result === 'not_found' && (
              <div className="mt-6 p-4 bg-muted rounded-lg text-center">
                <p className="text-muted-foreground">No shipment found with this tracking number.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
