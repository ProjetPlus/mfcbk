import { useEffect, useState } from "react";
import { CloudUpload, RefreshCw, ScrollText, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQueueStats, getSyncLog, clearSyncLog, onSyncEvent, type SyncLogEntry } from "@/lib/offline";
import { useOnlineStatus } from "@/lib/online";
import { toast } from "sonner";

export function SyncQueueWidget() {
  const { online, syncing, syncNow } = useOnlineStatus();
  const [stats, setStats] = useState(getQueueStats());
  const [log, setLog] = useState<SyncLogEntry[]>(getSyncLog());
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setStats(getQueueStats()), 2000);
    const off = onSyncEvent(() => { setStats(getQueueStats()); setLog(getSyncLog()); });
    return () => { clearInterval(id); off(); };
  }, []);

  const handleSync = async () => {
    const n = await syncNow();
    setStats(getQueueStats());
    if (n > 0) toast.success(`${n} opération(s) synchronisée(s)`);
    else toast.info("Aucune opération en attente");
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CloudUpload className="h-4 w-4 text-accent" /> File de synchronisation
        </CardTitle>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={!online || syncing || stats.total === 0}>
          {syncing ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <CloudUpload className="h-3 w-3 mr-1" />}
          Synchroniser
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="En attente" value={stats.total} />
          <Stat label="Avec retries" value={stats.withRetries} />
          <Stat label="Plus ancien" value={stats.oldest ? new Date(stats.oldest).toLocaleTimeString() : "—"} />
        </div>
        {stats.total > 0 && (
          <>
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1">Par opération</div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-success/10 text-success">Insert: {stats.byOp.insert}</span>
                <span className="px-2 py-1 rounded bg-warning/10 text-warning">Update: {stats.byOp.update}</span>
                <span className="px-2 py-1 rounded bg-destructive/10 text-destructive">Delete: {stats.byOp.delete}</span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1">Par table</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(stats.byTable).map(([t, n]) => (
                  <span key={t} className="px-2 py-1 rounded bg-secondary">{t}: {n}</span>
                ))}
              </div>
            </div>
          </>
        )}
        {stats.total === 0 && <p className="text-xs text-muted-foreground">Aucune opération en attente. Tout est synchronisé.</p>}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-2 rounded border border-border/50">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
