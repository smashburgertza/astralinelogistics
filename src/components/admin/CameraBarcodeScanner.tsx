import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraBarcodeScannerProps {
  onScan: (barcode: string) => void;
  isActive: boolean;
}

export function CameraBarcodeScanner({ onScan, isActive }: CameraBarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    // Get available cameras on mount
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices.map((d) => ({ id: d.id, label: d.label })));
          // Prefer back camera for mobile
          const backCameraIndex = devices.findIndex(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
          );
          if (backCameraIndex !== -1) {
            setCurrentCameraIndex(backCameraIndex);
          }
        }
      })
      .catch((err) => {
        console.error('Error getting cameras:', err);
        setError('Unable to access camera. Please ensure camera permissions are granted.');
      });

    return () => {
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (isActive && cameras.length > 0 && !isScanning) {
      startScanning();
    } else if (!isActive && isScanning) {
      stopScanning();
    }
  }, [isActive, cameras]);

  const startScanning = async () => {
    if (!containerRef.current || cameras.length === 0) return;

    try {
      setError(null);
      const scanner = new Html5Qrcode('camera-scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        cameras[currentCameraIndex].id,
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Debounce to prevent duplicate scans
          const now = Date.now();
          if (decodedText !== lastScannedRef.current || now - lastScanTimeRef.current > 2000) {
            lastScannedRef.current = decodedText;
            lastScanTimeRef.current = now;
            onScan(decodedText);
          }
        },
        () => {
          // Ignore scan errors (no barcode found in frame)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please check permissions.');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;

    await stopScanning();
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // Restart with new camera after a short delay
    setTimeout(() => {
      if (isActive) {
        startScanning();
      }
    }, 100);
  };

  const toggleScanning = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  if (cameras.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Camera className="h-8 w-8 mb-2 animate-pulse" />
        <p className="text-sm">Detecting cameras...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CameraOff className="h-8 w-8 mb-2" />
        <p className="text-sm text-center">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={startScanning}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Camera Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleScanning}
          className="gap-2"
        >
          {isScanning ? (
            <>
              <CameraOff className="h-4 w-4" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              Start Camera
            </>
          )}
        </Button>
        
        {cameras.length > 1 && isScanning && (
          <Button variant="ghost" size="sm" onClick={switchCamera} className="gap-2">
            <SwitchCamera className="h-4 w-4" />
            Switch
          </Button>
        )}
      </div>

      {/* Camera View */}
      <div 
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-black"
        style={{ minHeight: isScanning ? '300px' : '0' }}
      >
        <div id="camera-scanner-container" className="w-full" />
        
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scan line animation */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[110px] border-2 border-primary rounded-lg">
              <div className="absolute left-0 right-0 h-0.5 bg-primary animate-pulse" 
                   style={{ 
                     animation: 'scan-line 2s ease-in-out infinite',
                     top: '50%',
                   }} 
              />
            </div>
          </div>
        )}
      </div>

      {isScanning && (
        <p className="text-xs text-center text-muted-foreground">
          Position barcode within the frame
        </p>
      )}

      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(-20px); opacity: 0.5; }
          50% { transform: translateY(20px); opacity: 1; }
        }
        #camera-scanner-container video {
          width: 100% !important;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
