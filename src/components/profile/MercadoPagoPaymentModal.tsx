import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy as CopyIcon, Loader2, X as XIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MercadoPagoCharge } from '@/integrations/supabase/schema'; // Importar o tipo MercadoPagoCharge
import { useAuth } from '@/contexts/AuthContext';

interface MercadoPagoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  amount: number;
  planName: string;
}

const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
const CREATE_CHARGE_EDGE_FUNCTION_NAME = "mercado-pago-create-charge"; // NOVO: Nome da Edge Function
const CREATE_CHARGE_EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${CREATE_CHARGE_EDGE_FUNCTION_NAME}`;

interface CreateChargeResponse {
  mercado_pago_payment_id: string;
  qr_code_image_url: string;
  qr_code_text: string;
  value: number;
}

const createMercadoPagoCharge = async (payload: { subscription_id: string; amount: number }): Promise<CreateChargeResponse> => {
  console.log('createMercadoPagoCharge: Fetching from Edge Function. Payload:', payload);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Usuário não autenticado.");

  const response = await fetch(CREATE_CHARGE_EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('createMercadoPagoCharge: Fetch failed. Status:', response.status, 'Error Data:', errorData);
    throw new Error(errorData.error || "Erro ao criar cobrança PIX do Mercado Pago.");
  }

  const responseJson = await response.json();
  console.log('createMercadoPagoCharge: Fetch successful. Response JSON:', responseJson);
  return responseJson;
};

export const MercadoPagoPaymentModal: React.FC<MercadoPagoPaymentModalProps> = ({ open, onOpenChange, subscriptionId, amount, planName }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createChargeMutation = useMutation<CreateChargeResponse, Error, { subscription_id: string; amount: number }>({
    mutationFn: createMercadoPagoCharge,
    onSuccess: (data) => {
      console.log('MercadoPagoPaymentModal: createChargeMutation onSuccess. Data:', data);
      setMercadoPagoPaymentId(data.mercado_pago_payment_id);
      setQrCodeImageUrl(data.qr_code_image_url);
      setQrCodeText(data.qr_code_text);
      toast.info("QR Code gerado!", { description: "Escaneie para pagar ou use o Copia e Cola." });
    },
    onError: (error) => {
      console.error('MercadoPagoPaymentModal: createChargeMutation onError. Error:', error);
      toast.error("Erro ao gerar PIX do Mercado Pago", { description: "Não foi possível gerar o QR Code PIX do Mercado Pago. Tente novamente." });
      onOpenChange(false); // Fecha o modal em caso de erro
    },
  });

  const [mercadoPagoPaymentId, setMercadoPagoPaymentId] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | 'cancelled'>('pending'); // NOVO: Status do Mercado Pago

  // Efeito para gerenciar o ciclo de vida do modal e da mutação
  useEffect(() => {
    if (open) {
      console.log('MercadoPagoPaymentModal: Modal became open. Resetting state and initiating charge.');
      setMercadoPagoPaymentId(null);
      setQrCodeImageUrl(null);
      setQrCodeText(null);
      setPaymentStatus('pending');
      createChargeMutation.reset(); // Resetar o estado da mutação para uma nova tentativa
      createChargeMutation.mutate({ subscription_id: subscriptionId, amount });
    } else {
      console.log('MercadoPagoPaymentModal: Modal became closed. Clearing all state.');
      setMercadoPagoPaymentId(null);
      setQrCodeImageUrl(null);
      setQrCodeText(null);
      setPaymentStatus('pending');
      createChargeMutation.reset(); // Resetar o estado da mutação também ao fechar
    }
  }, [open, subscriptionId, amount, createChargeMutation.mutate, createChargeMutation.reset]);

  // Efeito para o listener em tempo real
  useEffect(() => {
    if (!open || !mercadoPagoPaymentId || !user?.id) return;

    const channel = supabase.channel(`mercado_pago_charges:${mercadoPagoPaymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mercado_pago_charges',
          filter: `mercado_pago_payment_id=eq.${mercadoPagoPaymentId}`,
        },
        (payload) => {
          const newCharge = payload.new as MercadoPagoCharge;
          console.log('Realtime update for Mercado Pago charge:', newCharge);
          if (newCharge.status === 'approved') { // NOVO: Status 'approved'
            setPaymentStatus('approved');
            toast.success("Pagamento confirmado!", { description: "Sua assinatura foi renovada com sucesso." });
            queryClient.invalidateQueries({ queryKey: ['profileAndSubscription', user.id] }); // Invalida dados do perfil
            onOpenChange(false); // Fecha o modal
          } else if (newCharge.status === 'rejected' || newCharge.status === 'cancelled') { // NOVO: Status 'rejected' ou 'cancelled'
            setPaymentStatus(newCharge.status);
            toast.error("Pagamento não aprovado", { description: "A cobrança PIX foi rejeitada ou cancelada. Por favor, tente novamente." });
            onOpenChange(false); // Fecha o modal
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, mercadoPagoPaymentId, user?.id, queryClient, onOpenChange]);

  const handleCopyPixCode = useCallback(() => {
    if (qrCodeText) {
      navigator.clipboard.writeText(qrCodeText).then(() => {
        toast.success('Código PIX Copia e Cola copiado!');
      }).catch((err: Error) => {
        toast.error('Falha ao copiar o código.');
        console.error('Failed to copy: ', err);
      });
    }
  }, [qrCodeText]);

  const isLoadingContent = createChargeMutation.isPending || !qrCodeImageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento via Mercado Pago PIX</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código abaixo para renovar seu plano "{planName}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 text-center">
          {isLoadingContent ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground mt-4">Gerando QR Code...</p>
            </div>
          ) : paymentStatus === 'approved' ? ( // NOVO: Status 'approved'
            <div className="flex flex-col items-center justify-center h-64 text-success">
              <CheckCircle2 className="h-16 w-16 mb-4" />
              <p className="text-xl font-semibold">Pagamento Confirmado!</p>
              <p className="text-muted-foreground">Sua assinatura foi renovada.</p>
            </div>
          ) : (
            <>
              <img
                src={qrCodeImageUrl || ''}
                alt="QR Code PIX Mercado Pago"
                className="mx-auto rounded-lg border-4 border-white bg-white"
              />
              <p className="text-sm text-muted-foreground mt-4">
                Valor: <span className="font-bold text-foreground">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </p>
              <div className="space-y-2 text-left">
                <Label htmlFor="pix-code" className="block text-sm font-medium text-muted-foreground">PIX Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input
                    id="pix-code"
                    type="text"
                    readOnly
                    value={qrCodeText || ''}
                    className="truncate text-xs w-full rounded-md py-2 px-3"
                  />
                  <Button onClick={handleCopyPixCode} variant="outline" size="icon">
                    <CopyIcon size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoadingContent}>
            <XIcon className="h-4 w-4 mr-2" /> Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};