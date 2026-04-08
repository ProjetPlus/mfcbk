import { useState, useRef } from "react";
import { Download, Upload, AlertTriangle, Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportAllData, importAllData } from "@/db/database";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Sync = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campbethel_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export réussi", { description: "Fichier JSON téléchargé" });
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const result = await importAllData(text);
      if (result.success) {
        toast.success("Import réussi", { description: result.message });
      } else {
        toast.error("Erreur d'import", { description: result.message });
      }
    } catch {
      toast.error("Fichier invalide");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearDatabase = async () => {
    try {
      await supabase.from("contributions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("deaths").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      const { data: treasuryRow } = await supabase.from("treasury").select("id").limit(1).single();
      if (treasuryRow) {
        await supabase.from("treasury").update({
          total_balance: 0,
          total_contributions_collected: 0,
          total_payouts: 0,
          retained_reserves: 0,
          pending_contributions: 0,
        }).eq("id", treasuryRow.id);
      }
      
      toast.success("Base de données vidée", { description: "Toutes les données ont été supprimées" });
      setShowClearConfirm(false);
    } catch {
      toast.error("Erreur lors du vidage");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Données & Sauvegarde</h1>
        <p className="text-sm text-muted-foreground mt-1">Export, import et gestion des données</p>
      </div>

      <Card className="border-accent/30 bg-or-light/50">
        <CardContent className="pt-6 pb-5 text-center">
          <Database className="h-8 w-8 text-accent mx-auto mb-2" />
          <p className="text-sm font-semibold">Base de données Cloud</p>
          <p className="text-xs text-muted-foreground mt-1">Les données sont synchronisées en temps réel</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-success" /> Exporter les données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Télécharger une sauvegarde complète au format JSON.</p>
            <Button className="w-full bg-success hover:bg-success/90 text-success-foreground" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Exporter en JSON
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-accent" /> Importer des données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Restaurer les données depuis un fichier JSON.</p>
            <Button
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="h-4 w-4 mr-2" /> {importing ? "Import en cours..." : "Importer un fichier JSON"}
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Zone dangereuse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Supprimer toutes les données (membres, décès, cotisations). Le compte admin sera conservé.</p>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setShowClearConfirm(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Vider la base de données
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Confirmer la suppression
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Toutes les données seront définitivement supprimées.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>Annuler</Button>
            <Button className="bg-destructive hover:bg-destructive/90" onClick={handleClearDatabase}>
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer tout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sync;
