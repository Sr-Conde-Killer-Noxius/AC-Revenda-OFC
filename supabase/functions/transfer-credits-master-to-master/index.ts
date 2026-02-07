import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

    if (!supabaseAnonKey) {
      throw new Error('Missing SUPABASE_ANON_KEY');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: { user: requestingUser } } = await supabaseClient.auth.getUser(token);
    
    if (!requestingUser) {
      throw new Error('Unauthorized');
    }

    const { data: requestingRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    const requestingRole = requestingRoleData?.role;
    if (requestingRole !== 'master' && requestingRole !== 'reseller') {
      throw new Error('Only master or reseller users can transfer credits');
    }

    const { targetUserId, amount } = await req.json();

    if (!targetUserId || !amount || amount === 0) {
      throw new Error('Missing or invalid required fields: targetUserId and a non-zero amount are required.');
    }

    const isRemoval = amount < 0;
    const absAmount = Math.abs(amount);

    // 1. Check credits
    const { data: initiatorCredits, error: initiatorCreditsError } = await supabaseAdmin
      .from('user_credits')
      .select('balance')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    if (initiatorCreditsError) throw initiatorCreditsError;
    const currentInitiatorBalance = initiatorCredits?.balance || 0;

    const { data: targetCredits, error: targetCreditsError } = await supabaseAdmin
      .from('user_credits')
      .select('balance')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (targetCreditsError && targetCreditsError.code !== 'PGRST116') throw targetCreditsError;
    const currentTargetBalance = targetCredits?.balance || 0;

    if (isRemoval) {
      // Removing credits from target → credits return to initiator
      if (currentTargetBalance < absAmount) {
        throw new Error(`O usuário alvo tem apenas ${currentTargetBalance} créditos. Não é possível remover ${absAmount}.`);
      }
    } else {
      // Adding credits to target → deduct from initiator
      if (currentInitiatorBalance < absAmount) {
        throw new Error(`Créditos insuficientes. Saldo atual: ${currentInitiatorBalance}`);
      }
    }

    // 2. Calculate new balances
    let newInitiatorBalance: number;
    let newTargetBalance: number;

    if (isRemoval) {
      // Remove from target, return to initiator
      newTargetBalance = currentTargetBalance - absAmount;
      newInitiatorBalance = currentInitiatorBalance + absAmount;
    } else {
      // Add to target, deduct from initiator
      newInitiatorBalance = currentInitiatorBalance - absAmount;
      newTargetBalance = currentTargetBalance + absAmount;
    }

    // 3. Update balances
    const { error: updateInitiatorError } = await supabaseAdmin
      .from('user_credits')
      .upsert({
        user_id: requestingUser.id,
        balance: newInitiatorBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (updateInitiatorError) throw updateInitiatorError;

    const { error: updateTargetError } = await supabaseAdmin
      .from('user_credits')
      .upsert({
        user_id: targetUserId,
        balance: newTargetBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (updateTargetError) throw updateTargetError;

    // Get requesting user's profile for the description
    const { data: requestingProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    const requestingUserName = requestingProfile?.full_name || requestingUser.id;
    const targetRoleLabel = targetRole === 'master' ? 'Master' : 'Revenda';
    const requestingRoleLabel = requestingRole === 'master' ? 'Master' : 'Revenda';

    // 4. Record transactions
    let transactionsToInsert;

    if (isRemoval) {
      transactionsToInsert = [
        {
          user_id: targetUserId,
          transaction_type: 'credit_spent',
          amount: -absAmount,
          balance_after: newTargetBalance,
          description: `Créditos removidos por ${requestingRoleLabel} ${requestingUserName}`,
          related_user_id: requestingUser.id,
          performed_by: requestingUser.id
        },
        {
          user_id: requestingUser.id,
          transaction_type: 'credit_added',
          amount: absAmount,
          balance_after: newInitiatorBalance,
          description: `Créditos devolvidos de ${targetRoleLabel} ${targetProfile.full_name || targetUserId}`,
          related_user_id: targetUserId,
          performed_by: requestingUser.id
        }
      ];
    } else {
      transactionsToInsert = [
        {
          user_id: requestingUser.id,
          transaction_type: 'credit_spent',
          amount: -absAmount,
          balance_after: newInitiatorBalance,
          description: `Transferência para ${targetRoleLabel} ${targetProfile.full_name || targetUserId}`,
          related_user_id: targetUserId,
          performed_by: requestingUser.id
        },
        {
          user_id: targetUserId,
          transaction_type: 'credit_added',
          amount: absAmount,
          balance_after: newTargetBalance,
          description: `Recebido de ${requestingRoleLabel} ${requestingUserName}`,
          related_user_id: requestingUser.id,
          performed_by: requestingUser.id
        }
      ];
    }

    const { error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert(transactionsToInsert);

    if (transactionError) throw transactionError;

    const action = isRemoval ? 'removidos de' : 'transferidos para';
    console.log(`Credits ${action} ${targetUserId} by ${requestingUser.id}. Amount: ${absAmount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${absAmount} crédito(s) ${action} ${targetProfile.full_name || targetUserId} com sucesso.`,
        newInitiatorBalance,
        newTargetBalance,
        targetUser: targetProfile.full_name || targetUserId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in transfer-credits-master-to-master function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});