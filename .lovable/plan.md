

# Plano: Webhook Acerto Certo somente para role "cliente"

## Resumo

A integração com Acerto Certo passará a funcionar **somente para usuários com role "cliente"**. Para os demais roles (admin, master, reseller), o código do webhook será mantido no arquivo mas desativado via condicional + comentário explicativo. O código original fica intacto, apenas envolvido por uma verificação de role.

## Arquivos afetados

### 1. `supabase/functions/create-reseller-user/index.ts`
- Antes do bloco do webhook (linha ~249), adicionar verificação: `if (resellerRole === 'cliente') { ... }`
- O bloco inteiro do webhook (linhas ~249-393) fica dentro desse `if`
- Adicionar comentário: `// [18/02/2026] Integração Acerto Certo temporariamente restrita apenas a role 'cliente'. Demais roles não enviam webhook. Manter código comentado/condicional até segunda ordem.`
- No `else`, adicionar log: `console.log('Role is not cliente, skipping Acerto Certo webhook');`

### 2. `supabase/functions/create-test-reseller-user/index.ts`
- Mesmo tratamento: envolver o bloco do webhook (linhas ~171-294) com `if (resellerRole === 'cliente') { ... }`
- Mesmo comentário explicativo
- No `else`, log de skip

### 3. `supabase/functions/delete-reseller-user/index.ts`
- Antes do bloco do webhook (linha ~89), buscar a role do usuário sendo deletado na tabela `user_roles`
- Envolver todo o bloco de webhook + log de historico (linhas ~89-185) com `if (targetUserRole === 'cliente') { ... }`
- No `else`, pular direto para a exclusão do usuário (linha ~189)
- Mesmo comentário explicativo

### 4. `supabase/functions/update-reseller-user/index.ts`
- Antes do bloco de webhook de status (linha ~176), buscar a role do usuário alvo na tabela `user_roles`
- Envolver o bloco de webhook (linhas ~176-259) com verificação: só envia se a role do usuário alvo for `cliente`
- No `else`, log de skip
- Mesmo comentário explicativo

## Detalhes Tecnicos

### Padrao de alteracao em cada arquivo

Para `create-reseller-user` e `create-test-reseller-user`, o `resellerRole` ja esta disponivel no escopo, entao basta:

```typescript
// [18/02/2026] Integração Acerto Certo temporariamente restrita apenas a role 'cliente'.
// Demais roles (admin, master, reseller) não enviam webhook para Acerto Certo.
// Manter este condicional até segunda ordem.
if (resellerRole === 'cliente') {
  // ... bloco inteiro do webhook permanece intacto ...
} else {
  console.log(`Role '${resellerRole}' is not 'cliente', skipping Acerto Certo webhook.`);
}
```

Para `delete-reseller-user` e `update-reseller-user`, sera necessario buscar a role do usuario alvo antes do bloco de webhook:

```typescript
// Buscar role do usuario alvo para decidir se envia webhook
const { data: targetRoleData } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .maybeSingle();
const targetUserRole = targetRoleData?.role;

// [18/02/2026] Integração Acerto Certo temporariamente restrita apenas a role 'cliente'.
if (targetUserRole === 'cliente') {
  // ... bloco inteiro do webhook permanece intacto ...
} else {
  console.log(`Target user role '${targetUserRole}' is not 'cliente', skipping Acerto Certo webhook.`);
}
```

### Importante

- Nenhum codigo sera removido ou comentado com `//` - todo o codigo original permanece funcional, apenas protegido por um `if`
- Se no futuro quiser reativar para todos os roles, basta remover o `if`/`else`
- As 4 edge functions serao redeployadas automaticamente apos a edicao

