import { Users, Skull, Landmark, AlertTriangle, TrendingUp, UserPlus, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMembers, useDeaths, useTreasury, useAllContributions } from "@/db/useDb";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts";

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

const COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--accent))"];

const Dashboard = () => {
  const { members } = useMembers();
  const { deaths } = useDeaths();
  const allContributions = useAllContributions();
  const treasury = useTreasury();

  const activeMembers = members.filter((m) => m.status === "actif").length;
  const suspendedMembers = members.filter((m) => m.status === "suspendu").length;
  const deceasedMembers = members.filter((m) => m.status === "décédé").length;
  const totalCovered = members.reduce((a, m) => a + m.totalCoveredPersons, 0);
  const ongoingDeaths = deaths.filter((d) => d.status === "en_cours");
  const lateContributions = allContributions.filter((c) => c.status === "non_payé" || c.status === "partiel");

  // Chart data: member status distribution
  const statusData = [
    { name: "Actifs", value: activeMembers, color: COLORS[0] },
    { name: "Suspendus", value: suspendedMembers, color: COLORS[1] },
    { name: "Décédés", value: deceasedMembers, color: COLORS[2] },
  ].filter(d => d.value > 0);

  // Chart data: contributions by death
  const contributionsByDeath = deaths.map(d => ({
    name: d.deceasedName.split(" ").pop() || d.deceasedName,
    attendu: d.totalExpectedContributions,
    collecté: d.totalCollected,
  }));

  // Chart data: contribution status breakdown
  const contribStatusData = [
    { name: "Payé", value: allContributions.filter(c => c.status === "payé").length },
    { name: "Non payé", value: allContributions.filter(c => c.status === "non_payé").length },
    { name: "Partiel", value: allContributions.filter(c => c.status === "partiel").length },
    { name: "Exonéré", value: allContributions.filter(c => c.status === "exonéré").length },
  ].filter(d => d.value > 0);

  // Chart data: financial summary over deaths (timeline)
  let cumulCollected = 0;
  let cumulPayouts = 0;
  const financialTimeline = deaths.map(d => {
    cumulCollected += d.totalCollected;
    cumulPayouts += d.payout;
    return {
      name: d.deceasedName.split(" ").pop() || d.deceasedName,
      collecté: cumulCollected,
      versé: cumulPayouts,
    };
  });

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Member Status Pie */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Répartition des membres
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun membre</p>
            )}
          </CardContent>
        </Card>

        {/* Contributions by Death Bar */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Coins className="h-4 w-4 text-accent" /> Cotisations par décès
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contributionsByDeath.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={contributionsByDeath}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCFA(v)} />
                  <Legend />
                  <Bar dataKey="attendu" name="Attendu" fill="hsl(var(--muted-foreground))" radius={[4,4,0,0]} />
                  <Bar dataKey="collecté" name="Collecté" fill="hsl(var(--accent))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun décès enregistré</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contribution Status Pie */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Statut des cotisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contribStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={contribStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {contribStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune cotisation</p>
            )}
          </CardContent>
        </Card>

        {/* Financial Timeline */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-accent" /> Historique financier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={financialTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCFA(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="collecté" name="Total collecté" stroke="hsl(var(--accent))" strokeWidth={2} />
                  <Line type="monotone" dataKey="versé" name="Total versé" stroke="hsl(var(--destructive))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun historique</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ongoing Deaths */}
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
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, death.totalExpectedContributions > 0 ? (death.totalCollected / death.totalExpectedContributions) * 100 : 0)}%` }} />
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
              {members.length === 0 && deaths.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activité — commencez par inscrire des membres</p>
              ) : (
                <>
                  {members.slice(-3).reverse().map((m, i) => (
                    <div key={`m-${i}`} className="flex items-start gap-3">
                      <div className="mt-0.5 text-success"><UserPlus className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.firstName} {m.lastName} inscrit</p>
                        <p className="text-xs text-muted-foreground">{m.memberId}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{new Date(m.registrationDate).toLocaleDateString("fr-FR")}</span>
                    </div>
                  ))}
                  {deaths.slice(-2).reverse().map((d, i) => (
                    <div key={`d-${i}`} className="flex items-start gap-3">
                      <div className="mt-0.5 text-destructive"><Skull className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Décès — {d.deceasedName}</p>
                        <p className="text-xs text-muted-foreground">{d.deceasedMemberId}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{new Date(d.dateOfDeath).toLocaleDateString("fr-FR")}</span>
                    </div>
                  ))}
                </>
              )}
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
