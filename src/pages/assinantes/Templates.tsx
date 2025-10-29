import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SubscriberTemplate } from "@/integrations/supabase/schema";
import { useSubscriberTemplates } from "@/hooks/useSubscriberManagement";
import { SubscriberTemplateDialog } from "@/components/admin/assinantes/SubscriberTemplateDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminTemplates() {
  const { user, role } = useAuth();
  const { data: templates, isLoading, error } = useSubscriberTemplates();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SubscriberTemplate | null>(null);

  useEffect(() => {
    if (error) {
      toast.error("Erro ao carregar templates de assinantes", { description: error.message });
    }
    console.log('AdminTemplates: Current user role:', role); // Add this log
  }, [error, role]); // Add role to dependencies

  const handleOpenDialog = (template?: SubscriberTemplate) => {
    setSelectedTemplate(template || null);
    setDialogOpen(true);
  };

  const canEditOrDelete = () => {
    if (!user) return false;
    // Admins podem editar/deletar qualquer template de assinante
    return role === 'admin';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Templates de Assinantes</h1>
          <p className="text-muted-foreground mt-1">Gerencie as mensagens automáticas para os assinantes da plataforma</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
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
            <p className="text-muted-foreground text-center">
              Nenhum template de assinante cadastrado. Crie seu primeiro template!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(templates || []).map((template: SubscriberTemplate) => (
            <Card
              key={template.id}
              className={`border-border bg-card hover:shadow-md transition-shadow ${canEditOrDelete() ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
              onClick={() => canEditOrDelete() && handleOpenDialog(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base sm:text-lg">{template.name}</CardTitle> {/* Adicionado font size responsivo */}
                  <div className="flex gap-2 items-center">
                    {template.type === 'global' && (
                      <Badge variant="secondary" className="bg-purple-800/20 text-purple-300">Global</Badge>
                    )}
                    {template.admin_user_id === null && template.type === 'normal' && (
                      <Badge variant="secondary" className="bg-blue-800/20 text-blue-300">Padrão</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-3">
                  {template.content}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Placeholders Disponíveis</CardTitle>
          <CardDescription>
            Use estes marcadores em suas mensagens para personalização automática
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-sm">
                {"{{subscriber_name}}"}
              </code>
              <span className="text-sm text-muted-foreground">Nome do assinante</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-sm">
                {"{{subscriber_email}}"}
              </code>
              <span className="text-sm text-muted-foreground">E-mail do assinante</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-sm">
                {"{{plan_name}}"}
              </code>
              <span className="text-sm text-muted-foreground">Nome do plano de assinatura</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-sm">
                {"{{plan_price}}"}
              </code>
              <span className="text-sm text-muted-foreground">Preço do plano de assinatura</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded bg-muted text-sm">
                {"{{next_billing_date}}"}
              </code>
              <span className="text-sm text-muted-foreground">Próxima data de cobrança</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubscriberTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
      />
    </div>
  );
}