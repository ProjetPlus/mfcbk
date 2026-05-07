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

// Lazy-loaded routes for 2G/slow networks (code-splitting per route)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const RegisterStep1 = lazy(() => import("./pages/RegisterStep1"));
const RegisterStep2 = lazy(() => import("./pages/RegisterStep2"));
const Deaths = lazy(() => import("./pages/Deaths"));
const Contributions = lazy(() => import("./pages/Contributions"));
const Treasury = lazy(() => import("./pages/Treasury"));
const Scanner = lazy(() => import("./pages/Scanner"));
const Reports = lazy(() => import("./pages/Reports"));
const Cards = lazy(() => import("./pages/Cards"));
const AccessManagement = lazy(() => import("./pages/AccessManagement"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Sync = lazy(() => import("./pages/Sync"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
