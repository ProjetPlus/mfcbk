import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, CreditCard, UserPlus, Users, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMember, useContributionsForMember } from "@/db/useDb";

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const member = useMember(id ? Number(id) : undefined);
  const contributions = useContributionsForMember(member?.memberId ?? "");

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
    décédé: "bg-destructive-light text-destructive",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => navigate("/members")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour aux membres
      </button>

      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-display font-bold shrink-0">
          {member.firstName[0]}{member.lastName[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-bordeaux-dark">{member.lastName} {member.firstName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-accent">{member.memberId}</span>
            <Badge className={`text-[10px] ${statusColor[member.status]}`}>{member.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Inscrit le {new Date(member.registrationDate).toLocaleDateString("fr-FR")} — {member.totalCoveredPersons} personne(s) couverte(s)
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
            <InfoRow label="Campement" value={member.campement} />
            <InfoRow label="Sous-préfecture" value={member.sousPrefecture} />
            <InfoRow label="Pièce d'identité" value={`${member.idType} — ${member.idNumber}`} />
            <InfoRow label="Droit d'adhésion" value={member.adhesionPaid ? "✓ Payé (10 000 FCFA)" : "✗ Non payé"} />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Membres secondaires
              </span>
              {member.secondaryMembers.length < 2 && (
                <Button size="sm" variant="outline" className="text-xs h-7">
                  <UserPlus className="h-3 w-3 mr-1" /> Ajouter
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {member.secondaryMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun membre secondaire</p>
            ) : (
              <div className="space-y-2">
                {member.secondaryMembers.map((sm) => (
                  <div key={sm.id} className="flex items-center justify-between p-2 rounded bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium">{sm.name}</p>
                      <p className="text-xs text-muted-foreground">{sm.relationship}</p>
                    </div>
                    <Badge variant="outline" className={sm.status === "vivant" ? "text-success border-success/20 text-[10px]" : "text-destructive border-destructive/20 text-[10px]"}>
                      {sm.status}
                    </Badge>
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
                  payé: "bg-success-light text-success",
                  non_payé: "bg-destructive-light text-destructive",
                  partiel: "bg-warning/10 text-warning",
                  exonéré: "bg-primary/10 text-primary",
                };
                return (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                    <div>
                      <p className="text-sm">{c.amount.toLocaleString("fr-FR")} / {c.expectedAmount.toLocaleString("fr-FR")} FCFA</p>
                      <p className="text-xs text-muted-foreground">{c.paymentMethod} {c.date ? `— ${new Date(c.date).toLocaleDateString("fr-FR")}` : ""}</p>
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
        <Button variant="outline" onClick={() => navigate(`/contributions?member=${member.memberId}`)}>
          <Coins className="h-4 w-4 mr-1" /> Enregistrer cotisation
        </Button>
      </div>
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
