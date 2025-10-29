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

    console.log('Checking for expired credits...');

    // Find profiles where credit_expiry_date has passed and status is active
    const { data: expiredProfiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, credit_expiry_date')
      .lt('credit_expiry_date', new Date().toISOString())
      .eq('status', 'active');

    if (fetchError) throw fetchError;

    if (!expiredProfiles || expiredProfiles.length === 0) {
      console.log('No expired credits found');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No expired credits found',
          count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${expiredProfiles.length} expired profiles`);

    // Update status to inactive for expired profiles
    const userIds = expiredProfiles.map(p => p.user_id);
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .in('user_id', userIds);

    if (updateError) throw updateError;

    console.log('Successfully updated expired profiles to inactive');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Updated ${expiredProfiles.length} expired profiles to inactive`,
        count: expiredProfiles.length,
        profiles: expiredProfiles.map(p => ({ 
          user_id: p.user_id, 
          full_name: p.full_name,
          expired_at: p.credit_expiry_date
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Error in check-expired-credits function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
