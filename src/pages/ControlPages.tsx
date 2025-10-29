import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle } from "lucide-react";
import { useAllPageAccessConfig, useUpdatePageAccess } from "@/hooks/usePageAccessControl";

interface AccessState {
  [id: string]: boolean;
}

export default function ControlPages() {
  const { data: pageConfigs, isLoading } = useAllPageAccessConfig();
  const updatePageAccess = useUpdatePageAccess();
  const [localState, setLocalState] = useState<AccessState>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Agrupar por página
  const groupedPages = pageConfigs?.reduce((acc, config) => {
    if (!acc[config.page_key]) {
      acc[config.page_key] = {
        title: config.page_title,
        url: config.page_url,
        master: null,
        reseller: null,
      };
    }
    if (config.role === "master") {
      acc[config.page_key].master = config;
    } else if (config.role === "reseller") {
      acc[config.page_key].reseller = config;
    }
    return acc;
  }, {} as Record<string, any>);

  const handleToggle = (id: string, currentValue: boolean) => {
    setLocalState((prev) => ({
      ...prev,
      [id]: !currentValue,
    }));
    setHasChanges(true);
  };

  const getEffectiveValue = (id: string, originalValue: boolean) => {
    return localState[id] !== undefined ? localState[id] : originalValue;
  };

  const handleSave = () => {
    const updates = Object.entries(localState).map(([id, is_enabled]) => ({
      id,
      is_enabled,
    }));

    updatePageAccess.mutate(updates, {
      onSuccess: () => {
        setLocalState({});
        setHasChanges(false);
      },
    });
  };

  const handleReset = () => {
    setLocalState({});
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader title="Controle de Acesso às Páginas" />
        <div className="flex-1 p-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Controle de Acesso às Páginas" />
      
      <div className="flex-1 p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle>Gerenciar Permissões de Acesso</CardTitle>
            </div>
            <CardDescription>
              Configure quais páginas cada tipo de usuário pode acessar no sistema.
              As alterações serão aplicadas imediatamente após salvar.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> A página "Configurações" está sempre disponível para todos os usuários e não pode ser desabilitada.
                Administradores sempre têm acesso a todas as páginas.
              </AlertDescription>
            </Alert>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Página</TableHead>
                    <TableHead className="text-center">Master</TableHead>
                    <TableHead className="text-center">Reseller</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedPages && Object.entries(groupedPages).map(([key, page]: [string, any]) => (
                    <TableRow key={key}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{page.title}</div>
                          <div className="text-sm text-muted-foreground">{page.url}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {page.master && (
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={getEffectiveValue(page.master.id, page.master.is_enabled)}
                              onCheckedChange={() => 
                                handleToggle(page.master.id, getEffectiveValue(page.master.id, page.master.is_enabled))
                              }
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {page.reseller && (
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={getEffectiveValue(page.reseller.id, page.reseller.is_enabled)}
                              onCheckedChange={() => 
                                handleToggle(page.reseller.id, getEffectiveValue(page.reseller.id, page.reseller.is_enabled))
                              }
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {hasChanges && (
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={updatePageAccess.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updatePageAccess.isPending}
                >
                  {updatePageAccess.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
