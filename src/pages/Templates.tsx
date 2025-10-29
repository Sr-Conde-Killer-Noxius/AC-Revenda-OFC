import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TemplateDialog } from "@/components/templates/TemplateDialog";
import { Badge } from "@/components/ui/badge";
import { useTemplates, Template } from "@/hooks/useTemplates"; // Importar Template do hook useTemplates
import { useAuth } from "@/contexts/AuthContext"; // Importar useAuth

export default function Templates() {
  const { user, role } = useAuth(); // Obter user e role do AuthContext
  const { data: templates, isLoading, error } = useTemplates();
  // Removed: const deleteTemplateMutation = useDeleteTemplate(); // Usar o hook de delete

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar templates", { description: "Não foi possível carregar os templates. Verifique sua conexão ou tente mais tarde." });
    }
  }, [error]);

  const handleOpenDialog = (template?: Template) => {
    setSelectedTemplate(template || null);
    setDialogOpen(true);
  };

  // REMOVIDO: getCategoryLabel e getCategoryColor

  const canEditOrDelete = (template: Template) => {
    if (!user) return false;
    // Admins podem editar/deletar qualquer template
    if (role === 'admin') return true;
    // Usuário comum só pode editar/deletar seus próprios templates E que sejam do tipo 'normal'
    return template.user_id === user.id && template.type === 'normal';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Templates</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie suas mensagens automáticas</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-4 bg-muted rounded w-full animate-pulse" />
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (templates || []).length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center text-sm">
              Nenhum template cadastrado. Crie seu primeiro template!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(templates || []).map((template: Template) => (
            <Card
              key={template.id}
              className={`border-border bg-card hover:shadow-md transition-shadow ${canEditOrDelete(template) ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
              onClick={() => canEditOrDelete(template) && handleOpenDialog(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base sm:text-lg">{template.name}</CardTitle>
                  <div className="flex gap-2 items-center">
                    {template.user_id === null && (
                      <Badge variant="secondary" className="bg-blue-800/20 text-blue-300 text-xs">Padrão</Badge>
                    )}
                    {template.type === 'global' && (
                      <Badge variant="secondary" className="bg-purple-800/20 text-purple-300 text-xs">Global</Badge>
                    )}
                    {role === 'admin' && template.creatorName && template.user_id !== null && ( // Exibir nome do criador APENAS para admins
                      <Badge variant="secondary" className="bg-gray-800/20 text-gray-300 text-xs">
                        {template.creatorName}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-3 text-sm">
                  {template.content}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Placeholders Disponíveis</CardTitle>
          <CardDescription className="text-sm">
            Use estes marcadores em suas mensagens para personalização automática
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-xs sm:text-sm">
                {"{{customer_name}}"}
              </code>
              <span className="text-xs sm:text-sm text-muted-foreground">Nome do cliente</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-xs sm:text-sm">
                {"{{plan_name}}"}
              </code>
              <span className="text-xs sm:text-sm text-muted-foreground">Nome do plano</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-xs sm:text-sm">
                {"{{due_date}}"}
              </code>
              <span className="text-xs sm:text-sm text-muted-foreground">Data de vencimento</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-xs sm:text-sm">
                {"{{value}}"}
              </code>
              <span className="text-xs sm:text-sm text-muted-foreground">Valor da cobrança</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-xs sm:text-sm">
                {"{{pix_key}}"}
              </code>
              <span className="text-xs sm:text-sm text-muted-foreground">Chave PIX do seu perfil</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
      />
    </div>
  );
}