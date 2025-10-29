# ⚡ AÇÃO IMEDIATA - Fazer Agendamentos Funcionarem AGORA

## 🎯 Objetivo
Fazer as notificações agendadas serem enviadas conforme o horário configurado.

---

## ✅ PASSO 1: Verificar Secret do GitHub (2 minutos)

1. Acesse: https://github.com/[seu-usuario]/[seu-repo]/settings/secrets/actions

2. **Procure por:** `CRON_SECRET`

3. **Se NÃO existir:**
   - Clique em **"New repository secret"**
   - Name: `CRON_SECRET`
   - Secret: `6602ce61bfd824bc5d717aace971b77a1a3b5d484a24b90df5d06f5a86a73087`
   - Salve

4. **Se já existir:**
   - Clique nele
   - **Update:** cole o valor `6602ce61bfd824bc5d717aace971b77a1a3b5d484a24b90df5d06f5a86a73087`
   - Salve

---

## ✅ PASSO 2: Limpar Cron Jobs Antigos (1 minuto)

1. Acesse: **Supabase Dashboard** → **SQL Editor**

2. Cole e execute:

```sql
-- Remover TODOS os cron jobs antigos
DO $$
DECLARE job_record RECORD;
BEGIN
  FOR job_record IN SELECT jobid, jobname FROM cron.job
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
    RAISE NOTICE 'Removido: %', job_record.jobname;
  END LOOP;
END $$;

-- Verificar
SELECT * FROM cron.job;
```

3. **Resultado esperado:** Tabela vazia (sem linhas)

---

## ✅ PASSO 3: Verificar Notificações Pendentes (1 minuto)

Cole e execute no SQL Editor:

```sql
-- Ver notificações que DEVERIAM ter sido enviadas
SELECT 
    sn.id,
    c.name AS cliente,
    sn.send_at AT TIME ZONE 'America/Sao_Paulo' AS "Agendado para (SP)",
    sn.status,
    EXTRACT(EPOCH FROM (NOW() - sn.send_at))/60 AS "Atrasado (min)"
FROM scheduled_notifications sn
LEFT JOIN clients c ON c.id = sn.client_id
WHERE sn.status = 'pending'
  AND sn.send_at <= NOW()
ORDER BY sn.send_at ASC;
```

**Se aparecer registros aqui:** São notificações atrasadas que devem ser enviadas.

---

## ✅ PASSO 4: Forçar Execução Imediata (1 minuto)

**Opção A - Via GitHub Actions (recomendado):**

1. Acesse: https://github.com/[seu-usuario]/[seu-repo]/actions
2. Clique em **"Process Notification Queue"** (workflow)
3. Clique em **"Run workflow"** → **"Run workflow"**
4. Aguarde 30 segundos
5. Veja os logs da execução

**Opção B - Via curl (alternativo):**

```bash
curl -X POST "https://cgqyfpsfymhntumrmbzj.supabase.co/functions/v1/process-queue-and-send" \
  -H "Authorization: Bearer 6602ce61bfd824bc5d717aace971b77a1a3b5d484a24b90df5d06f5a86a73087" \
  -H "Content-Type: application/json"
```

---

## ✅ PASSO 5: Verificar Resultado (1 minuto)

Execute no SQL Editor:

```sql
-- Ver o que foi enviado nos últimos 5 minutos
SELECT 
    sn.id,
    c.name AS cliente,
    sn.send_at AT TIME ZONE 'America/Sao_Paulo' AS "Enviado em (SP)",
    sn.status,
    sn.created_at
FROM scheduled_notifications sn
LEFT JOIN clients c ON c.id = sn.client_id
WHERE sn.created_at >= NOW() - INTERVAL '5 minutes'
   OR sn.updated_at >= NOW() - INTERVAL '5 minutes'
ORDER BY sn.created_at DESC;
```

**Status esperados:**
- ✅ `sent` = Enviado com sucesso!
- ⚠️ `processing` = Ainda processando (aguarde 30s)
- ❌ `failed` = Falhou (veja logs)
- ⏳ `pending` = Ainda não processado (problema!)

---

## ✅ PASSO 6: Ver Logs de Erro (SE algo falhou)

```sql
-- Ver erros no webhook_history
SELECT 
    created_at,
    c.name AS cliente,
    status_code,
    response_payload
FROM webhook_history wh
LEFT JOIN clients c ON c.id = wh.client_id
WHERE webhook_type = 'n8n_message_outbound_automated'
  AND created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

**Status Code:**
- ✅ `200-299` = Sucesso
- ❌ `400-499` = Erro no request (dados incorretos)
- ❌ `500-599` = Erro no servidor N8N

---

## 🔄 TESTE COMPLETO (Criar agendamento de teste)

```sql
-- 1. Pegar seus IDs
SELECT id AS user_id FROM auth.users LIMIT 1;
SELECT id AS client_id FROM clients LIMIT 1;
SELECT id AS template_id FROM templates LIMIT 1;
SELECT id AS automation_id FROM automations LIMIT 1;

-- 2. Criar teste para DAQUI A 2 MINUTOS
INSERT INTO scheduled_notifications (
  user_id,
  client_id,
  template_id,
  automation_id,
  send_at,
  status
)
VALUES (
  '[COLE_USER_ID]',
  '[COLE_CLIENT_ID]',
  '[COLE_TEMPLATE_ID]',
  '[COLE_AUTOMATION_ID]',
  NOW() + INTERVAL '2 minutes',
  'pending'
)
RETURNING id, send_at AT TIME ZONE 'America/Sao_Paulo' AS "Enviar em (SP)";

-- 3. AGUARDE 3 MINUTOS

-- 4. Verificar se foi enviado
SELECT id, status, send_at 
FROM scheduled_notifications 
WHERE created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

**Resultado esperado em 3 minutos:** status = `sent`

---

## 🚨 SE AINDA NÃO FUNCIONAR

### Debug GitHub Actions:

1. Acesse: https://github.com/[seu-usuario]/[seu-repo]/actions
2. Clique na execução mais recente
3. Veja se há erros no log
4. Procure por:
   - ❌ `Unauthorized` → Secret incorreto (volte ao Passo 1)
   - ❌ `404 Not Found` → URL da Edge Function incorreta
   - ✅ `200 OK` → Tudo certo com o GitHub Actions

### Debug Edge Functions:

1. Acesse: **Supabase Dashboard** → **Edge Functions** → **Logs**
2. Clique em **process-queue-and-send**
3. Procure por:
   - ✅ `Found X notifications...` → Encontrou notificações
   - ❌ `Error...` → Veja o erro específico
4. Clique em **send-scheduled-notification**
5. Procure por:
   - ✅ `Notification XXX marked as 'sent'` → Enviou!
   - ❌ `N8N Webhook error...` → Problema no N8N

### Verificar Webhook N8N:

```sql
SELECT url FROM webhook_configs WHERE type = 'n8n_message_sender';
```

Teste manualmente via curl:

```bash
curl -X POST "[URL_DO_N8N]" \
  -H "Content-Type: application/json" \
  -d '{
    "body": [{
      "contact_name": "Teste",
      "number": "5511999999999",
      "text": "Teste de webhook",
      "mode": "real"
    }]
  }'
```

---

## 📊 CHECKLIST FINAL

- [ ] Secret `CRON_SECRET` configurado no GitHub
- [ ] Cron jobs antigos removidos do Supabase (`cron.job` vazio)
- [ ] Notificações atrasadas processadas (query PASSO 3 sem resultados)
- [ ] GitHub Actions rodando a cada minuto (veja em Actions)
- [ ] Teste manual funcionou (status mudou para `sent`)
- [ ] Webhook N8N respondendo com 200 OK

**Se todos os itens estiverem marcados:** ✅ Sistema funcionando!

**Se algum item falhou:** Veja seção "SE AINDA NÃO FUNCIONAR" acima.

---

**⏱️ Tempo total estimado:** 6-10 minutos

**🎯 Objetivo:** Fazer notificações serem enviadas automaticamente a cada minuto via GitHub Actions.
