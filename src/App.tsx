import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import StockPage from "./pages/StockPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import FornecedoresPage from "./pages/FornecedoresPage";
import PriceCalculator from "./pages/PriceCalculator";
import EtiquetasPage from "./pages/EtiquetasPage";
import ShippingChecklistPage from "./pages/ShippingChecklistPage";
import TasksPage from "./pages/TasksPage";
import NotesPage from "./pages/NotesPage";
import EstudioPage from "./pages/EstudioPage";
import QuickRepliesPage from "./pages/QuickRepliesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Componente de Proteção de Rota otimizado
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>;
  }
  
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rota de Auth: Se já tiver sessão, joga para a Home */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Rotas Protegidas */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/stock" element={<ProtectedRoute><StockPage /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><FinanceiroPage /></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute><FornecedoresPage /></ProtectedRoute>} />
            <Route path="/calculadora" element={<ProtectedRoute><PriceCalculator /></ProtectedRoute>} />
            <Route path="/etiquetas" element={<ProtectedRoute><EtiquetasPage /></ProtectedRoute>} />
            <Route path="/expedicoes" element={<ProtectedRoute><ShippingChecklistPage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
            <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
            <Route path="/estudio" element={<ProtectedRoute><EstudioPage /></ProtectedRoute>} />
            <Route path="/respostas" element={<ProtectedRoute><QuickRepliesPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
