import { Landmark, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTreasury } from "@/db/useDb";

const formatCFA = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

const Treasury = () => {
  const treasury = useTreasury();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Caisse</h1>
        <p className="text-sm text-muted-foreground mt-1">Suivi financier de la mutuelle</p>
      </div>

      <Card className="border-accent/30 bg-or-light/50">
        <CardContent className="pt-6 pb-5 text-center">
          <Landmark className="h-8 w-8 text-accent mx-auto mb-2" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Solde total de la caisse</p>
          <p className="text-4xl font-display font-bold text-accent mt-2">{formatCFA(treasury?.total_balance ?? 0)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" /> Entrées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold text-success">{formatCFA(treasury?.total_contributions_collected ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total des cotisations collectées</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" /> Sorties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold text-destructive">{formatCFA(treasury?.total_payouts ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total des versements aux familles</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-accent" /> Réserves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold text-accent">{formatCFA(treasury?.retained_reserves ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Retenues sur décès de secondaires</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Treasury;
