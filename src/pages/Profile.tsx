import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  // CardTitle, // Removido: 'CardTitle' is declared but its value is never read.
  // CardDescription, // Removido: 'CardDescription' is declared but its value is never read.
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// import { Label } from "@/components/ui/label"; // Removido
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, CreditCard, Key, Lock, Gem, Save, QrCode, ShieldCheck, LockKeyhole } from 'lucide-react';
import { toast } from "sonner";
import { useUserProfile, useUpdateProfile, useProfileAndSubscription } from '@/hooks/useProfileData';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
// import { cn } from '@/lib/utils'; // Removido: 'cn' is declared but its value is never read.
import { PixPaymentModal } from '@/components/profile/PixPaymentModal';
import { MercadoPagoPaymentModal } from '@/components/profile/MercadoPagoPaymentModal';
import { useActiveGateway } from '@/hooks/useActiveGateway';

export default function Profile() {
  const { user, isLoading: isLoadingAuth, isSubscriptionOverdue, role } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile, error: profileError } = useUserProfile();
  const { data: profileAndSubscription, isLoading: isLoadingProfileAndSubscription, error: subscriptionError } = useProfileAndSubscription();
  const { data: activeGateway, isLoading: isLoadingActiveGateway } = useActiveGateway();
  const updateProfileMutation = useUpdateProfile();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Estados dos modais de pagamento (Adicionado)
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isMercadoPagoModalForZeroPrice, setIsMercadoPagoModalForZeroPrice] = useState(false);

  const [searchParams] = useSearchParams();
  const missingPhone = searchParams.get('missingPhone');

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setTaxId(userProfile.tax_id || '');
      setPixKey(userProfile.pix_key || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (profileError) {
      toast.error("Erro ao carregar perfil", { description: profileError.message });
    }
    if (subscriptionError) {
      toast.error("Erro ao carregar assinatura", { description: subscriptionError.message });
    }
  }, [profileError, subscriptionError]);

  useEffect(() => {
    if (missingPhone === 'true') {
      toast.warning("Telefone Necessário", {
        description: "Por favor, adicione seu número de telefone para continuar usando o sistema.",
        duration: 5000,
      });
    }
  }, [missingPhone]);

  useEffect(() => {
    if (!isLoadingProfileAndSubscription && isSubscriptionOverdue && role !== 'admin' && profileAndSubscription?.subscription) {
      let descriptionMessage = "";
      if (profileAndSubscription.subscription.isFree) {
        descriptionMessage = "Sua assinatura está vencida. Por favor, entre em contato com seu revendedor para regularizar a situação.";
      } else {
        descriptionMessage = "Sua assinatura está vencida. Por favor, renove com PIX para regularizar a situação.";
      }
      toast.error("Assinatura Vencida", {
        description: descriptionMessage,
        duration: 10000,
        id: 'overdue-subscription-toast'
      });
    }
  }, [isLoadingProfileAndSubscription, isSubscriptionOverdue, role, profileAndSubscription]);


  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Erro", { description: "Usuário não autenticado." });
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name,
        phone,
        tax_id: taxId,
        pix_key: pixKey,
      });
    } catch (err: any) {
      // Erro já tratado pelo onError da mutation
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword || !confirmPassword) {
      setPasswordError("Por favor, preencha ambos os campos de senha.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }
      toast.success("Senha atualizada!", { description: "Sua senha foi alterada com sucesso." });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message);
      toast.error("Erro ao atualizar senha", { description: err.message });
    }
  };

  const getSubscriptionStatusDisplay = (status: string | undefined, isFree: boolean | undefined) => {
    if (!status) return { label: 'N/A', variant: 'secondary' as const };

    if (status === 'overdue') {
      return { label: 'Vencida', variant: 'destructive' as const };
    }
    if (status === 'inactive') {
      return { label: 'Inativa', variant: 'secondary' as const };
    }
    if (isFree) {
      return { label: 'Ativa (Grátis)', variant: 'default' as const };
    }
    return { label: 'Ativa', variant: 'default' as const };
  };

  const subscriptionStatus = getSubscriptionStatusDisplay(
    profileAndSubscription?.subscription?.status,
    profileAndSubscription?.subscription?.isFree
  );

  const isLoadingData = isLoadingAuth || isLoadingProfile || isLoadingProfileAndSubscription || isLoadingActiveGateway;

  // Lógica para determinar o gateway ativo e se o plano é gratuito
  const subscription = profileAndSubscription?.subscription;
  const isPagbankActive = activeGateway?.gateway_name === 'pagbank';
  const isMercadoPagoActive = activeGateway?.gateway_name === 'mercadopago';
  const isFreePlan = subscription?.isFree || (subscription?.price === 0);

  return (
    <div className="bg-background min-h-screen text-foreground p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Perfil</h1>
          <p className="text-muted-foreground mt-1">Atualize suas informações pessoais e gerencie sua assinatura.</p>
        </header>

        {isLoadingData ? (
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Carregando dados do perfil...</p>
            </div>
          </div>
        ) : (
          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Esquerda: Informações do Perfil e Segurança */}
            <div className="lg:col-span-2 space-y-8">
              {/* Card: Informações do Perfil */}
              <Card className="border bg-card text-card-foreground shadow-sm rounded-xl">
                <form onSubmit={handleProfileSubmit}>
                  <CardHeader className="flex flex-col space-y-1.5 p-6">
                    <h3 className="tracking-tight text-lg font-semibold text-foreground flex items-center">
                      <User className="w-5 h-5 mr-2 text-primary" /> Informações do Perfil
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Edite seu nome, e-mail, telefone e chave PIX.
                    </p>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nome"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            value={user?.email || ''}
                            readOnly
                            disabled
                            className="pl-10 bg-muted/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Ex: 5511984701079"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="taxId"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            placeholder="Seu CPF ou CNPJ (apenas números)"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="pixKey"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            placeholder="Sua chave PIX (e-mail, telefone ou aleatória)"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <div className="items-center p-6 bg-card/50 border-t border-border px-6 py-4 rounded-b-xl flex justify-end">
                    <Button type="submit" disabled={updateProfileMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Card: Segurança */}
              <Card className="border bg-card text-card-foreground shadow-sm rounded-xl">
                <form onSubmit={handlePasswordUpdate}>
                  <CardHeader className="flex flex-col space-y-1.5 p-6">
                    <h3 className="tracking-tight text-lg font-semibold text-foreground flex items-center">
                      <ShieldCheck className="w-5 h-5 mr-2 text-primary" /> Segurança
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Altere sua senha de acesso.
                    </p>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nova Senha"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmar Nova Senha"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                    {passwordError && (
                      <p className="text-destructive text-sm mt-4">{passwordError}</p>
                    )}
                  </CardContent>
                  <div className="items-center p-6 bg-card/50 border-t border-border px-6 py-4 rounded-b-xl flex justify-end">
                    <Button type="submit">
                      <LockKeyhole className="h-4 w-4 mr-2" />
                      Atualizar Senha
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Coluna Direita: Assinatura */}
            <div className="lg:col-span-1">
              <Card className="border bg-card text-card-foreground shadow-sm rounded-xl flex flex-col">
                <CardHeader className="flex flex-col space-y-1.5 p-6">
                  <h3 className="tracking-tight text-lg font-semibold text-foreground flex items-center">
                    <Gem className="w-5 h-5 mr-2 text-primary" /> Assinatura
                  </h3>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex flex-col justify-between">
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-4">
                    {subscription ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground whitespace-nowrap mr-2">{subscription.plan_name}</span>
                          <Badge variant={subscriptionStatus.variant} className="whitespace-nowrap">{subscriptionStatus.label}</Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-4xl font-bold text-foreground">
                            {subscription.price === 0 ? (
                              "R$ 0,00"
                            ) : (
                              subscription.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            )}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground text-center border-t border-border pt-3">
                          <p>
                            Próxima cobrança em{' '}
                            {subscription.next_billing_date
                              ? format(new Date(subscription.next_billing_date + 'T00:00:00'), 'dd/MM/yyyy')
                              : 'Sem data de vencimento'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground whitespace-nowrap mr-2">Sem Assinatura</span>
                          <Badge variant="secondary" className="whitespace-nowrap">Inativa</Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-4xl font-bold text-foreground">R$ 0,00</p>
                        </div>
                        <div className="text-sm text-muted-foreground text-center border-t border-border pt-3">
                          <p>Você não possui um plano ativo.</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
                {/* Conteúdo do CardFooter substituído conforme as instruções */}
                <CardFooter className="bg-card/50 border-t border-border px-6 py-4 rounded-b-xl">
                    {isPagbankActive && (
                        <Button
                            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                            onClick={() => {
                                if (!subscription) {
                                    toast.error("Erro", { description: "Você não possui uma assinatura ativa para renovar." });
                                    return;
                                }
                                setIsPixModalOpen(true);
                            }}
                            disabled={!subscription || isFreePlan}
                        >
                            <QrCode className="w-5 h-5 mr-2" />
                            Renovar com PIX
                        </Button>
                    )}
                    {isMercadoPagoActive && (
                        <Button
                            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                            onClick={() => {
                                if (!subscription) {
                                    toast.error("Erro", { description: "Você não possui uma assinatura ativa para renovar." });
                                    return;
                                }
                                setIsMercadoPagoModalForZeroPrice(true);
                            }}
                            disabled={!subscription || isFreePlan}
                        >
                            <QrCode className="w-5 h-5 mr-2" />
                            Renovar com PIX
                        </Button>
                    )}
                    {!isPagbankActive && !isMercadoPagoActive && (
                        <Button
                            className="w-full bg-muted-foreground text-muted"
                            disabled
                        >
                            Nenhum gateway de pagamento ativo
                        </Button>
                    )}
                </CardFooter>
              </Card>
            </div>
          </main>
        )}
      </div>

      {/* Modais de Pagamento (Adicionado) */}
      {isPixModalOpen && subscription && (
          <PixPaymentModal
              open={isPixModalOpen}
              onOpenChange={setIsPixModalOpen}
              subscriptionId={subscription.id}
              amount={subscription.price}
              planName={subscription.plan_name}
          />
      )}

      {isMercadoPagoModalForZeroPrice && subscription && (
          <MercadoPagoPaymentModal
              open={isMercadoPagoModalForZeroPrice}
              onOpenChange={setIsMercadoPagoModalForZeroPrice}
              subscriptionId={subscription.id}
              amount={subscription.price}
              planName={subscription.plan_name}
          />
      )}
    </div>
  );
}