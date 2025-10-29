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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get request body
    const { targetUserId } = await req.json();

    console.log('Renewing reseller credit for:', targetUserId);

    // Validate inputs
    if (!targetUserId) {
      throw new Error('Missing targetUserId');
    }

    // Check if requesting user is authorized
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey!, {
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

    // Check requesting user's role
    const { data: requestingRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .maybeSingle();

    const requestingRole = requestingRoleData?.role;

    if (!requestingRole || !['admin', 'master'].includes(requestingRole)) {
      throw new Error('Only admin and master users can renew credits');
    }

    // If master, check and deduct credit
    if (requestingRole === 'master') {
      const { data: creditData, error: creditError } = await supabaseAdmin
        .from('user_credits')
        .select('balance')
        .eq('user_id', requestingUser.id)
        .maybeSingle();

      if (creditError) throw creditError;

      if (!creditData || creditData.balance < 1) {
        throw new Error('Créditos insuficientes para renovar');
      }

      // Deduct credit
      const newBalance = creditData.balance - 1;
      const { error: updateError } = await supabaseAdmin
        .from('user_credits')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', requestingUser.id);

      if (updateError) throw updateError;

      // Get target user name
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('user_id', targetUserId)
        .single();

      // Record transaction
      await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: requestingUser.id,
          transaction_type: 'credit_spent',
          amount: -1,
          balance_after: newBalance,
          description: `Renovação do usuário ${targetProfile?.full_name || targetUserId}`,
          related_user_id: targetUserId,
          performed_by: requestingUser.id
        });
    }

    // Get current credit_expiry_date
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('credit_expiry_date')
      .eq('user_id', targetUserId)
      .single();

    // Calculate new expiry date (add 30 days to current or now)
    const currentExpiry = profileData?.credit_expiry_date ? new Date(profileData.credit_expiry_date) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update profile with new expiry date and set status to active
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        credit_expiry_date: newExpiry.toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', targetUserId);

    if (updateProfileError) throw updateProfileError;

    console.log('Credit renewed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        newExpiryDate: newExpiry.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Error in renew-reseller-credit function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
