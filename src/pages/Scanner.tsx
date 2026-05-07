import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { Camera, StopCircle, AlertCircle, Keyboard, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Scanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lookupLockRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [searching, setSearching] = useState(false);

  const stopScanner = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const lookupMember = async (code: string) => {
    if (lookupLockRef.current) return;
    lookupLockRef.current = true;
    setSearching(true);
    const releaseSoon = (ms = 1500) => setTimeout(() => { lookupLockRef.current = false; }, ms);
    try {
      // 2G-friendly: race the network call against an 8s timeout so a stalled
      // request never freezes the scanner. On timeout, re-arm and toast.
      const query = supabase
        .from("members")
        .select("*")
        .eq("member_id", code.trim())
        .maybeSingle();
      const result: any = await Promise.race([
        query,
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
      ]);
      const member = result?.data;

      if (member) {
        toast.success(`Membre trouvé : ${member.last_name} ${member.first_name}`);
        stopScanner();
        navigate(`/members/${member.id}`);
      } else {
        toast.error("Membre non trouvé", { description: code });
        releaseSoon();
      }
    } catch (err: any) {
      const isTimeout = err?.message === "timeout";
      toast.error(isTimeout ? "Réseau lent — réessayez" : "Erreur de recherche", {
        description: isTimeout ? code : err?.message,
      });
      releaseSoon(800);
    }
    setSearching(false);
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code && code.data) {
      setLastResult(code.data);
      lookupMember(code.data);
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  // IMPORTANT : appelé directement dans le onClick (geste utilisateur)
  const startScanner = async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Votre navigateur ne supporte pas l'accès à la caméra.");
      return;
    }
    if (!window.isSecureContext) {
      setError("La caméra nécessite HTTPS. Ouvrez l'application en HTTPS ou via localhost.");
      return;
    }

    try {
      // Demander la caméra DIRECTEMENT dans le geste
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);

      // Attacher au video element (créé par le rendu conditionnel)
      await new Promise((r) => setTimeout(r, 50));
      const video = videoRef.current;
      if (!video) {
        stopScanner();
        setError("Élément vidéo introuvable.");
        return;
      }
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.muted = true;
      video.srcObject = stream;
      await video.play();

      lookupLockRef.current = false;
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Permission refusée. Autorisez la caméra dans les paramètres du navigateur.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("Aucune caméra détectée sur cet appareil.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("La caméra est utilisée par une autre application.");
      } else if (name === "OverconstrainedError") {
        // Retry sans contrainte facingMode
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream;
          setScanning(true);
          await new Promise((r) => setTimeout(r, 50));
          const video = videoRef.current;
          if (video) {
            video.setAttribute("playsinline", "true");
            video.muted = true;
            video.srcObject = stream;
            await video.play();
            lookupLockRef.current = false;
            rafRef.current = requestAnimationFrame(tick);
          }
        } catch (e: any) {
          setError(e?.message || "Impossible d'accéder à la caméra.");
        }
      } else {
        setError(err?.message || "Impossible d'accéder à la caméra.");
      }
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      toast.error("Veuillez saisir un code");
      return;
    }
    await lookupMember(manualCode);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-bordeaux-dark">Scanner QR Code</h1>
        <p className="text-sm text-muted-foreground mt-1">Scannez la carte d'un membre ou saisissez le code</p>
      </div>

      {!manualMode && (
        <>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-square bg-foreground/5 flex flex-col items-center justify-center gap-4 relative">
                {scanning ? (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-56 h-56 border-2 border-accent rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                    </div>
                  </>
                ) : (
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
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {!scanning ? (
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={startScanner}
              >
                <Camera className="h-4 w-4 mr-2" /> Activer la caméra
              </Button>
            ) : (
              <Button variant="outline" onClick={stopScanner}>
                <StopCircle className="h-4 w-4 mr-2" /> Arrêter le scanner
              </Button>
            )}
            <Button variant="outline" onClick={() => { stopScanner(); setManualMode(true); setError(""); }}>
              <Keyboard className="h-4 w-4 mr-2" /> Saisir manuellement
            </Button>
          </div>
        </>
      )}

      {manualMode && (
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-code" className="text-sm font-semibold">
                Saisir manuellement le code
              </Label>
              <Input
                id="manual-code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Ex: A-26-001"
                className="h-11 text-center font-mono text-lg tracking-wider"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
              />
              <p className="text-xs text-muted-foreground">
                Format : Initiales-AA-NNN (ex: A-26-001)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleManualSubmit}
                disabled={searching}
              >
                <Search className="h-4 w-4 mr-2" /> {searching ? "Recherche..." : "Rechercher"}
              </Button>
              <Button variant="outline" onClick={() => { setManualMode(false); setManualCode(""); }}>
                <Camera className="h-4 w-4 mr-2" /> Scanner
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
