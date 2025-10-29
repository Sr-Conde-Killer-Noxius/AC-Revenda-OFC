# 🔍 Diagnóstico e Solução - Sistema de Agendamentos

## 📊 Status Atual

Sistema consolidado para usar **APENAS GitHub Actions** como gatilho de agendamentos.

### ✅ O que está funcionando:
- ✅ GitHub Actions configurado para rodar a cada minuto
- ✅ Edge Function `process-queue-and-send` com autenticação via `CRON_SECRET`
- ✅ Edge Function `send-scheduled-notification` para envio individual
- ✅ Logs detalhados adicionados em todas as funções
- ✅ Conversão de timezone correta (São Paulo → UTC)

### ⚠️ O que precisa ser verificado:
- ⚠️ Secret `CRON_SECRET` configurado no GitHub
- ⚠️ Cron jobs do `pg_cron` removidos do Supabase
- ⚠️ Notificações com datas corretas no banco

---

## 🛠️ Checklist de Verificação

### 1️⃣ Verificar Secret do GitHub

**Acesse:** `https://github.com/[seu-usuario]/[seu-repo]/settings/secrets/actions`

**Deve existir:**
- Nome: `CRON_SECRET`
- Valor: `6602ce61bfd824bc5d717aace971b77a1a3b5d484a24b90df5d06f5a86a73087`

**Como adicionar (se não existir):**
1. Clique em **"New repository secret"**
2. Name: `CRON_SECRET`
3. Secret: cole o valor acima
4. Clique em **"Add secret"**

---

### 2️⃣ Executar Diagnóstico SQL

**Acesse:** Supabase Dashboard → SQL Editor

**Execute o arquivo:** `diagnostico_agendamentos.sql`

**Preste atenção em:**

#### Query #4 - Notificações Atrasadas
```
Se mostrar registros aqui = GitHub Actions NÃO está rodando ou há erro
```

#### Query #6 - Cron Jobs Ativos
```
Deve estar VAZIO!
Se aparecer algum job = PROBLEMA! Execute a limpeza abaixo.
```

#### Query #8 - Formato de Timezone
```
Todas as datas devem estar em UTC
Devem ter formato: 2025-10-16T19:02:00.000Z
```

#### Query #9 - Resumo
```
"Pendentes atrasados" deve ser 0
Se for > 0 = há problema no agendamento
```

---

### 3️⃣ Limpar Cron Jobs (SE NECESSÁRIO)

Se a Query #6 mostrou cron jobs ativos, execute:

```sql
-- LIMPAR TODOS OS CRON JOBS
DO $$
DECLARE job_record RECORD;
BEGIN
  FOR job_record IN
    SELECT jobid, jobname FROM cron.job 
    WHERE jobname LIKE '%process%' OR jobname LIKE '%notification%'
  LOOP
    PERFORM cron.unschedule(job_record.jobname);
    RAISE NOTICE 'Removido: %', job_record.jobname;
  END LOOP;
END $$;

-- Verificar se foram removidos
SELECT * FROM cron.job;
```

**Resultado esperado:** Tabela vazia ou sem jobs relacionados a `process` ou `notification`.

---

### 4️⃣ Verificar Logs do GitHub Actions

**Acesse:** `https://github.com/[seu-usuario]/[seu-repo]/actions`

**Procure por:** "Process Notification Queue"

**Verifique:**
- ✅ Está rodando a cada minuto?
- ✅ Status: Success (verde)?
- ⚠️ Se status: Failed (vermelho) → clique e veja o erro

**Logs esperados (quando há notificações):**
```
Calling Supabase Edge Function...
HTTP/2 200 
{"message":"Processed 2 notifications."}
```

**Logs esperados (quando NÃO há notificações):**
```
Calling Supabase Edge Function...
HTTP/2 200 
{"message":"No notifications to process."}
```

---

### 5️⃣ Verificar Logs das Edge Functions

**Acesse:** Supabase Dashboard → Edge Functions → Logs

#### process-queue-and-send
**Procure por:**
```
✅ "Found X notifications where send_at <= ..."
✅ "Successfully invoked send-scheduled-notification for ID ..."
❌ "Error invoking send-scheduled-notification..." = PROBLEMA!
```

#### send-scheduled-notification
**Procure por:**
```
✅ "Notification XXX marked as 'sent' successfully"
✅ "Logged to webhook_history for XXX"
❌ "N8N Webhook error response..." = Problema com N8N/WhatsApp
```

---

### 6️⃣ Testar Agendamento Manual

Para criar um teste imediato:

```sql
-- Inserir notificação de teste para daqui a 2 minutos
INSERT INTO scheduled_notifications (
  user_id,
  client_id,
  template_id,
  automation_id,
  send_at,
  status
)
VALUES (
  '[SEU_USER_ID]', -- Pegue do seu perfil
  '[CLIENT_ID]',   -- ID de um cliente de teste
  '[TEMPLATE_ID]', -- ID de um template
  '[AUTOMATION_ID]', -- ID de uma automação
  NOW() + INTERVAL '2 minutes', -- Daqui a 2 minutos
  'pending'
);

-- Verificar se foi criado
SELECT * FROM scheduled_notifications 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Aguarde 3 minutos e verifique:**
```sql
-- Ver se o status mudou para 'sent'
SELECT id, status, send_at, created_at 
FROM scheduled_notifications 
WHERE created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;
```

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: "Unauthorized" nos logs do GitHub Actions

**Causa:** `CRON_SECRET` não configurado ou incorreto

**Solução:**
1. Vá para Settings → Secrets → Actions
2. Adicione ou atualize `CRON_SECRET`
3. Valor: `6602ce61bfd824bc5d717aace971b77a1a3b5d484a24b90df5d06f5a86a73087`

---

### Problema 2: Notificações ficam "pending" mesmo após o horário

**Causa Possível A:** GitHub Actions não está rodando
**Solução:** Vá em Actions e verifique se há execuções recentes

**Causa Possível B:** Erro na Edge Function
**Solução:** Veja logs no Supabase Dashboard → Edge Functions

**Causa Possível C:** Timezone incorreto
**Solução:** Execute Query #8 do diagnóstico para verificar formato das datas

---

### Problema 3: Status "processing" mas nunca muda para "sent"

**Causa:** Erro ao invocar `send-scheduled-notification`

**Solução:**
1. Veja logs de `process-queue-and-send`
2. Procure por mensagens de erro
3. Verifique se o webhook N8N está configurado corretamente

---

### Problema 4: Webhook N8N retorna erro

**Causa:** URL do webhook incorreta ou N8N offline

**Solução:**
1. Teste o webhook manualmente (via Postman ou curl)
2. Verifique `webhook_configs` no banco:
```sql
SELECT * FROM webhook_configs WHERE type = 'n8n_message_sender';
```
3. Confirme que a URL está correta e o N8N está online

---

### Problema 5: Mensagens não chegam no WhatsApp

**Causa:** Problema no N8N ou Evolution API

**Solução:**
1. Veja `webhook_history` para confirmar que o request foi feito
2. Verifique `status_code` (deve ser 200-299)
3. Veja `response_payload` para erros
```sql
SELECT 
  created_at,
  status_code,
  request_payload,
  response_payload
FROM webhook_history
WHERE webhook_type = 'n8n_message_outbound_automated'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 📝 Arquivos Importantes

- `.github/workflows/cron.yml` - Configuração do GitHub Actions
- `supabase/functions/process-queue-and-send/` - Função que busca notificações
- `supabase/functions/send-scheduled-notification/` - Função que envia individual
- `diagnostico_agendamentos.sql` - Script SQL de diagnóstico completo

---

## 🎯 Fluxo Esperado (Happy Path)

```
1. GitHub Actions roda a cada minuto
   ↓
2. Chama process-queue-and-send com CRON_SECRET
   ↓
3. Busca notificações pendentes onde send_at <= NOW()
   ↓
4. Para cada notificação:
   a. Atualiza status para 'processing'
   b. Invoca send-scheduled-notification
   c. Renderiza template com variáveis
   d. Envia para webhook N8N
   e. Atualiza status para 'sent'
   f. Loga em webhook_history
   ↓
5. Mensagem chega no WhatsApp
```

---

## 🆘 Precisa de Ajuda?

1. **Execute o diagnóstico SQL** (`diagnostico_agendamentos.sql`)
2. **Verifique os logs** (GitHub Actions + Supabase Edge Functions)
3. **Teste manualmente** (crie uma notificação de teste)
4. **Compartilhe os logs** relevantes para análise

---

**Data deste documento:** 2025-01-16  
**Versão do sistema:** GitHub Actions (único gatilho)
