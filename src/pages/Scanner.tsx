import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, Camera, StopCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Scanner = () => {
  const navigate = useNavigate();
  const html5QrCodeRef = useRef<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState("");

  const startScanner = async () => {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          setLastResult(decodedText);
          const { data: member } = await supabase
            .from("members")
            .select("*")
            .eq("member_id", decodedText)
            .single();
          
          if (member) {
            toast.success(`Membre trouvé : ${member.last_name} ${member.first_name}`);
            await stopScanner();
            navigate(`/members/${member.id}`);
          } else {
            toast.error("Membre non trouvé", { description: decodedText });
          }
        },
        () => {}
      );
      setScanning(true);
    } catch (err: any) {
      setError(err?.message || "Impossible d'accéder à la caméra");
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-bordeaux-dark">Scanner QR Code</h1>
        <p className="text-sm text-muted-foreground mt-1">Scannez la carte d'un membre pour l'identifier</p>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-square bg-foreground/5 flex flex-col items-center justify-center gap-4 relative">
            <div id="qr-reader" className="w-full h-full" style={{ display: scanning ? "block" : "none" }} />
            {!scanning && (
              <>
                <div className="w-48 h-48 border-2 border-accent rounded-2xl relative">
                  <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-lg" />
                  <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-lg" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-lg" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-lg" />
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Camera className="h-5 w-5" />
                  <span className="text-sm">Positionnez le QR code dans le cadre</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-destructive-light rounded-lg border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-center gap-3">
        {!scanning ? (
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={startScanner}>
            <Camera className="h-4 w-4 mr-2" /> Activer la caméra
          </Button>
        ) : (
          <Button variant="outline" onClick={stopScanner}>
            <StopCircle className="h-4 w-4 mr-2" /> Arrêter le scanner
          </Button>
        )}
      </div>

      {lastResult && (
        <div className="p-3 bg-secondary/50 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">Dernier code scanné :</p>
          <p className="text-sm font-mono font-semibold text-foreground">{lastResult}</p>
        </div>
      )}
    </div>
  );
};

export default Scanner;
