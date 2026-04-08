import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ScanLine, UserPlus, Filter, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMembers } from "@/db/useDb";

const statusColors: Record<string, string> = {
  actif: "bg-success-light text-success border-success/20",
  suspendu: "bg-warning/10 text-warning border-warning/20",
  "décédé": "bg-destructive-light text-destructive border-destructive/20",
};

const contributionColors: Record<string, string> = {
  "à_jour": "bg-success-light text-success border-success/20",
  en_retard: "bg-destructive-light text-destructive border-destructive/20",
};

const Members = () => {
  const navigate = useNavigate();
  const { members } = useMembers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = members.filter((m) => {
    const matchSearch = `${m.first_name} ${m.last_name} ${m.member_id}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-bordeaux-dark">Membres</h1>
          <p className="text-sm text-muted-foreground">{members.length} membres enregistrés</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/scanner")}>
            <ScanLine className="h-4 w-4 mr-1" /> Scanner
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => navigate("/register")}>
            <UserPlus className="h-4 w-4 mr-1" /> Inscrire
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par nom ou identifiant…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-secondary/50 rounded-lg border border-border/30">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
                <SelectItem value="décédé">Décédé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map((member) => (
          <button
            key={member.id}
            onClick={() => navigate(`/members/${member.id}`)}
            className="w-full text-left p-4 rounded-lg border border-border/50 bg-card hover:border-accent/40 hover:shadow-sm transition-all flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {member.first_name[0]}{member.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{member.last_name} {member.first_name}</p>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[member.status]}`}>{member.status}</Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-accent font-medium">{member.member_id}</span>
                <span className="text-xs text-muted-foreground">{member.sous_prefecture}</span>
                <Badge variant="outline" className={`text-[9px] ${contributionColors[member.contribution_status]}`}>
                  {member.contribution_status === "à_jour" ? "À jour" : "En retard"}
                </Badge>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground"><p className="text-sm">Aucun membre trouvé</p></div>
        )}
      </div>
    </div>
  );
};

export default Members;
