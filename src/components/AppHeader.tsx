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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
      <SidebarTrigger className="text-foreground" />
      
      <div className="flex-1 min-w-0 overflow-hidden"> {/* Adicionado overflow-hidden para garantir que o conteúdo seja truncado */}
        <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{title}</h1> {/* Truncate para títulos longos */}
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>} {/* Truncate para subtítulos longos */}
      </div>

      <div className="flex items-center gap-2 sm:gap-3"> {/* Ajustado gap */}
        {userRole !== 'reseller' && (
          <div className="flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md bg-primary/10 border border-primary/20 max-w-full"> {/* Adicionado max-w-full */}
            <Coins className="h-3 w-3 sm:h-4 sm:w-4 text-primary" /> {/* Ajustado tamanho do ícone */}
            <span className="text-xs sm:text-sm font-medium text-foreground truncate"> {/* Removido whitespace-nowrap e adicionado truncate */}
              {userRole === 'admin' 
                ? 'Créditos: Ilimitado' 
                : `Créditos: ${creditData?.balance ?? 0}`}
            </span>
          </div>
        )}
        
        <div className="relative hidden md:block"> {/* Ocultado em telas pequenas */}
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-40 sm:w-64 pl-9 bg-background border-input"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-accent h-8 w-8 sm:h-9 sm:w-9"> {/* Ajustado tamanho do botão */}
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" /> {/* Ajustado tamanho do ícone */}
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive"></span> {/* Ajustado posição do badge */}
        </Button>
      </div>
    </header>
  );
}