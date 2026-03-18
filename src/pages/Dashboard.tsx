import { Users, Skull, Landmark, AlertTriangle, TrendingUp, UserPlus, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMembers, useDeaths, useTreasury, useAllContributions } from "@/db/useDb";

function StatCard({ icon: Icon, label, value, sub, iconColor }: {
  icon: React.ElementType; label: string; value: string; sub?: string; iconColor?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-5 pb-4 px-4 flex items-start gap-3">
        <div className={`p-2.5 rounded-lg shrink-0 ${iconColor || "bg-secondary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
          <p className="text-2xl font-display font-bold text-foreground mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const formatCFA = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

const Dashboard = () => {
  const { members } = useMembers();
  const { deaths } = useDeaths();
  const allContributions = useAllContributions();
  const treasury = useTreasury();

  const activeMembers = members.filter((m) => m.status === "actif").length;
  const totalCovered = members.reduce((a, m) => a + m.totalCoveredPersons, 0);
  const ongoingDeaths = deaths.filter((d) => d.status === "en_cours");
  const lateContributions = allContributions.filter((c) => c.status === "non_payé" || c.status === "partiel");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">Aperçu de la mutuelle funéraire</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Membres actifs" value={String(activeMembers)} sub={`${totalCovered} personnes couvertes`} iconColor="bg-secondary text-primary" />
        <StatCard icon={Skull} label="Décès en cours" value={String(ongoingDeaths.length)} sub="Collecte de cotisations" iconColor="bg-destructive-light text-destructive" />
        <StatCard icon={Landmark} label="Solde caisse" value={formatCFA(treasury?.totalBalance ?? 0)} iconColor="bg-or-light text-accent" />
        <StatCard icon={AlertTriangle} label="Cotisations en retard" value={String(lateContributions.length)} sub="Membres à relancer" iconColor="bg-warning/10 text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Skull className="h-4 w-4 text-destructive" />
              Décès en cours de collecte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ongoingDeaths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun décès en cours</p>
            ) : (
              ongoingDeaths.map((death) => (
                <div key={death.id} className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{death.deceasedName}</p>
                      <p className="text-xs text-muted-foreground">{death.deceasedMemberId} — {death.type === "principal" ? "Membre principal" : "Membre secondaire"}</p>
                    </div>
                    <Badge variant="outline" className="bg-destructive-light text-destructive border-destructive/20 text-[10px]">En cours</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Versement : <strong className="text-foreground">{formatCFA(death.payout)}</strong></span>
                    <span>Collecté : <strong className="text-accent">{formatCFA(death.totalCollected)}</strong> / {formatCFA(death.totalExpectedContributions)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, (death.totalCollected / death.totalExpectedContributions) * 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { icon: UserPlus, text: "Aimé KOFFI inscrit", sub: "MSCB-26-001", time: "15 jan 2026", color: "text-success" },
                { icon: Skull, text: "Décès déclaré — Yves TAPÉ", sub: "MSCB-25-010", time: "20 fév 2026", color: "text-destructive" },
                { icon: Coins, text: "Cotisation reçue — Jean KOUADIO", sub: "3 000 FCFA", time: "22 fév 2026", color: "text-accent" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 ${item.color}`}><item.icon className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {treasury && (
        <Card className="border-border/50 bg-or-light/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-5 w-5 text-accent" />
              <h3 className="font-semibold text-sm">Résumé financier</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total collecté", value: formatCFA(treasury.totalContributionsCollected) },
                { label: "Versements effectués", value: formatCFA(treasury.totalPayouts) },
                { label: "Réserves retenues", value: formatCFA(treasury.retainedReserves) },
                { label: "Cotisations en attente", value: formatCFA(treasury.pendingContributions) },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</p>
                  <p className="text-lg font-display font-bold text-accent mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
