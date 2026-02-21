import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import PriceCalculator from "./pages/PriceCalculator";
import TasksPage from "./pages/TasksPage";
import NotesPage from "./pages/NotesPage";
import QuickRepliesPage from "./pages/QuickRepliesPage";
import ShippingChecklistPage from "./pages/ShippingChecklistPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import EstudioPage from "./pages/EstudioPage";
import FornecedoresPage from "./pages/FornecedoresPage";
import StockPage from "./pages/StockPage";
import EtiquetasPage from "./pages/EtiquetasPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground font-semibold">Carregando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="md:hidden mb-4">
            <SidebarTrigger />
          </div>
          <Routes>
            <Route path="/" element={<PriceCalculator />} />
            <Route path="/respostas" element={<QuickRepliesPage />} />
            <Route path="/expedicao" element={<ShippingChecklistPage />} />
            <Route path="/tarefas" element={<TasksPage />} />
            <Route path="/notas" element={<NotesPage />} />
            <Route path="/financeiro" element={<FinanceiroPage />} />
            <Route path="/estoque" element={<StockPage />} />
            <Route path="/estudio" element={<EstudioPage />} />
            <Route path="/fornecedores" element={<FornecedoresPage />} />
            <Route path="/etiquetas" element={<EtiquetasPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
