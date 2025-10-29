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
import { useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "@/hooks/useTemplates"; // Importar useDeleteTemplate
import { Template, TemplateType } from "@/integrations/supabase/schema"; // Importar Template e TemplateType do schema
import { supabase } from "@/integrations/supabase/client"; // Importar supabase para obter user_id
import { useAuth } from "@/contexts/AuthContext"; // Importar useAuth

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

const templateSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  // category: z.enum(["pre_due", "due_today", "overdue", "celebratory"]), // REMOVIDO
  content: z.string().min(10, "Conteúdo deve ter no mínimo 10 caracteres"),
  type: z.enum(["normal", "global"]), // Removido .optional()
});

export function TemplateDialog({ open, onOpenChange, template }: TemplateDialogProps) {
  const { user, role } = useAuth(); // Obter user e role do AuthContext
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const deleteTemplateMutation = useDeleteTemplate(); // Usar o hook de delete

  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    // category: "pre_due" as TemplateCategory, // REMOVIDO
    content: "",
    type: "normal" as TemplateType, // Adicionado com valor padrão
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (open && template) {
      setFormData({
        name: template.name || "",
        // category: template.category || "pre_due", // REMOVIDO
        content: template.content || "",
        type: template.type || "normal", // Adicionado
      });
    } else if (open) {
      setFormData({
        name: "",
        // category: "pre_due", // REMOVIDO
        content: "",
        type: "normal", // Adicionado
      });
    }
  }, [open, template]);

  const isStandardTemplate = template?.user_id === null;
  const canEdit = (user && template?.user_id === user.id) || role === 'admin';
  const canDelete = canEdit; // A mesma lógica para deletar
  const isAdmin = role === 'admin'; // Para controlar visibilidade do campo 'type'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      if (template && !canEdit) throw new Error("Você não tem permissão para editar este template.");

      const validatedData = templateSchema.parse(formData);

      const templateData = {
        name: validatedData.name,
        // category: validatedData.category, // REMOVIDO
        content: validatedData.content,
        user_id: currentUserId, // Adicionar user_id aqui
        type: validatedData.type, // Adicionado
      };

      if (template) {
        await updateTemplateMutation.mutateAsync({ id: template.id, ...templateData });
        toast.success("Template atualizado!", { description: "As informações foram salvas com sucesso." });
      } else {
        // user_id é adicionado automaticamente pelo hook useCreateTemplate
        await createTemplateMutation.mutateAsync(templateData);
        toast.success("Template criado!", { description: "Novo template adicionado com sucesso." });
      }

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Erro de validação", { description: "Verifique os campos preenchidos e tente novamente." });
      } else {
        toast.error("Erro ao salvar template", { description: "Não foi possível salvar o template. Tente novamente." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!template) return;
    if (!canDelete) {
      toast.error("Permissão negada", { description: "Você não tem permissão para excluir este template." });
      return;
    }

    setLoading(true);
    try {
      await deleteTemplateMutation.mutateAsync(template.id);
      toast.success("Template excluído!", { description: "O template foi removido com sucesso." });
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao excluir template", { description: "Não foi possível excluir o template. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Template" : "Novo Template"}</DialogTitle>
          <DialogDescription>
            Configure o nome e conteúdo da mensagem.
            {isStandardTemplate && role !== 'admin' && (
              <span className="text-destructive ml-2"> (Template Padrão - Somente visualização)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Template *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Lembrete de Cobrança"
              required
              disabled={!!(template && !canEdit)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* REMOVIDO: Campo de seleção de categoria */}
            {isAdmin && ( // Campo 'type' visível apenas para admins
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Template *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: TemplateType) => setFormData({ ...formData, type: value })}
                  disabled={!!(template && !canEdit)} // Admins podem editar o tipo se tiverem permissão geral
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo da Mensagem *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Ex: Olá {{customer_name}}, seu plano {{plan_name}} vence em {{due_date}}..."
              rows={6}
              required
              disabled={!!(template && !canEdit)}
            />
            <p className="text-xs text-muted-foreground">
              Use placeholders como {"{{customer_name}}"}, {"{{plan_name}}"}, {"{{due_date}}"}, {"{{value}}"}, {"{{pix_key}}"}
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
            <Button type="submit" disabled={loading || createTemplateMutation.isPending || updateTemplateMutation.isPending || !!(template && !canEdit)}>
              {loading || createTemplateMutation.isPending || updateTemplateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}