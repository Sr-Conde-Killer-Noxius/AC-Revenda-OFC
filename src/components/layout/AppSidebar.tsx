import { NavLink } from "react-router-dom";
import { Users, FileText, MessageSquare, LayoutDashboard, LogOut, Link, DollarSign, BarChart, PieChart, Activity, UserCircle, Settings2, UserCog, Package, MailOpen, Repeat, CreditCard, Settings, Bell } from "lucide-react"; // Added Bell icon
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  // SidebarGroupLabel, // Removido
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
// import { useIsMobile } from "@/hooks/use-mobile"; // Removido: isMobile não é mais utilizado

const menuItems = [
  { title: "Perfil", url: "/profile", icon: UserCircle },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Planos", url: "/plans", icon: FileText },
  { title: "Templates", url: "/templates", icon: MessageSquare },
];

const financialMenuItems = [
  { title: "Extrato", url: "/financeiro/extrato", icon: DollarSign },
  { title: "Relatórios", url: "/financeiro/relatorios", icon: BarChart },
  { title: "Análise", url: "/financeiro/analise", icon: PieChart },
];

const adminFinancialMenuItems = [
  { title: "Extrato Admin", url: "/financeiroADM/extrato", icon: DollarSign },
  { title: "Relatórios Admin", url: "/financeiroADM/relatorios", icon: BarChart },
  { title: "Análise Admin", url: "/financeiroADM/analise", icon: PieChart },
];

const subscriberManagementMenuItems = [
  { title: "Usuários", url: "/assinantes/usuarios", icon: UserCog },
  { title: "Planos", url: "/assinantes/planos", icon: Package },
  { title: "Templates", url: "/assinantes/templates", icon: MailOpen },
  { title: "Automações", url: "/assinantes/automacoes", icon: Repeat },
  { title: "Integrações de Pagamento", url: "/assinantes/integracao", icon: CreditCard },
  { title: "Integração Painel Revenda", url: "/assinantes/revenda-integration", icon: Link, adminOnly: true },
  { title: "Avisos", url: "/assinantes/notificacoes", icon: Bell }, // MOVIDO: Link para avisos
];

const baseConnectionMenuItems = [
  { title: "WhatsApp", url: "/connection/whatsapp", icon: MessageSquare },
  { title: "Automações", url: "/connection/automacoes", icon: Settings2 },
  { title: "Webhooks", url: "/connection/webhooks", icon: Link, adminOnly: true },
  { title: "Métricas", url: "/connection/metrics", icon: Activity },
];

// REMOVIDO: Menu de Configurações, pois a integração da revenda foi movida
const settingsMenuItems: { title: string; url: string; icon: React.ElementType; adminOnly?: boolean }[] = [];


interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const navigate = useNavigate();
  const { role, isLoading: isLoadingAuth, session } = useAuth(); // <-- Obter 'session' do useAuth
  // const isMobile = useIsMobile(); // Removido: isMobile não é mais utilizado

  const handleLogout = async () => {
    if (session) { // Só tenta fazer logout se houver uma sessão ativa
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Erro ao sair", { description: error.message });
      } else {
        navigate("/auth");
      }
    } else {
      // Se não houver sessão, apenas navega para a página de autenticação
      navigate("/auth");
    }
    onClose?.(); // Fecha a sidebar independentemente
  };

  const connectionMenuItems = baseConnectionMenuItems.filter(item => 
    !item.adminOnly || role === 'admin'
  );

  const filteredSettingsMenuItems = settingsMenuItems.filter(item =>
    !item.adminOnly || role === 'admin'
  );

  if (isLoadingAuth) {
    return null;
  }

  return (
    <Sidebar className="border-r border-sidebar-border w-64 flex flex-col h-full" isOpen={isOpen}>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
              <span className="text-lg font-bold text-primary-foreground">AC</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Acerto Certo</h2>
              <p className="text-xs text-muted-foreground">1.2.0.1.0</p>
            </div>
          </div>
          {/* Removido o botão de fechar manual, o Sheet já fornece um */}
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      onClick={onClose}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="financeiro-menu" className="border-b-0">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <div className="flex items-center w-full justify-start">
                    <DollarSign className="mr-3 h-4 w-4" />
                    <span>Financeiro</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <SidebarMenu className="pl-4">
                    {financialMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            onClick={onClose}
                            className={({ isActive }) =>
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "hover:hover:bg-sidebar-accent/50"
                            }
                          >
                            <item.icon className="mr-3 h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === 'admin' && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="admin-financeiro-menu" className="border-b-0">
                  <AccordionTrigger className="py-0 hover:no-underline">
                    <div className="flex items-center w-full justify-start">
                      <DollarSign className="mr-3 h-4 w-4" />
                      <span>Financeiro Admin</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <SidebarMenu className="pl-4">
                      {adminFinancialMenuItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              onClick={onClose}
                              className={({ isActive }) =>
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "hover:hover:bg-sidebar-accent/50"
                              }
                            >
                              <item.icon className="mr-3 h-4 w-4" />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {role === 'admin' && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="subscriber-management-menu" className="border-b-0">
                  <AccordionTrigger className="py-0 hover:no-underline">
                    <div className="flex items-center w-full justify-start">
                      <UserCog className="mr-3 h-4 w-4" />
                      <span>Gerenciar Assinantes</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <SidebarMenu className="pl-4">
                      {subscriberManagementMenuItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              onClick={onClose}
                              className={({ isActive }) =>
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "hover:hover:bg-sidebar-accent/50"
                              }
                            >
                              <item.icon className="mr-3 h-4 w-4" />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="connection-menu" className="border-b-0">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <div className="flex items-center w-full justify-start">
                    <Link className="mr-3 h-4 w-4" />
                    <span>Conexão</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <SidebarMenu className="pl-4">
                    {connectionMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            onClick={onClose}
                            className={({ isActive }) =>
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "hover:hover:bg-sidebar-accent/50"
                            }
                          >
                            <item.icon className="mr-3 h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* NOVO: Menu de Configurações */}
        {filteredSettingsMenuItems.length > 0 && (
          <SidebarGroup className="mt-4">
            <SidebarGroupContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="settings-menu" className="border-b-0">
                  <AccordionTrigger className="py-0 hover:no-underline">
                    <div className="flex items-center w-full justify-start">
                      <Settings className="mr-3 h-4 w-4" />
                      <span>Configurações</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <SidebarMenu className="pl-4">
                      {filteredSettingsMenuItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              onClick={onClose}
                              className={({ isActive }) =>
                                isActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "hover:hover:bg-sidebar-accent/50"
                              }
                            >
                              <item.icon className="mr-3 h-4 w-4" />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Botão Sair no Footer, SEM borda superior */}
      <SidebarFooter className="p-4 border-t-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
          onClick={() => { handleLogout(); onClose?.(); }}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
      
      <div className="w-full border-t border-slate-700 my-4"></div>

      {/* Div EXTERNO ao Footer, AGORA COM A BORDA SUPERIOR, para as informações */}
      <div className="p-4 border-t border-slate-800">
        <div className="text-center text-xs text-slate-500">
          <div>Desenvolvido por</div>
          <a
            href="https://digitalsouloficial.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-400 hover:underline mt-1 block" // `block` garante que o <a> ocupe sua linha
          >
            Digital Soul Solutions
          </a>
          <p className="mt-1">CNPJ: 58.870.696/0001-97</p>
        </div>
      </div>

    </Sidebar>
  );
}