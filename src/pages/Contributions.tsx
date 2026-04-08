import { useState } from "react";
import { Coins, Check, X, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeaths, useContributions } from "@/db/useDb";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; className: string }> = {
  "payé": { label: "Payé", className: "bg-success-light text-success" },
  "non_payé": { label: "Non payé", className: "bg-destructive-light text-destructive" },
  partiel: { label: "Partiel", className: "bg-warning/10 text-warning" },
  "exonéré": { label: "Exonéré", className: "bg-primary/10 text-primary" },
};

const paymentMethods = [
  { value: "especes", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange", label: "Orange Money" },
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "moov", label: "Moov Money" },
];

const Contributions = () => {
  const { deaths } = useDeaths();
  const [selectedDeathId, setSelectedDeathId] = useState<string | null>(null);
  const [editContribution, setEditContribution] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [proofType, setProofType] = useState("");
  const [proofData, setProofData] = useState("");
  const [proofFile, setProofFile] = useState<string>("");

  const ongoingDeaths = deaths.filter(d => d.status === "en_cours");
  const activeDeathId = selectedDeathId ?? ongoingDeaths[0]?.id ?? undefined;

  const { contributions, updateContribution } = useContributions(activeDeathId);

  const editingContrib = contributions.find(c => c.id === editContribution);

  const openEdit = (contribId: string) => {
    const c = contributions.find(x => x.id === contribId);
    if (!c) return;
    setEditContribution(contribId);
    setPaymentMethod(c.payment_method);
    setAmount(String(c.amount || ""));
    setProofType(c.proof_type || "");
    setProofData(c.proof_data || "");
    setProofFile("");
  };

  const handleSave = async () => {
    if (!editContribution || !paymentMethod) return;
    const numAmount = Number(amount) || 0;
    const expected = editingContrib?.expected_amount ?? 0;
    let status: "payé" | "non_payé" | "partiel" | "exonéré" = "non_payé";
    if (numAmount >= expected) status = "payé";
    else if (numAmount > 0) status = "partiel";

    await updateContribution(editContribution, {
      amount: numAmount,
      payment_method: paymentMethod as any,
      status,
      date: new Date().toISOString().split("T")[0],
      proof_type: proofType || undefined,
      proof_data: proofFile || proofData || undefined,
    });

    toast.success("Cotisation enregistrée", { description: `${numAmount.toLocaleString("fr-FR")} FCFA — ${status}` });
    setEditContribution(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProofFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Cotisations</h1>
        <p className="text-sm text-muted-foreground mt-1">Suivi et enregistrement des cotisations par décès</p>
      </div>

      {ongoingDeaths.length > 1 && (
        <Select value={String(activeDeathId ?? "")} onValueChange={(v) => setSelectedDeathId(v)}>
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Sélectionner un décès" />
          </SelectTrigger>
          <SelectContent>
            {ongoingDeaths.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.deceased_name} — {new Date(d.date_of_death).toLocaleDateString("fr-FR")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {ongoingDeaths.map((death) => {
        if (activeDeathId && death.id !== activeDeathId) return null;
        const deathContributions = contributions;
        const paid = deathContributions.filter(c => c.status === "payé").length;
        const total = deathContributions.length;

        return (
          <Card key={death.id} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Coins className="h-4 w-4 text-accent" />
                Cotisations pour {death.deceased_name}
                <Badge variant="outline" className="text-[10px] bg-destructive-light text-destructive ml-auto">
                  {paid}/{total} payé
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {deathContributions.map((c) => {
                  const config = statusConfig[c.status];
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30 cursor-pointer hover:border-accent/30 transition-colors"
                      onClick={() => openEdit(c.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{c.member_name}</p>
                        <p className="text-xs text-muted-foreground">{c.member_id} — {paymentMethods.find(p => p.value === c.payment_method)?.label || c.payment_method}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-display font-bold text-accent">
                          {c.amount.toLocaleString("fr-FR")} / {c.expected_amount.toLocaleString("fr-FR")} FCFA
                        </span>
                        <Badge className={`text-[10px] ${config?.className}`}>{config?.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {ongoingDeaths.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun décès en cours de collecte</p>
        </div>
      )}

      <Dialog open={!!editContribution} onOpenChange={() => setEditContribution(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-bordeaux-dark">Enregistrer la cotisation</DialogTitle>
          </DialogHeader>
          {editingContrib && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="font-semibold text-sm">{editingContrib.member_name}</p>
                <p className="text-xs text-muted-foreground">{editingContrib.member_id}</p>
                <p className="text-sm font-display font-bold text-accent mt-1">
                  Montant attendu : {editingContrib.expected_amount.toLocaleString("fr-FR")} FCFA
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Montant payé (FCFA) *</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant partiel ou total" className="h-10" min={0} max={editingContrib.expected_amount} />
                <p className="text-[10px] text-muted-foreground">Paiement partiel autorisé.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Moyen de paiement *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(pm => (
                      <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod && paymentMethod !== "especes" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Type de preuve</Label>
                    <Select value={proofType} onValueChange={setProofType}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transaction_id">ID de transaction</SelectItem>
                        <SelectItem value="photo">Photo du reçu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {proofType === "transaction_id" && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Référence</Label>
                      <Input value={proofData} onChange={(e) => setProofData(e.target.value)} placeholder="Numéro de transaction" className="h-10" />
                    </div>
                  )}

                  {proofType === "photo" && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Photo du reçu</Label>
                      <label className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-accent/50 transition-colors block">
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">{proofFile ? "✓ Photo sélectionnée" : "Cliquez pour choisir"}</p>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditContribution(null)}>
                  <X className="h-4 w-4 mr-1" /> Annuler
                </Button>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={!paymentMethod || !amount} onClick={handleSave}>
                  <Check className="h-4 w-4 mr-1" /> Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contributions;
