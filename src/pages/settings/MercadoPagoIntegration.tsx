import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Save, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";

interface MpConfig {
  id: string;
  user_id: string;
  access_token: string;
  public_key: string;
  unit_price: number;
  is_active: boolean;
  profile?: { full_name: string } | null;
}

export default function MercadoPagoIntegration() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [unitPrice, setUnitPrice] = useState("1.00");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Admin: all configs
  const [allConfigs, setAllConfigs] = useState<MpConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const loadMyConfig = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mercado_pago_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setAccessToken(data.access_token);
        setPublicKey(data.public_key);
        setUnitPrice(String(data.unit_price));
        setIsActive(data.is_active);
        setHasConfig(true);
      }
    } catch (error: any) {
      console.error('Error loading MP config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllConfigs = async () => {
    if (userRole !== 'admin') return;
    try {
      setLoadingConfigs(true);
      const { data: configs, error } = await supabase
        .from('mercado_pago_configs')
        .select('*');

      if (error) throw error;

      // Fetch profiles for each config
      const userIds = configs?.map(c => c.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      setAllConfigs((configs || []).map(c => ({
        ...c,
        profile: { full_name: profileMap.get(c.user_id) || 'N/A' },
      })));
    } catch (error: any) {
      console.error('Error loading all MP configs:', error);
    } finally {
      setLoadingConfigs(false);
    }
  };

  useEffect(() => {
    loadMyConfig();
    if (userRole === 'admin') loadAllConfigs();
  }, [user, userRole]);

  const handleSave = async () => {
    if (!user) return;
    if (!accessToken.trim() || !publicKey.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha o Access Token e a Public Key.", variant: "destructive" });
      return;
    }
    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Valor inválido", description: "O valor unitário deve ser maior que zero.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        user_id: user.id,
        access_token: accessToken.trim(),
        public_key: publicKey.trim(),
        unit_price: price,
        is_active: isActive,
      };

      if (hasConfig) {
        const { error } = await supabase
          .from('mercado_pago_configs')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mercado_pago_configs')
          .insert(payload);
        if (error) throw error;
        setHasConfig(true);
      }

      toast({ title: "Configuração salva!", description: "Suas credenciais do Mercado Pago foram salvas com sucesso." });
      if (userRole === 'admin') loadAllConfigs();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('mercado_pago_configs')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      setAccessToken("");
      setPublicKey("");
      setUnitPrice("1.00");
      setIsActive(true);
      setHasConfig(false);
      toast({ title: "Configuração removida" });
      if (userRole === 'admin') loadAllConfigs();
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAdminToggle = async (configId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('mercado_pago_configs')
        .update({ is_active: !currentValue })
        .eq('id', configId);
      if (error) throw error;
      loadAllConfigs();
      toast({ title: !currentValue ? "Ativado" : "Desativado" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Mercado Pago" />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Integração Mercado Pago" />

      <main className="container mx-auto p-4 sm:p-6 space-y-6">
        {/* My Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Minhas Credenciais
            </CardTitle>
            <CardDescription>
              Configure suas credenciais do Mercado Pago para receber pagamentos PIX dos seus subordinados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token</Label>
              <div className="relative">
                <Input
                  id="access_token"
                  type={showToken ? "text" : "password"}
                  placeholder="APP_USR-..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="public_key">Public Key</Label>
              <Input
                id="public_key"
                placeholder="APP_USR-..."
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Valor por Crédito (R$)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="1.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Integração ativa</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
              {hasConfig && (
                <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin: All Configs */}
        {userRole === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Todos os Usuários</CardTitle>
              <CardDescription>Gerencie as integrações Mercado Pago de todos os usuários.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConfigs ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : allConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário configurou o Mercado Pago ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Valor/Crédito</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>{config.profile?.full_name || 'N/A'}</TableCell>
                        <TableCell>R$ {Number(config.unit_price).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={config.is_active ? "default" : "secondary"}>
                            {config.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={config.is_active}
                            onCheckedChange={() => handleAdminToggle(config.id, config.is_active)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
