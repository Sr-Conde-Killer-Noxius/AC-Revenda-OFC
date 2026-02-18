import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, CheckCircle2, QrCode } from "lucide-react";

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  unitPrice: number;
}

export function BuyCreditsDialog({ open, onOpenChange, onSuccess, unitPrice }: BuyCreditsDialogProps) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    payment_id: string;
    qr_code_base64: string | null;
    copy_paste: string | null;
    total_price: number;
    amount_credits: number;
    status: string;
  } | null>(null);
  const [polling, setPolling] = useState(false);
  const [approved, setApproved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuantity("");
      setPaymentData(null);
      setPolling(false);
      setApproved(false);
      setCopied(false);
    }
  }, [open]);

  // Poll for payment status
  useEffect(() => {
    if (!paymentData || approved) return;

    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('mercado_pago_payments')
          .select('status')
          .eq('id', paymentData.payment_id)
          .maybeSingle();

        if (error) throw error;
        if (data?.status === 'approved') {
          setApproved(true);
          setPolling(false);
          clearInterval(interval);
          toast({ title: "Pagamento aprovado! 🎉", description: `${paymentData.amount_credits} crédito(s) adicionado(s) à sua conta.` });
          onSuccess();
        } else if (data?.status === 'rejected' || data?.status === 'cancelled') {
          setPolling(false);
          clearInterval(interval);
          toast({ title: "Pagamento recusado", description: "O pagamento foi recusado ou cancelado.", variant: "destructive" });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [paymentData, approved]);

  const handleCreatePayment = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast({ title: "Quantidade inválida", description: "Informe uma quantidade válida de créditos.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Não autenticado");

      const { data: result, error } = await supabase.functions.invoke('mp-create-payment', {
        body: { quantity: qty },
        headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      setPaymentData(result);
    } catch (error: any) {
      toast({ title: "Erro ao criar pagamento", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = useCallback(async () => {
    if (!paymentData?.copy_paste) return;
    try {
      await navigator.clipboard.writeText(paymentData.copy_paste);
      setCopied(true);
      toast({ title: "Código copiado!" });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  }, [paymentData?.copy_paste]);

  const totalPrice = quantity ? (parseInt(quantity) || 0) * unitPrice : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Comprar Créditos via PIX
          </DialogTitle>
          <DialogDescription>
            Valor por crédito: R$ {unitPrice.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        {approved ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-lg font-semibold text-center">Pagamento Aprovado!</p>
            <p className="text-sm text-muted-foreground text-center">
              {paymentData?.amount_credits} crédito(s) foram adicionados à sua conta.
            </p>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : !paymentData ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantidade de créditos</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            {totalPrice > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">R$ {totalPrice.toFixed(2)}</span>
              </p>
            )}
            <DialogFooter>
              <Button onClick={handleCreatePayment} disabled={loading || !quantity}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Gerar QR Code PIX
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {paymentData.amount_credits} crédito(s) — R$ {paymentData.total_price.toFixed(2)}
              </p>
              {paymentData.qr_code_base64 && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${paymentData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 rounded-lg border"
                  />
                </div>
              )}
              {polling && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando pagamento...
                </div>
              )}
            </div>

            {paymentData.copy_paste && (
              <Button variant="outline" className="w-full" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar Código PIX"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
