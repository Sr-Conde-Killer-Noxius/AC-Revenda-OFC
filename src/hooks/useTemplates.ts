import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/schema"; // Importar Tables do schema
import { useAuth } from '@/contexts/AuthContext'; // Importar useAuth

// Tipos para os dados do template
export interface Template extends Tables<'templates'> {
  profiles: { name: string | null } | null; // Resultado do join do Supabase
  creatorName?: string | null; // Propriedade mapeada para fácil acesso
}

// Hook para buscar todos os templates do usuário
export const useTemplates = () => {
  const { user, role, isLoading: isLoadingAuth } = useAuth(); // Obter user e role do AuthContext

  return useQuery<Template[], Error>({
    queryKey: ["templates", user?.id, role], // Adicionar role ao queryKey
    queryFn: async () => {
      if (!user?.id) throw new Error("Utilizador não autenticado");

      // Verificar se o perfil do usuário existe
      const { data: _profileData, error: profileError } = await supabase // Renomeado para _profileData
        .from("profiles")
        .select("id, name, email, tax_id")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') { // No rows found
        // Perfil não existe, criar um novo
        const { error: insertProfileError } = await supabase.from("profiles").insert({
          id: user.id,
          email: user.email!, // O email do usuário é obrigatório
          name: user.user_metadata?.full_name || user.email!, // Usar o nome completo se disponível, caso contrário, o email
          phone: null, // Inicializar phone como null
          pix_key: null, // Inicializar pix_key como null
          tax_id: "", // Inicializar tax_id como uma string vazia, pois é um campo obrigatório
        });

        if (insertProfileError) {
          console.error("Erro ao criar perfil:", insertProfileError.message);
          throw new Error("Erro ao criar perfil do usuário.");
        }
      } else if (profileError) {
        console.error("Erro ao buscar perfil:", profileError.message);
        throw new Error("Erro ao buscar perfil do usuário.");
      }

      let query = supabase
        .from("templates")
        .select("*, profiles(name)") // Seleciona todos os campos e o nome do perfil
        .order("created_at", { ascending: false });

      if (role === 'admin') {
        // Administradores veem todos os templates
        query = query; // Nenhuma condição adicional para admins
      } else {
        // Usuários comuns veem seus próprios templates, templates globais e templates padrão (user_id nulo)
        query = query.or(`user_id.eq.${user.id},type.eq.global,user_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);
      
      // Mapeia os dados para incluir a propriedade creatorName
      return data.map(template => ({
        ...template,
        creatorName: (template.profiles as { name: string | null } | null)?.name || null,
      })) as Template[];
    },
    enabled: !isLoadingAuth && !!user?.id, // Habilitar apenas se a autenticação estiver carregada e o usuário presente
  });
};

// Hook para criar um novo template
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<Template, Error, Omit<Tables<'templates'>, "id" | "created_at" | "updated_at">>({
    mutationFn: async (newTemplate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado");

      const { data, error } = await supabase
        .from("templates")
        .insert({ ...newTemplate, user_id: user.id })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Template; // Adicionar type assertion
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template criado com sucesso!");
    },
    onError: (_error) => toast.error("Erro ao criar template", { description: "Não foi possível criar o template. Tente novamente." }),
  });
};

// Hook para atualizar um template existente
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<Template, Error, Partial<Tables<'templates'>> & { id: string }>({
    mutationFn: async (updatedTemplate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado");

      const { id, ...updates } = updatedTemplate;
      const { data, error } = await supabase
        .from("templates")
        .update(updates)
        .eq("id", id!)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Template; // Adicionar type assertion
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template atualizado com sucesso!");
    },
    onError: (_error) => toast.error("Erro ao atualizar template", { description: "Não foi possível atualizar o template. Tente novamente." }),
  });
};

// Hook para deletar um template
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth(); // Obter a função do usuário

  return useMutation<void, Error, string>({
    mutationFn: async (templateId) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilizador não autenticado");

      let query = supabase
        .from("templates")
        .delete()
        .eq("id", templateId);

      // Se o usuário NÃO for admin, adicione o filtro user_id
      if (role !== 'admin') {
        query = query.eq("user_id", user.id);
      }

      const { error } = await query;

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deletado com sucesso!");
    },
    onError: (_error) => toast.error("Erro ao deletar template", { description: "Não foi possível excluir o template. Tente novamente." }),
  });
};