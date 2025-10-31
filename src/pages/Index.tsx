import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  useEffect(() => {
    // Redirect based on user role avoiding loops with ProtectedRoute
    if (!userRole) return;
    if (userRole === 'admin') {
      navigate('/users', { replace: true });
    } else {
      navigate('/profile', { replace: true });
    }
  }, [userRole, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}