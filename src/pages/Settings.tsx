import { useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/db/useDb";
import { RealtimeDiagnostics } from "@/components/RealtimeDiagnostics";
import { toast } from "sonner";

function FieldRow({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-10" />
    </div>
  );
}

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const getValue = (key: string, defaultVal: string) => {
    if (key in form) return form[key];
    return (settings as any)?.[key] ?? defaultVal;
  };

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes: Record<string, any> = {};
      if ("association_name" in form) changes.association_name = form.association_name;
      if ("initials" in form) changes.initials = form.initials;
      if ("phone" in form) changes.phone = form.phone;
      if ("contribution_amount" in form) changes.contribution_amount = Number(form.contribution_amount);
      if ("adhesion_fee" in form) changes.adhesion_fee = Number(form.adhesion_fee);
      if ("principal_payout" in form) changes.principal_payout = Number(form.principal_payout);
      if ("secondary_payout" in form) changes.secondary_payout = Number(form.secondary_payout);
      if ("secondary_retained" in form) changes.secondary_retained = Number(form.secondary_retained);
      
      if (Object.keys(changes).length > 0) {
        await updateSettings(changes);
        toast.success("Paramètres enregistrés");
        setForm({});
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  // Allow rendering offline even without settings (show diagnostic)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuration de l'association</p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-accent" /> Association</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Nom de l'association" value={getValue("association_name", "")} onChange={(v) => handleChange("association_name", v)} />
          <FieldRow label="Initiales (ID membres)" value={getValue("initials", "")} onChange={(v) => handleChange("initials", v)} />
          <FieldRow label="Numéro de téléphone officiel" value={getValue("phone", "")} onChange={(v) => handleChange("phone", v)} />
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-accent" /> Montants financiers (FCFA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Cotisation par personne couverte" value={getValue("contribution_amount", "1000")} onChange={(v) => handleChange("contribution_amount", v)} type="number" />
          <FieldRow label="Droit d'adhésion" value={getValue("adhesion_fee", "10000")} onChange={(v) => handleChange("adhesion_fee", v)} type="number" />
          <FieldRow label="Versement décès principal" value={getValue("principal_payout", "300000")} onChange={(v) => handleChange("principal_payout", v)} type="number" />
          <FieldRow label="Versement décès secondaire" value={getValue("secondary_payout", "250000")} onChange={(v) => handleChange("secondary_payout", v)} type="number" />
          <FieldRow label="Retenue décès secondaire" value={getValue("secondary_retained", "50000")} onChange={(v) => handleChange("secondary_retained", v)} type="number" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <RealtimeDiagnostics />
    </div>
  );
};

export default SettingsPage;
