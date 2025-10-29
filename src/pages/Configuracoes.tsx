import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function Configuracoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [pixKey, setPixKey] = useState("");

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, cpf, pix_key')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setCpf(data.cpf || "");
        setPixKey(data.pix_key || "");
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error("Erro ao carregar suas informações");
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    // Validação de CPF obrigatório
    if (!cpf || cpf.trim() === "") {
      toast.error("O campo CPF é obrigatório");
      return;
    }

    // Validação básica de formato CPF (somente números, 11 dígitos)
    const cpfNumeros = cpf.replace(/\D/g, '');
    if (cpfNumeros.length !== 11) {
      toast.error("CPF deve conter 11 dígitos");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          email: email,
          cpf: cpfNumeros,
          pix_key: pixKey
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader
        title="Configurações"
        subtitle="Gerencie as configurações da sua conta"
      />

      <main className="flex-1 p-6 max-w-4xl">
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Informações da Conta</CardTitle>
              <CardDescription className="text-muted-foreground">
                Atualize suas informações pessoais e de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Nome</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="bg-background border-input text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="bg-background border-input text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 1234-5678"
                  className="bg-background border-input text-foreground"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-foreground">
                    CPF <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="Somente números"
                    maxLength={14}
                    className="bg-background border-input text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix_key" className="text-foreground">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Sua Chave PIX"
                    className="bg-background border-input text-foreground"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Notificações</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure como deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Novos Clientes</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificação quando um novo cliente for cadastrado
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Pagamentos</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificação sobre pagamentos recebidos
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Relatórios</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber relatórios semanais por e-mail
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              <CardDescription className="text-muted-foreground">
                Ações irreversíveis para sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Excluir Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
