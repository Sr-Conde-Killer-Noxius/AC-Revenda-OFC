import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useCreateSubscriberTemplate, useUpdateSubscriberTemplate, useDeleteSubscriberTemplate } from "@/hooks/useSubscriberManagement";
import { SubscriberTemplate, TemplateType } from "@/integrations/supabase/schema"; // Corrected import path
import { useAuth } from "@/contexts/AuthContext";
import { Constants } from "@/integrations/supabase/types"; // Import Constants

interface SubscriberTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: SubscriberTemplate | null;
}

const subscriberTemplateSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  content: z.string().min(10, "Conteúdo deve ter no mínimo 10 caracteres"),
  type: z.enum([...Constants.public.Enums.template_type]).optional(), // Use spread operator
});

type SubscriberTemplateFormData = z.infer<typeof subscriberTemplateSchema>; // Infer type from schema

export function SubscriberTemplateDialog({ open, onOpenChange, template }: SubscriberTemplateDialogProps) {
  const { user, role } = useAuth();
  const createTemplateMutation = useCreateSubscriberTemplate();
  const updateTemplateMutation = useUpdateSubscriberTemplate();
  const deleteTemplateMutation = useDeleteSubscriberTemplate();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    content: "",
    type: "normal" as TemplateType,
  });

  useEffect(() => {
    if (open && template) {
      setFormData({
        name: template.name || "",
        content: template.content || "",
        type: template.type || "normal",
      });
    } else if (open) {
      setFormData({
        name: "",
        content: "",
        type: "normal",
      });
    }
    console.log('SubscriberTemplateDialog: Current user role:', role);
    console.log('SubscriberTemplateDialog: Can edit:', role === 'admin');
    console.log('SubscriberTemplateDialog: Can delete:', role === 'admin');
    console.log('SubscriberTemplateDialog: Template ID:', template?.id);
  }, [open, template, role]); // Added dependencies

  const canEdit = role === 'admin';
  const canDelete = role === 'admin';
  const isAdmin = role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) throw new Error("Usuário não autenticado.");
      // A permissão de edição é verificada aqui, mas a lógica de ID só se aplica se for uma edição.
      if (!canEdit) throw new Error("Você não tem permissão para editar este template.");

      const validatedData: SubscriberTemplateFormData = subscriberTemplateSchema.parse(formData);

      const templateData = {
        name: validatedData.name,
        content: validatedData.content,
        admin_user_id: user.id,
        type: validatedData.type,
      };

      if (template) { // Se 'template' existe, é uma operação de EDIÇÃO
        if (!template.id) { // Apenas verifica o ID se for uma edição
          throw new Error("ID do template não encontrado para atualização.");
        }
        console.log("SubscriberTemplateDialog: Calling updateTemplateMutation with ID:", template.id, "and data:", templateData); // Log de depuração
        await updateTemplateMutation.mutateAsync({ id: template.id, ...templateData });
        toast.success("Template de assinante atualizado!", { description: "As informações foram salvas com sucesso." });
      } else { // Se 'template' é null, é uma operação de CRIAÇÃO
        console.log("SubscriberTemplateDialog: Calling createTemplateMutation with data:", templateData); // Log de depuração
        await createTemplateMutation.mutateAsync(templateData);
        toast.success("Template de assinante criado!", { description: "Novo template adicionado com sucesso." });
      }

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Erro de validação", { description: "Verifique os campos preenchidos e tente novamente." });
      } else {
        toast.error("Erro ao salvar template de assinante", { description: "Não foi possível salvar o template de assinante. Tente novamente." });
      }
      console.error("SubscriberTemplateDialog: Error in handleSubmit:", error); // Log the error
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!template) return; // Se não há template, não há o que deletar
    if (!canDelete) {
      toast.error("Permissão negada", { description: "Você não tem permissão para excluir este template." });
      return;
    }
    if (!template.id) { // O ID é sempre necessário para deletar
      toast.error("Erro", { description: "ID do template não encontrado para exclusão." });
      return;
    }

    setLoading(true);
    try {
      console.log("SubscriberTemplateDialog: Calling deleteTemplateMutation with ID:", template.id); // Log de depuração
      await deleteTemplateMutation.mutateAsync(template.id);
      toast.success("Template de assinante excluído!", { description: "O template foi removido com sucesso." });
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao excluir template de assinante", { description: "Não foi possível excluir o template de assinante. Tente novamente." });
      console.error("SubscriberTemplateDialog: Error in handleDeleteTemplate:", error); // Log the error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Template de Assinante" : "Novo Template de Assinante"}</DialogTitle>
          <DialogDescription>
            Configure o nome e conteúdo da mensagem para os assinantes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Template *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Lembrete de Renovação"
              required
              disabled={!canEdit}
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Template *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TemplateType) => setFormData({ ...formData, type: value })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (Privado)</SelectItem>
                  <SelectItem value="global">Global (Público)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo da Mensagem *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Ex: Olá {{subscriber_name}}, seu plano {{plan_name}} vence em {{next_billing_date}}..."
              rows={6}
              required
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Use placeholders como {"{{subscriber_name}}"}, {"{{subscriber_email}}"}, {"{{plan_name}}"}, {"{{plan_price}}"}, {"{{next_billing_date}}"}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {template && canDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteTemplate}
                disabled={loading || deleteTemplateMutation.isPending}
              >
                {loading || deleteTemplateMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || createTemplateMutation.isPending || updateTemplateMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || createTemplateMutation.isPending || updateTemplateMutation.isPending || !canEdit}>
              {loading || createTemplateMutation.isPending || updateTemplateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}