import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Enums } from "@/integrations/supabase/schema";
import { useUserProfile } from "@/hooks/useProfileData";


interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Enums<'app_role'>;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, user, role, isLoading: isLoadingAuth } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoadingAuth || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role !== 'admin' && !userProfile?.phone && location.pathname !== '/profile') {
    navigate('/profile?missingPhone=true', { replace: true });
    return null;
  }

  return <>{children}</>;
}