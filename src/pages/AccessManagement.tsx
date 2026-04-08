import { useState } from "react";
import { Shield, Plus, X, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUsers } from "@/db/useDb";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  super_admin: "Super Administrateur",
  admin: "Administrateur",
  lecture_seule: "Lecture seule",
  cotisations: "Cotisations uniquement",
  membres: "Membres uniquement",
  imprimeur: "Imprimeur",
};

const AccessManagement = () => {
  const { users, addUser, deleteUser } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", display_name: "", role: "" });

  const handleCreate = async () => {
    if (!newUser.username || !newUser.password || !newUser.role || !newUser.display_name) return;
    try {
      await addUser({
        username: newUser.username,
        password: newUser.password,
        display_name: newUser.display_name,
        role: newUser.role,
      });
      toast.success("Compte créé", { description: newUser.display_name });
      setNewUser({ username: "", password: "", display_name: "", role: "" });
      setShowForm(false);
    } catch (err: any) {
      toast.error("Erreur", { description: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Gestion des accès</h1>
          <p className="text-sm text-muted-foreground mt-1">Comptes et rôles des utilisateurs</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Créer un compte
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div>
                <p className="text-sm font-medium">{r.display_name}</p>
                <p className="text-xs text-muted-foreground">@{r.username} — {roleLabels[r.role] || r.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-success-light text-success border-success/20">
                  {r.is_active ? "actif" : "inactif"}
                </Badge>
                {r.role !== "super_admin" && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => {
                    deleteUser(r.id);
                    toast.success("Compte supprimé");
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur</p>}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-bordeaux-dark">Créer un compte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nom complet *</Label>
              <Input value={newUser.display_name} onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })} placeholder="Nom affiché" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Identifiant *</Label>
              <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} placeholder="Identifiant de connexion" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Mot de passe *</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Mot de passe" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Rôle *</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4 mr-1" /> Annuler</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={!newUser.username || !newUser.password || !newUser.role || !newUser.display_name}>
                <Check className="h-4 w-4 mr-1" /> Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessManagement;
