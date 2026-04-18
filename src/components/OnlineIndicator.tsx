import { Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/online";
import { toast } from "sonner";

export function OnlineIndicator() {
  const { online, queueCount, syncing, syncNow } = useOnlineStatus();

  const handleSync = async () => {
    const n = await syncNow();
    if (n > 0) toast.success(`${n} opération(s) synchronisée(s)`);
    else toast.info("Aucune opération en attente");
  };

  return (
    <div className="flex items-center gap-1.5">
      {online ? (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-semibold uppercase tracking-wider border border-success/20">
          <Wifi className="h-3 w-3" /> En ligne
        </span>
      ) : (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold uppercase tracking-wider border border-destructive/20 animate-pulse">
          <WifiOff className="h-3 w-3" /> Hors ligne
        </span>
      )}
      {queueCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={!online || syncing}
          className="h-7 px-2 text-[10px] gap-1 border-warning/40 text-warning hover:bg-warning/10"
          title={online ? "Synchroniser maintenant" : "Synchronisation à la reconnexion"}
        >
          {syncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CloudUpload className="h-3 w-3" />}
          {queueCount}
        </Button>
      )}
    </div>
  );
}
