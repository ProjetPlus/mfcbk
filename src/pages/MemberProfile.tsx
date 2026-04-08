import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, CreditCard, UserPlus, Users, Coins, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMember, useContributionsForMember, useMembers } from "@/db/useDb";
import { toast } from "sonner";
import type { DbSecondaryMember } from "@/db/database";

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const member = useMember(id);
  const contributions = useContributionsForMember(member?.member_id ?? "");
  const { updateMember } = useMembers();
  const [showAddSecondary, setShowAddSecondary] = useState(false);
  const [newSecondary, setNewSecondary] = useState({ name: "", relationship: "", dateOfBirth: "" });

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Membre introuvable</p>
        <Button variant="link" onClick={() => navigate("/members")}>Retour à la liste</Button>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    actif: "bg-success-light text-success",
    suspendu: "bg-warning/10 text-warning",
    "décédé": "bg-destructive-light text-destructive",
  };

  const secondaryMembers = (member.secondary_members || []) as DbSecondaryMember[];

  const handleAddSecondary = async () => {
    if (!newSecondary.name || !newSecondary.relationship) {
      toast.error("Nom et lien de parenté requis");
      return;
    }
    if (secondaryMembers.length >= 2) {
      toast.error("Maximum 2 membres secondaires");
      return;
    }

    const sm: DbSecondaryMember = {
      id: crypto.randomUUID(),
      name: newSecondary.name,
      relationship: newSecondary.relationship,
      dateOfBirth: newSecondary.dateOfBirth || undefined,
      status: "vivant",
    };

    const updatedSecondary = [...secondaryMembers, sm];
    await updateMember(member.id, {
      secondary_members: updatedSecondary as any,
      total_covered_persons: 1 + updatedSecondary.length,
    });

    setNewSecondary({ name: "", relationship: "", dateOfBirth: "" });
    setShowAddSecondary(false);
    toast.success("Membre secondaire ajouté", { description: `${sm.name} — ${sm.relationship}` });
  };

  const handleRemoveSecondary = async (smId: string) => {
    const updatedSecondary = secondaryMembers.filter(s => s.id !== smId);
    await updateMember(member.id, {
      secondary_members: updatedSecondary as any,
      total_covered_persons: 1 + updatedSecondary.length,
    });
    toast.success("Membre secondaire retiré");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate("/members")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour aux membres
      </button>

      <div className="flex items-start gap-4">
        {member.photo ? (
          <img src={member.photo} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-display font-bold shrink-0">
            {member.first_name[0]}{member.last_name[0]}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-bordeaux-dark">{member.last_name} {member.first_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-accent">{member.member_id}</span>
            <Badge className={`text-[10px] ${statusColor[member.status]}`}>{member.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Inscrit le {new Date(member.registration_date).toLocaleDateString("fr-FR")} — {member.total_covered_persons} personne(s) couverte(s)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Téléphone" value={member.phone} />
            {member.phone_secondary && <InfoRow label="Tél. secondaire" value={member.phone_secondary} />}
            {member.whatsapp && <InfoRow label="WhatsApp" value={member.whatsapp} />}
            <InfoRow label="Campement" value={member.campement} />
            <InfoRow label="Sous-préfecture" value={member.sous_prefecture} />
            <InfoRow label="Pièce d'identité" value={`${member.id_type} — ${member.id_number || "N/A"}`} />
            <InfoRow label="Droit d'adhésion" value={member.adhesion_paid ? "✓ Payé (10 000 FCFA)" : "✗ Non payé"} />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Membres secondaires ({secondaryMembers.length}/2)
              </span>
              {secondaryMembers.length < 2 && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowAddSecondary(true)}>
                  <UserPlus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {secondaryMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre secondaire</p>
            ) : (
              <div className="space-y-2">
                {secondaryMembers.map((sm) => (
                  <div key={sm.id} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium">{sm.name}</p>
                      <p className="text-xs text-muted-foreground">{sm.relationship} {sm.dateOfBirth ? `— né(e) le ${new Date(sm.dateOfBirth).toLocaleDateString("fr-FR")}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={sm.status === "vivant" ? "text-success border-success/20 text-[10px]" : "text-destructive border-destructive/20 text-[10px]"}>
                        {sm.status}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleRemoveSecondary(sm.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-accent" /> Historique des cotisations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune cotisation enregistrée</p>
          ) : (
            <div className="space-y-2">
              {contributions.map((c) => {
                const badgeColor: Record<string, string> = {
                  "payé": "bg-success-light text-success",
                  "non_payé": "bg-destructive-light text-destructive",
                  partiel: "bg-warning/10 text-warning",
                  "exonéré": "bg-primary/10 text-primary",
                };
                return (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                    <div>
                      <p className="text-sm">{c.amount.toLocaleString("fr-FR")} / {c.expected_amount.toLocaleString("fr-FR")} FCFA</p>
                      <p className="text-xs text-muted-foreground">{c.payment_method} {c.date ? `— ${new Date(c.date).toLocaleDateString("fr-FR")}` : ""}</p>
                    </div>
                    <Badge className={`text-[10px] ${badgeColor[c.status]}`}>{c.status.replace("_", " ")}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => navigate(`/cards?member=${member.id}`)}>
          <CreditCard className="h-4 w-4 mr-1" /> Générer la carte
        </Button>
        <Button variant="outline" onClick={() => navigate(`/contributions?member=${member.member_id}`)}>
          <Coins className="h-4 w-4 mr-1" /> Enregistrer cotisation
        </Button>
      </div>

      <Dialog open={showAddSecondary} onOpenChange={setShowAddSecondary}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Ajouter un membre secondaire
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nom complet *</Label>
              <Input value={newSecondary.name} onChange={e => setNewSecondary({ ...newSecondary, name: e.target.value })} placeholder="Nom et prénom(s)" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Lien de parenté *</Label>
              <Select value={newSecondary.relationship} onValueChange={v => setNewSecondary({ ...newSecondary, relationship: v })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {["Conjoint(e)", "Enfant", "Père", "Mère", "Frère", "Sœur", "Autre"].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Date de naissance</Label>
              <Input type="date" value={newSecondary.dateOfBirth} onChange={e => setNewSecondary({ ...newSecondary, dateOfBirth: e.target.value })} className="h-10" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddSecondary(false)}>Annuler</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleAddSecondary}>
                <UserPlus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
      <span className="text-right font-medium max-w-[60%]">{value}</span>
    </div>
  );
}

export default MemberProfile;
