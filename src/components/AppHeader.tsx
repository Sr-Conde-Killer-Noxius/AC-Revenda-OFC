import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search, Bell, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const { user, userRole } = useAuth();

  const { data: creditData } = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async () => {
      if (!user || userRole === 'reseller') return null;
      if (userRole === 'admin') return { balance: null }; // null = ilimitado
      
      const { data, error } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || { balance: 0 };
    },
    enabled: !!user && userRole !== 'reseller',
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card px-6">
      <SidebarTrigger className="text-foreground" />
      
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {userRole !== 'reseller' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {userRole === 'admin' 
                ? 'Créditos: Ilimitado' 
                : `Créditos: ${creditData?.balance ?? 0}`}
            </span>
          </div>
        )}
        
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 pl-9 bg-background border-input"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-accent">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"></span>
        </Button>
      </div>
    </header>
  );
}
