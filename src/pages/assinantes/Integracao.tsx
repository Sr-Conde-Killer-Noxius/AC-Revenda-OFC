import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save as SaveIcon, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { usePagbankConfig, useSavePagbankConfig } from '@/hooks/usePagbankConfig';
import { useMercadoPagoConfig, useSaveMercadoPagoConfig } from '@/hooks/useMercadoPagoConfig';
import { useActiveGateway, useSaveActiveGateway } from '@/hooks/useActiveGateway';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const pagbankConfigSchema = z.object({
  pagbank_email: z.string().email("E-mail inválido").min(1, "E-mail é obrigatório"),
  pagbank_token: z.string().min(1, "Token é obrigatório"),
  pagbank_pix_key: z.string().min(1, "Chave PIX é obrigatória"),
  environment: z.enum(['sandbox', 'production'], { message: "Ambiente inválido" }),
});

const mercadoPagoConfigSchema = z.object({
  mercado_pago_public_key: z.string().min(1, "Public Key é obrigatória"),
  mercado_pago_access_token: z.string().min(1, "Access Token é obrigatório"),
  mercado_pago_client_id: z.string().min(1, "Client ID é obrigatório"),
  mercado_pago_client_secret: z.string().min(1, "Client Secret é obrigatório"),
});

export default function IntegracaoPagbank() {
  // PagBank Hooks
  const { data: pagbankConfig, isLoading: isLoadingPagbank, error: pagbankError } = usePagbankConfig();
  const savePagbankConfigMutation = useSavePagbankConfig();

  // Mercado Pago Hooks
  const { data: mercadoPagoConfig, isLoading: isLoadingMercadoPago, error: mercadoPagoError } = useMercadoPagoConfig();
  const saveMercadoPagoConfigMutation = useSaveMercadoPagoConfig();

  // Active Gateway Hooks
  const { data: activeGateway, isLoading: isLoadingActiveGateway, error: activeGatewayError } = useActiveGateway();
  const saveActiveGatewayMutation = useSaveActiveGateway();

  // PagBank State
  const [pagbankFormData, setPagbankFormData] = useState({
    pagbank_email: '',
    pagbank_token: '',
    pagbank_pix_key: '',
    environment: 'sandbox' as 'sandbox' | 'production',
  });

  // Mercado Pago State
  const [mercadoPagoFormData, setMercadoPagoFormData] = useState({
    mercado_pago_public_key: '',
    mercado_pago_access_token: '',
    mercado_pago_client_id: '',
    mercado_pago_client_secret: '',
  });
  const [showMpAccessToken, setShowMpAccessToken] = useState(false);
  const [showMpClientSecret, setShowMpClientSecret] = useState(false);

  // Active Gateway State
  const [selectedActiveGateway, setSelectedActiveGateway] = useState<string>('pagbank');

  // PagBank Effects
  useEffect(() => {
    if (pagbankConfig) {
      setPagbankFormData({
        pagbank_email: pagbankConfig.pagbank_email || '',
        pagbank_token: pagbankConfig.pagbank_token || '',
        pagbank_pix_key: pagbankConfig.pagbank_pix_key || '',
        environment: pagbankConfig.environment || 'sandbox',
      });
    }
  }, [pagbankConfig]);

  useEffect(() => {
    if (pagbankError) {
      toast.error("Erro ao carregar configurações do PagBank", { description: "Não foi possível carregar as configurações do PagBank. Tente novamente." });
    }
  }, [pagbankError]);

  // Mercado Pago Effects
  useEffect(() => {
    if (mercadoPagoConfig) {
      setMercadoPagoFormData({
        mercado_pago_public_key: mercadoPagoConfig.mercado_pago_public_key || '',
        mercado_pago_access_token: mercadoPagoConfig.mercado_pago_access_token || '',
        mercado_pago_client_id: mercadoPagoConfig.mercado_pago_client_id || '',
        mercado_pago_client_secret: mercadoPagoConfig.mercado_pago_client_secret || '',
      });
    }
  }, [mercadoPagoConfig]);

  useEffect(() => {
    if (mercadoPagoError) {
      toast.error("Erro ao carregar configurações do Mercado Pago", { description: "Não foi possível carregar as configurações do Mercado Pago. Tente novamente." });
    }
  }, [mercadoPagoError]);

  // Active Gateway Effects
  useEffect(() => {
    if (activeGateway) {
      setSelectedActiveGateway(activeGateway.gateway_name);
    } else if (!isLoadingActiveGateway && !activeGatewayError) {
      // Se não houver gateway ativo configurado, define PagBank como padrão no frontend
      setSelectedActiveGateway('pagbank');
    }
  }, [activeGateway, isLoadingActiveGateway, activeGatewayError]);

  useEffect(() => {
    if (activeGatewayError) {
      toast.error("Erro ao carregar gateway ativo", { description: "Não foi possível carregar o gateway de pagamento ativo. Tente novamente." });
    }
  }, [activeGatewayError]);

  // PagBank Submit Handler
  const handlePagbankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = pagbankConfigSchema.parse(pagbankFormData);
      await savePagbankConfigMutation.mutateAsync(validatedData);
    } catch (validationError: any) {
      if (validationError instanceof z.ZodError) {
        toast.error("Erro de validação (PagBank)", { description: "Verifique os campos preenchidos e tente novamente." });
      } else {
        toast.error("Erro ao salvar configurações (PagBank)", { description: "Não foi possível salvar as configurações do PagBank. Tente novamente." });
      }
    }
  };

  // Mercado Pago Submit Handler
  const handleMercadoPagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = mercadoPagoConfigSchema.parse(mercadoPagoFormData);
      await saveMercadoPagoConfigMutation.mutateAsync(validatedData);
    } catch (validationError: any) {
      if (validationError instanceof z.ZodError) {
        toast.error("Erro de validação (Mercado Pago)", { description: "Verifique os campos preenchidos e tente novamente." });
      } else {
        toast.error("Erro ao salvar configurações (Mercado Pago)", { description: "Não foi possível salvar as configurações do Mercado Pago. Tente novamente." });
      }
    }
  };

  // Handle Active Gateway Change
  const handleActiveGatewayChange = async (value: string) => {
    setSelectedActiveGateway(value);
    try {
      await saveActiveGatewayMutation.mutateAsync(value);
    } catch (error: any) {
      // Erro já tratado no hook, mas podemos adicionar um fallback aqui se necessário
      console.error("Failed to save active gateway:", error);
    }
  };

  const isLoadingPage = isLoadingPagbank || isLoadingMercadoPago || isLoadingActiveGateway;

  if (isLoadingPage) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Skeletons */}
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-full" />

        {/* Active Gateway Section Skeleton */}
        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="p-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>

        {/* Forms Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="flex flex-col space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32 self-end" />
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="flex flex-col space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32 self-end" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cabeçalho da Página */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Integrações de Pagamento</h1>
        <p className="mt-2 text-muted-foreground">Configure suas credenciais e selecione o gateway de pagamento ativo para a geração de QR Codes.</p>
      </div>

      {/* Seleção de Integração Ativa */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="p-6">
          <CardTitle className="text-lg font-semibold text-foreground">Gateway de Pagamento Ativo</CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">Selecione qual integração será utilizada para gerar as cobranças e QR Codes para os assinantes.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingActiveGateway ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <RadioGroup
              value={selectedActiveGateway}
              onValueChange={handleActiveGatewayChange}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              disabled={saveActiveGatewayMutation.isPending}
            >
              <div>
                <RadioGroupItem value="pagbank" id="pagbank_active" className="sr-only" />
                <Label
                  htmlFor="pagbank_active"
                  className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-lg cursor-pointer border-2 border-transparent transition-all",
                    "hover:bg-muted/50",
                    selectedActiveGateway === 'pagbank' ? "border-primary bg-primary/10" : "bg-muted/20"
                  )}
                >
                  {/* Substitua por um logo real do PagBank */}
                  <span className="text-2xl mb-2">🏦</span>
                  <span className="font-medium text-foreground">PagBank</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="mercadopago" id="mercadopago_active" className="sr-only" />
                <Label
                  htmlFor="mercadopago_active"
                  className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-lg cursor-pointer border-2 border-transparent transition-all",
                    "hover:bg-muted/50",
                    selectedActiveGateway === 'mercadopago' ? "border-primary bg-primary/10" : "bg-muted/20"
                  )}
                >
                  {/* Substitua por um logo real do Mercado Pago */}
                  <span className="text-2xl mb-2">💰</span>
                  <span className="font-medium text-foreground">Mercado Pago</span>
                </Label>
              </div>
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {/* Grid para as Configurações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PagBank Integration Card */}
        <Card className="border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle>Configurações PagBank</CardTitle>
            <CardDescription>Insira suas credenciais da API do PagBank para habilitar pagamentos PIX.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPagbank ? (
              <div className="flex flex-col space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-8 self-end" />
              </div>
            ) : (
              <form onSubmit={handlePagbankSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pagbank_email">E-mail da Conta PagBank *</Label>
                  <Input
                    id="pagbank_email"
                    type="email"
                    placeholder="seu@email.com"
                    value={pagbankFormData.pagbank_email}
                    onChange={(e) => setPagbankFormData({ ...pagbankFormData, pagbank_email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pagbank_token">Token de Acesso PagBank *</Label>
                  <Input
                    id="pagbank_token"
                    type="password"
                    placeholder="Seu token de acesso PagBank"
                    value={pagbankFormData.pagbank_token}
                    onChange={(e) => setPagbankFormData({ ...pagbankFormData, pagbank_token: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pagbank_pix_key">Chave PIX de Recebimento *</Label>
                  <Input
                    id="pagbank_pix_key"
                    type="text"
                    placeholder="Sua chave PIX (CPF, e-mail, telefone ou aleatória)"
                    value={pagbankFormData.pagbank_pix_key}
                    onChange={(e) => setPagbankFormData({ ...pagbankFormData, pagbank_pix_key: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ambiente PagBank *</Label>
                  <RadioGroup
                    value={pagbankFormData.environment}
                    onValueChange={(value: 'sandbox' | 'production') => setPagbankFormData({ ...pagbankFormData, environment: value })}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sandbox" id="env-pagbank-sandbox" />
                      <Label htmlFor="env-pagbank-sandbox">Teste (Sandbox)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="production" id="env-pagbank-production" />
                      <Label htmlFor="env-pagbank-production">Produção</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={savePagbankConfigMutation.isPending}>
                    {savePagbankConfigMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="h-4 w-4 mr-2" /> Salvar Configurações
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Mercado Pago Integration Card */}
        <Card className="border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle>Configurações Mercado Pago</CardTitle>
            <CardDescription>Configure suas credenciais de produção do Mercado Pago.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMercadoPago ? (
              <div className="flex flex-col space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32 self-end" />
              </div>
            ) : (
              <form onSubmit={handleMercadoPagoSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mercado-pago-public-key">Public Key *</Label>
                  <Input
                    id="mercado-pago-public-key"
                    type="text"
                    placeholder="APP_USR-..."
                    value={mercadoPagoFormData.mercado_pago_public_key}
                    onChange={(e) => setMercadoPagoFormData({ ...mercadoPagoFormData, mercado_pago_public_key: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mercado-pago-access-token">Access Token *</Label>
                  <div className="relative">
                    <Input
                      id="mercado-pago-access-token"
                      type={showMpAccessToken ? "text" : "password"}
                      placeholder="APP_USR-..."
                      value={mercadoPagoFormData.mercado_pago_access_token}
                      onChange={(e) => setMercadoPagoFormData({ ...mercadoPagoFormData, mercado_pago_access_token: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowMpAccessToken(!showMpAccessToken)}
                    >
                      {showMpAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mercado-pago-client-id">Client ID *</Label>
                  <Input
                    id="mercado-pago-client-id"
                    type="text"
                    placeholder="95..."
                    value={mercadoPagoFormData.mercado_pago_client_id}
                    onChange={(e) => setMercadoPagoFormData({ ...mercadoPagoFormData, mercado_pago_client_id: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mercado-pago-client-secret">Client Secret *</Label>
                  <div className="relative">
                    <Input
                      id="mercado-pago-client-secret"
                      type={showMpClientSecret ? "text" : "password"}
                      placeholder="************"
                      value={mercadoPagoFormData.mercado_pago_client_secret}
                      onChange={(e) => setMercadoPagoFormData({ ...mercadoPagoFormData, mercado_pago_client_secret: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowMpClientSecret(!showMpClientSecret)}
                    >
                      {showMpClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saveMercadoPagoConfigMutation.isPending}>
                    {saveMercadoPagoConfigMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="h-4 w-4 mr-2" /> Salvar Configurações
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}