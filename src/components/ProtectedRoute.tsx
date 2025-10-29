import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePageAccess } from "@/hooks/usePageAccessControl";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based access control
  const pathname = location.pathname;
  
  // Admin has access to everything
  if (userRole === 'admin') {
    return <>{children}</>;
  }
  
  // Verificar acesso dinâmico para master e reseller
  const { data: hasAccess, isLoading: checkingAccess } = usePageAccess(userRole, pathname);
  
  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }
  
  // Páginas sempre disponíveis (não precisam estar na tabela de controle)
  const alwaysAllowed = ['/', '/profile']; // Updated to /profile
  
  // Se for master ou reseller
  if (userRole === 'master' || userRole === 'reseller') {
    // Permitir páginas sempre disponíveis
    if (alwaysAllowed.includes(pathname)) {
      return <>{children}</>;
    }
    
    // Verificar permissão dinâmica
    if (hasAccess) {
      return <>{children}</>;
    }
    
    // Se não tem acesso, redirecionar
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}