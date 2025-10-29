import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Menu as MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/notifications/NotificationBell"; // NOVO: Importar NotificationBell

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        {/* Sidebar para Desktop (oculta em mobile) */}
        {!isMobile && (
          <AppSidebar isOpen={true} onClose={closeSidebar} />
        )}

        {/* Contêiner principal da área de conteúdo (header + main) */}
        <div className={`flex-1 flex flex-col min-w-0 ${!isMobile ? 'lg:ml-64' : ''}`}>
          {/* Cabeçalho para Mobile com Gatilho do Sheet */}
          {isMobile ? (
            <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 fixed top-0 left-0 right-0 z-30">
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                    <MenuIcon className="h-6 w-6" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold text-foreground">Acerto Certo</h1>
              <div className="ml-auto">
                <NotificationBell /> {/* NOVO: Bell para mobile */}
              </div>
            </header>
          ) : (
            <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 fixed top-0 left-64 right-0 z-30">
              <h1 className="text-lg font-semibold text-foreground">Acerto Certo</h1>
              <div className="ml-auto">
                <NotificationBell /> {/* NOVO: Bell para desktop */}
              </div>
            </header>
          )}

          {/* Div espaçadora para compensar a altura do cabeçalho fixo */}
          <div className="h-14 w-full"></div>

          {/* Conteúdo da Página - agora é o elemento 'main' e rola abaixo do espaçador */}
          <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}