import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Plans from "./pages/Plans";
import Templates from "./pages/Templates";
import Automations from "./pages/Automations";
import Connection from "./pages/Connection";
import ConnectionMetrics from "@/pages/Connection/Metrics";
import Webhooks from "@/pages/Connection/Webhooks";
import Extrato from "./pages/financeiro/Extrato";
import Relatorios from "./pages/financeiro/Relatorios";
import Analise from "./pages/financeiro/Analise";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider

// NOVO: Importar páginas de admin
import AdminExtrato from "./pages/financeiroADM/Extrato";
import AdminRelatorios from "./pages/financeiroADM/Relatorios";
import AdminAnalise from "./pages/financeiroADM/Analise";
import AdminUsuarios from "./pages/assinantes/Usuarios";
import AdminPlanos from "./pages/assinantes/Planos";
import AdminTemplates from "./pages/assinantes/Templates";
import AdminAutomacoes from "./pages/assinantes/Automacoes";
import IntegracaoPagbank from "./pages/assinantes/Integracao";
import RevendaIntegration from "./pages/settings/RevendaIntegration";
import AdminNotificacoes from "./pages/assinantes/Notificacoes"; // NOVO: Importar a página de notificações

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider> {/* Wrap the entire application with AuthProvider */}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Clients />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/plans"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Plans />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Templates />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Rotas para a seção Conexão */}
            <Route
              path="/connection/whatsapp"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Connection />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Rota corrigida para 'automacoes' */}
            <Route
              path="/connection/automacoes"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Automations />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/connection/metrics"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ConnectionMetrics />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/connection/webhooks"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <Webhooks />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Profile />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Rotas para a seção Financeiro */}
            <Route
              path="/financeiro/extrato"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Extrato />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro/relatorios"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Relatorios />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro/analise"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Analise />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* NOVO: Rotas para a seção Financeiro Admin */}
            <Route
              path="/financeiroADM/extrato"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <AdminExtrato />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiroADM/relatorios"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <AdminRelatorios />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiroADM/analise"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <AdminAnalise />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* NOVO: Rotas para a seção Gerenciamento de Assinantes */}
            <Route
              path="/assinantes/usuarios"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <AdminUsuarios />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assinantes/planos"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <AdminPlanos />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assinantes/templates"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <AdminTemplates />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assinantes/automacoes"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <AdminAutomacoes />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* NOVO: Rota para integração PagBank */}
            <Route
              path="/assinantes/integracao"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <IntegracaoPagbank />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* NOVO: Rota para Notificações Admin */}
            <Route
              path="/assinantes/notificacoes"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <AdminNotificacoes />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* NOVO: Rota para Integração Painel Revenda */}
            <Route
              path="/assinantes/revenda-integration"
              element={
                <ProtectedRoute requiredRole="admin">
                  <MainLayout>
                    <RevendaIntegration />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;