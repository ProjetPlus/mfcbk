import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Login from "./pages/Login";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// Lazy-loaded routes for 2G/slow networks (code-splitting per route).
// We keep references to the dynamic imports so we can prefetch the most-used
// routes after the first paint without blocking initial render.
const importDashboard = () => import("./pages/Dashboard");
const importMembers = () => import("./pages/Members");
const importMemberProfile = () => import("./pages/MemberProfile");
const importRegisterStep1 = () => import("./pages/RegisterStep1");
const importRegisterStep2 = () => import("./pages/RegisterStep2");
const importDeaths = () => import("./pages/Deaths");
const importContributions = () => import("./pages/Contributions");
const importTreasury = () => import("./pages/Treasury");
const importScanner = () => import("./pages/Scanner");
const importReports = () => import("./pages/Reports");
const importCards = () => import("./pages/Cards");
const importAccess = () => import("./pages/AccessManagement");
const importSettings = () => import("./pages/Settings");
const importSync = () => import("./pages/Sync");
const importNotFound = () => import("./pages/NotFound");

const Dashboard = lazy(importDashboard);
const Members = lazy(importMembers);
const MemberProfile = lazy(importMemberProfile);
const RegisterStep1 = lazy(importRegisterStep1);
const RegisterStep2 = lazy(importRegisterStep2);
const Deaths = lazy(importDeaths);
const Contributions = lazy(importContributions);
const Treasury = lazy(importTreasury);
const Scanner = lazy(importScanner);
const Reports = lazy(importReports);
const Cards = lazy(importCards);
const AccessManagement = lazy(importAccess);
const SettingsPage = lazy(importSettings);
const Sync = lazy(importSync);
const NotFound = lazy(importNotFound);

/**
 * Smart prefetch: after first paint, idly fetch the most-used routes so
 * navigation feels instant on 2G. Skips when the user is on a slow/save-data
 * connection or offline to avoid wasting their data plan.
 */
function schedulePrefetch() {
  if (typeof window === "undefined") return;
  const conn: any = (navigator as any).connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) return;
  if (!navigator.onLine) return;
  const idle = (cb: () => void) =>
    (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 1500);
  idle(() => {
    // Most-used screens first
    importDashboard();
    importMembers();
    importScanner();
    idle(() => {
      importRegisterStep1();
      importContributions();
      importDeaths();
    });
  });
}
if (typeof window !== "undefined") schedulePrefetch();

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const RouteFallback = () => (
  <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
    <div className="animate-pulse">Chargement…</div>
  </div>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/:id" element={<MemberProfile />} />
            <Route path="/register" element={<RegisterStep1 />} />
            <Route path="/register/step2" element={<RegisterStep2 />} />
            <Route path="/deaths" element={<Deaths />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/treasury" element={<Treasury />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/access" element={<AccessManagement />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/sync" element={<Sync />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
            <PWAInstallPrompt />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
