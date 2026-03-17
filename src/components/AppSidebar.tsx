import {
  LayoutDashboard, Users, UserPlus, Skull, Coins, Landmark, BarChart3,
  CreditCard, Settings, Shield, RefreshCw, ScanLine
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import logo from "@/assets/logo-camp-bethel.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Membres", url: "/members", icon: Users },
  { title: "Inscription", url: "/register", icon: UserPlus },
  { title: "Scanner QR", url: "/scanner", icon: ScanLine },
];

const managementItems = [
  { title: "Décès & Versements", url: "/deaths", icon: Skull },
  { title: "Cotisations", url: "/contributions", icon: Coins },
  { title: "Caisse", url: "/treasury", icon: Landmark },
  { title: "Rapports", url: "/reports", icon: BarChart3 },
  { title: "Cartes à imprimer", url: "/cards", icon: CreditCard },
];

const adminItems = [
  { title: "Gestion des accès", url: "/access", icon: Shield },
  { title: "Paramètres", url: "/settings", icon: Settings },
  { title: "Synchronisation", url: "/sync", icon: RefreshCw },
];

function SidebarSection({ label, items }: { label: string; items: typeof mainItems }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-primary/70 uppercase text-[10px] tracking-widest font-semibold">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end
                  className="hover:bg-sidebar-accent transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 flex items-center gap-3">
        <img src={logo} alt="Camp Béthel" className="w-10 h-10 rounded-full shrink-0" />
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sidebar-primary font-display font-bold text-sm">CAMP BÉTHEL</span>
            <span className="text-sidebar-foreground/60 text-[10px]">Mutuelle Funéraire</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarSection label="Navigation" items={mainItems} />
        <SidebarSection label="Gestion" items={managementItems} />
        <SidebarSection label="Administration" items={adminItems} />
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/40 text-center">
            v1.0 — Kouassikandro
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
