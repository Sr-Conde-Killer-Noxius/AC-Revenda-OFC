import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { Enums } from '@/integrations/supabase/schema';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: Enums<'app_role'> | null;
  isLoading: boolean;
  isSubscriptionOverdue: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Enums<'app_role'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionOverdue, setIsSubscriptionOverdue] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const fetchSessionAndRole = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (roleError && roleError.code !== 'PGRST116') {
          console.error('Error fetching user role:', roleError);
          setRole(null);
        } else {
          setRole(roleData?.role || 'user');
        }

        // Fetch subscription data and check for overdue status
        if (roleData?.role !== 'admin') {
          const { data: subscriptionData, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('plan_name, next_billing_date, status')
            .eq('user_id', session.user.id)
            .single();

          if (subscriptionError && subscriptionError.code !== 'PGRST116') {
            console.error('Error fetching subscription data:', subscriptionError);
            setIsSubscriptionOverdue(false);
          } else if (subscriptionData) {
            let overdue = false;
            let planIsFree = false;

            // Fetch is_free from subscriber_plans separately
            if (subscriptionData.plan_name) {
              const { data: planDetails, error: planDetailsError } = await supabase
                .from('subscriber_plans')
                .select('is_free')
                .eq('name', subscriptionData.plan_name)
                .single();

              if (planDetailsError && planDetailsError.code !== 'PGRST116') {
                console.error('Error fetching plan details:', planDetailsError);
              } else {
                planIsFree = planDetails?.is_free || false;
              }
            }

            // Determine overdue status, prioritizing explicit 'overdue' status from DB
            if (subscriptionData.status === 'overdue') {
                overdue = true;
            } else if (subscriptionData.status === 'inactive') {
                overdue = false;
            } else if (planIsFree) {
                // Free plans are not considered overdue for payment,
                // unless explicitly marked as 'overdue' by an admin action (caught above).
                overdue = false;
            } else if (subscriptionData.next_billing_date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const nextBillingDate = new Date(subscriptionData.next_billing_date + 'T00:00:00');
                nextBillingDate.setHours(0, 0, 0, 0);

                if (today > nextBillingDate) {
                    overdue = true;
                }
            }
            setIsSubscriptionOverdue(overdue);
          } else {
            setIsSubscriptionOverdue(false);
          }
        } else {
          setIsSubscriptionOverdue(false);
        }
      } else {
        setRole(null);
        setIsSubscriptionOverdue(false);
      }
    } catch (error) {
      console.error('Error in fetchSessionAndRole:', error);
      setSession(null);
      setUser(null);
      setRole(null);
      setIsSubscriptionOverdue(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(true);
      fetchSessionAndRole();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoading && session && user && role !== 'admin' && isSubscriptionOverdue && location.pathname !== '/profile') {
      toast.error("Assinatura Vencida", {
        description: "Sua assinatura está vencida. Por favor, entre em contato com seu revendedor para regularizar a situação.",
        duration: 10000 // Aumentar duração do toast
      });
      navigate('/profile', { replace: true });
    }
  }, [isLoading, session, user, role, isSubscriptionOverdue, location.pathname, navigate]);

  return (
    <AuthContext.Provider value={{ session, user, role, isLoading, isSubscriptionOverdue }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};