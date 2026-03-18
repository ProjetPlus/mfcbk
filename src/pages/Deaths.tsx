import { useState } from "react";
import { Skull, Plus, ChevronRight, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeaths, useMembers } from "@/db/useDb";
import { toast } from "sonner";

const formatCFA = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

const Deaths = () => {
  const { deaths, addDeath } = useDeaths();
  const { members } = useMembers();
  const [showForm, setShowForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [deceasedType, setDeceasedType] = useState<"principal" | "secondaire">("principal");
  const [secondaryName, setSecondaryName] = useState("");
  const [dateOfDeath, setDateOfDeath] = useState(new Date().toISOString().split("T")[0]);
  const [showDetail, setShowDetail] = useState<number | null>(null);

  const activeMembers = members.filter(m => m.status === "actif");
  const selectedMember = members.find(m => m.memberId === selectedMemberId);

  // Auto-calc contributions: 1000 FCFA × covered persons for each active member
  const totalExpected = activeMembers.reduce((s, m) => s + m.totalCoveredPersons * 1000, 0);
  const payoutAmount = deceasedType === "principal" ? 300000 : 250000;
  const retainedAmount = deceasedType === "secondaire" ? 50000 : 0;

  const handleSubmit = async () => {
    if (!selectedMemberId || !dateOfDeath) return;

    const deceasedName = deceasedType === "principal"
      ? `${selectedMember?.firstName} ${selectedMember?.lastName}`
      : secondaryName;

    await addDeath({
      deceasedName,
      deceasedMemberId: selectedMemberId,
      dateOfDeath,
      type: deceasedType,
      payout: payoutAmount,
      retained: retainedAmount,
      totalExpectedContributions: totalExpected,
      totalCollected: 0,
      status: "en_cours",
    });

    toast.success("Décès déclaré", { description: `Cotisations générées pour ${activeMembers.length} membres` });
    setShowForm(false);
    setSelectedMemberId("");
    setSecondaryName("");
  };

  const detailDeath = deaths.find(d => d.id === showDetail);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Décès & Versements</h1>
          <p className="text-sm text-muted-foreground mt-1">Suivi des décès et collecte des cotisations</p>
        </div>
        <Button className="bg-destructive hover:bg-destructive/90" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Déclarer un décès
        </Button>
      </div>

      {/* Death list */}
      <div className="space-y-3">
        {deaths.map((death) => (
          <Card key={death.id} className="border-border/50 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setShowDetail(death.id!)}>
            <CardContent className="pt-4 pb-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-destructive-light shrink-0">
                <Skull className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{death.deceasedName}</p>
                  <Badge variant="outline" className={death.status === "en_cours" ? "bg-destructive-light text-destructive text-[10px]" : "bg-success-light text-success text-[10px]"}>
                    {death.status === "en_cours" ? "En cours" : "Clôturé"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {death.deceasedMemberId} — {death.type === "principal" ? "Membre principal" : "Membre secondaire"} — {new Date(death.dateOfDeath).toLocaleDateString("fr-FR")}
                </p>
                <div className="flex gap-4 mt-1 text-xs">
                  <span>Versement : <strong className="text-foreground">{formatCFA(death.payout)}</strong></span>
                  {death.retained > 0 && <span>Retenu : <strong className="text-accent">{formatCFA(death.retained)}</strong></span>}
                  <span>Collecté : <strong className="text-success">{formatCFA(death.totalCollected)}</strong> / {formatCFA(death.totalExpectedContributions)}</span>
                </div>
                <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, death.totalExpectedContributions > 0 ? (death.totalCollected / death.totalExpectedContributions) * 100 : 0)}%` }} />
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
        {deaths.length === 0 && (
          <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Aucun décès enregistré</p></div>
        )}
      </div>

      {/* Declaration Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-bordeaux-dark">Déclarer un décès</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Membre concerné *</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner le membre" /></SelectTrigger>
                <SelectContent>
                  {members.filter(m => m.status === "actif").map(m => (
                    <SelectItem key={m.memberId} value={m.memberId}>{m.lastName} {m.firstName} — {m.memberId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Type de décès *</Label>
              <Select value={deceasedType} onValueChange={(v) => setDeceasedType(v as "principal" | "secondaire")}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Membre principal</SelectItem>
                  <SelectItem value="secondaire">Membre secondaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {deceasedType === "secondaire" && selectedMember && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Membre secondaire décédé *</Label>
                {selectedMember.secondaryMembers.length > 0 ? (
                  <Select value={secondaryName} onValueChange={setSecondaryName}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {selectedMember.secondaryMembers.filter(s => s.status === "vivant").map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name} ({s.relationship})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun membre secondaire enregistré</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Date du décès *</Label>
              <Input type="date" value={dateOfDeath} onChange={(e) => setDateOfDeath(e.target.value)} className="h-10" />
            </div>

            {/* Auto-calculated summary */}
            <Card className="border-accent/30 bg-or-light/50">
              <CardContent className="pt-4 pb-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calcul automatique</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Versement à la famille</p>
                    <p className="font-display font-bold text-accent">{formatCFA(payoutAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Retenue réserve</p>
                    <p className="font-display font-bold text-foreground">{formatCFA(retainedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cotisations attendues</p>
                    <p className="font-display font-bold text-foreground">{formatCFA(totalExpected)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Membres à cotiser</p>
                    <p className="font-display font-bold text-foreground">{activeMembers.length}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Formule : 1 000 FCFA × nombre de personnes couvertes par membre
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button
                className="bg-destructive hover:bg-destructive/90"
                disabled={!selectedMemberId || !dateOfDeath || (deceasedType === "secondaire" && !secondaryName)}
                onClick={handleSubmit}
              >
                <Check className="h-4 w-4 mr-1" /> Déclarer le décès
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-bordeaux-dark">Détail du décès</DialogTitle>
          </DialogHeader>
          {detailDeath && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="Défunt" value={detailDeath.deceasedName} />
                <InfoItem label="ID Membre" value={detailDeath.deceasedMemberId} />
                <InfoItem label="Type" value={detailDeath.type === "principal" ? "Membre principal" : "Membre secondaire"} />
                <InfoItem label="Date" value={new Date(detailDeath.dateOfDeath).toLocaleDateString("fr-FR")} />
                <InfoItem label="Versement" value={formatCFA(detailDeath.payout)} />
                <InfoItem label="Retenu" value={formatCFA(detailDeath.retained)} />
                <InfoItem label="Collecté" value={`${formatCFA(detailDeath.totalCollected)} / ${formatCFA(detailDeath.totalExpectedContributions)}`} />
                <InfoItem label="Statut" value={detailDeath.status === "en_cours" ? "En cours" : "Clôturé"} />
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, detailDeath.totalExpectedContributions > 0 ? (detailDeath.totalCollected / detailDeath.totalExpectedContributions) * 100 : 0)}%` }} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export default Deaths;
