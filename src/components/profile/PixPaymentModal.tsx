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
import { Tables } from '@/integrations/supabase/schema';
import { useAuth } from '@/contexts/AuthContext';

// Tipos para a cobrança PagBank
export type PagbankCharge = Tables<'pagbank_charges'>;

interface PixPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  amount: number;
  planName: string;
}

const SUPABASE_PROJECT_ID = "cgqyfpsfymhntumrmbzj";
const CREATE_CHARGE_EDGE_FUNCTION_NAME = "pagbank-create-charge";
const CREATE_CHARGE_EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${CREATE_CHARGE_EDGE_FUNCTION_NAME}`;

interface CreateChargeResponse {
  pagbank_charge_id: string;
  qr_code_image_url: string;
  qr_code_text: string;
  value: number;
}

const createPagbankCharge = async (payload: { subscription_id: string; amount: number }): Promise<CreateChargeResponse> => {
  console.log('createPagbankCharge: Fetching from Edge Function. Payload:', payload);
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
    console.error('createPagbankCharge: Fetch failed. Status:', response.status, 'Error Data:', errorData);
    throw new Error(errorData.error || "Erro ao criar cobrança PIX.");
  }

  const responseJson = await response.json();
  console.log('createPagbankCharge: Fetch successful. Response JSON:', responseJson);
  return responseJson;
};

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({ open, onOpenChange, subscriptionId, amount, planName }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createChargeMutation = useMutation<CreateChargeResponse, Error, { subscription_id: string; amount: number }>({
    mutationFn: createPagbankCharge,
    onSuccess: (data) => {
      console.log('PixPaymentModal: createChargeMutation onSuccess. Data:', data);
      setPagbankChargeId(data.pagbank_charge_id);
      setQrCodeImageUrl(data.qr_code_image_url);
      setQrCodeText(data.qr_code_text);
      toast.info("QR Code gerado!", { description: "Escaneie para pagar ou use o Copia e Cola." });
    },
    onError: (error) => {
      console.error('PixPaymentModal: createChargeMutation onError. Error:', error);
      toast.error("Erro ao gerar PIX", { description: "Não foi possível gerar o QR Code PIX. Tente novamente." });
      onOpenChange(false); // Fecha o modal em caso de erro
    },
  });

  const [pagbankChargeId, setPagbankChargeId] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'EXPIRED'>('PENDING');

  // Efeito para gerenciar o ciclo de vida do modal e da mutação
  useEffect(() => {
    if (open) {
      // Quando o modal abre, resetar o estado e iniciar a criação da cobrança
      console.log('PixPaymentModal: Modal became open. Resetting state and initiating charge.');
      setPagbankChargeId(null);
      setQrCodeImageUrl(null);
      setQrCodeText(null);
      setPaymentStatus('PENDING');
      createChargeMutation.reset(); // Resetar o estado da mutação para uma nova tentativa
      createChargeMutation.mutate({ subscription_id: subscriptionId, amount });
    } else {
      // Quando o modal fecha, limpar todo o estado
      console.log('PixPaymentModal: Modal became closed. Clearing all state.');
      setPagbankChargeId(null);
      setQrCodeImageUrl(null);
      setQrCodeText(null);
      setPaymentStatus('PENDING');
      createChargeMutation.reset(); // Resetar o estado da mutação também ao fechar
    }
  }, [open, subscriptionId, amount, createChargeMutation.mutate, createChargeMutation.reset]); // Dependências: open, subscriptionId, amount, e as funções de mutação

  // Efeito para o listener em tempo real
  useEffect(() => {
    if (!open || !pagbankChargeId || !user?.id) return;

    const channel = supabase.channel(`pagbank_charges:${pagbankChargeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pagbank_charges',
          filter: `pagbank_charge_id=eq.${pagbankChargeId}`,
        },
        (payload) => {
          const newCharge = payload.new as PagbankCharge;
          console.log('Realtime update for PagBank charge:', newCharge);
          if (newCharge.status === 'PAID') {
            setPaymentStatus('PAID');
            toast.success("Pagamento confirmado!", { description: "Sua assinatura foi renovada com sucesso." });
            queryClient.invalidateQueries({ queryKey: ['profileAndSubscription', user.id] }); // Invalida dados do perfil
            onOpenChange(false); // Fecha o modal
          } else if (newCharge.status === 'EXPIRED') {
            setPaymentStatus('EXPIRED');
            toast.error("Tempo Esgotado", { description: "O QR Code para pagamento expirou. Por favor, gere um novo." });
            onOpenChange(false); // Fecha o modal
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, pagbankChargeId, user?.id, queryClient, onOpenChange]);

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
          <DialogTitle>Pagamento via PIX</DialogTitle>
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
          ) : paymentStatus === 'PAID' ? (
            <div className="flex flex-col items-center justify-center h-64 text-success">
              <CheckCircle2 className="h-16 w-16 mb-4" />
              <p className="text-xl font-semibold">Pagamento Confirmado!</p>
              <p className="text-muted-foreground">Sua assinatura foi renovada.</p>
            </div>
          ) : (
            <>
              <img
                src={qrCodeImageUrl || ''}
                alt="QR Code PIX"
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