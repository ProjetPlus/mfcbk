import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { seedDatabase } from "@/db/database";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberProfile from "./pages/MemberProfile";
import RegisterStep1 from "./pages/RegisterStep1";
import RegisterStep2 from "./pages/RegisterStep2";
import Deaths from "./pages/Deaths";
import Contributions from "./pages/Contributions";
import Treasury from "./pages/Treasury";
import Scanner from "./pages/Scanner";
import Reports from "./pages/Reports";
import Cards from "./pages/Cards";
import AccessManagement from "./pages/AccessManagement";
import SettingsPage from "./pages/Settings";
import Sync from "./pages/Sync";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
