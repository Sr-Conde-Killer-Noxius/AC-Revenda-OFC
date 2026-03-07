

# Plano: Ajuste pontual - Renovar todos masters/resellers no Acerto Certo com vencimento 2030

## Resumo

Criar uma edge function temporaria `bulk-renew-acerto-certo` que:
1. Busca todos os usuarios com role `master` ou `reseller`
2. Atualiza no banco: `status = 'active'`, `credit_expiry_date = '2030-01-01'`, `expiry_date = '2030-01-01'`
3. Envia payload `update_user_status` com `newStatus: 'active'` para o Acerto Certo (URL: `https://cgqyfpsfymhntumrmbzj.supabase.co/functions/v1/revenda-webhook-listener`) para cada um dos 12 usuarios
4. Registra cada envio no `acerto_certo_webhook_history`

## Arquivo

### `supabase/functions/bulk-renew-acerto-certo/index.ts` (novo)

- Edge function protegida por service role (sem JWT, valida manualmente)
- Busca todos users com role IN ('master', 'reseller') na `user_roles`
- Para cada usuario:
  - Update `profiles` com `status = 'active'`, `credit_expiry_date = '2030-01-01T00:00:00Z'`, `expiry_date = '2030-01-01T00:00:00Z'`
  - Envia POST para o webhook Acerto Certo com payload `{ eventType: 'update_user_status', userId, newStatus: 'active' }`
  - Insere registro no `acerto_certo_webhook_history`
- Retorna resumo com sucesso/falha por usuario

## Detalhes tecnicos

- A funcao sera invocada uma unica vez via `supabase--curl_edge_functions`
- Usa `ACERTO_CERTO_API_KEY` (ja configurada) no header Authorization
- Busca webhook URL de `webhook_configs` (config_key = 'acerto_certo_webhook_url')
- Apos confirmar execucao, a edge function pode ser deletada (descartavel)

## Usuarios afetados (12)

| Nome | Role | Status atual |
|---|---|---|
| Eliandro Oliveira | reseller | active |
| 2Revenda.Teste | master | active |
| Alexsandro de Oliveira Sousa | master | inactive |
| CENTRAL STORE OFICIAL | master | inactive |
| Fran4111 | reseller | inactive |
| Kleydson Pessanha | master | inactive |
| MASTER MICHEL | reseller | active |
| Paulo Sergio | reseller | inactive |
| Revenda Eduardo | reseller | active |
| Revenda hamilton 20 | reseller | active |
| Revenda.Teste | master | inactive |
| Tiago | reseller | inactive |

