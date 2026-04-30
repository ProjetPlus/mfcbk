import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanLine, LogIn, Eye, EyeOff, AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { authenticateUser } from "@/db/useDb";
import { useSettings } from "@/db/useDb";
import { useOnlineStatus } from "@/lib/online";
import logo from "@/assets/logo-aschrisk.png";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { settings } = useSettings();
  const { online } = useOnlineStatus();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const associationName = settings?.association_name || "Association des Chrétiens de Kouassikankro (AS.CHRIS.K)";
  const associationPhone = settings?.phone || "";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await authenticateUser(username.trim(), password);
      if (user) {
        login(user);
        navigate("/dashboard");
      } else {
        setError("Identifiant ou mot de passe incorrect (vérifiez la connexion ou utilisez vos identifiants déjà enregistrés sur cet appareil)");
      }
    } catch (err: any) {
      console.warn("[login] failed", err);
      setError("Erreur de connexion. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-creme flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logo} alt={associationName} className="w-24 h-24 rounded-full shadow-lg border-4 border-or/30 object-contain bg-white" />
          <h1 className="text-xl font-display font-bold text-bordeaux-dark text-center leading-tight uppercase">
            {associationName}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            Gestion de la mutuelle funéraire
          </p>
        </div>

        {!online && (
          <div className="w-full flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <WifiOff className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">
              Mode hors ligne — connectez-vous avec un identifiant déjà utilisé sur cet appareil.
            </p>
          </div>
        )}
        <Button
          className="w-full h-14 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-md"
          onClick={() => navigate("/scanner")}
        >
          <ScanLine className="mr-2 h-5 w-5" />
          Scanner une carte
        </Button>

        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Administration</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Card className="w-full border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive-light border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Identifiant
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre identifiant"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 font-semibold" disabled={loading}>
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? "Connexion..." : "Connexion"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-[10px] text-muted-foreground text-center">
          {associationName}<br />
          {associationPhone && <>Contact : {associationPhone}<br /></>}
          Région du Haut-Sassandra — Côte d'Ivoire
        </p>
      </div>
    </div>
  );
};

export default Login;
