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
      .select('user_id, full_name, credit_expiry_date, status') // Also select current status
      .lt('credit_expiry_date', new Date().toISOString())
      .eq('status', 'active'); // Only consider active profiles

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

    const updatedProfiles: { user_id: string; full_name: string | null; expired_at: string | null; new_status: string; update_result: any }[] = [];

    for (const profile of expiredProfiles) {
      // Invoke update-reseller-user to change status and trigger webhook
      console.log(`Invoking update-reseller-user for user ${profile.user_id} to set status to 'inactive'`);
      
      const updateResellerUserUrl = `${supabaseUrl}/functions/v1/update-reseller-user`;
      
      const invokeResponse = await fetch(updateResellerUserUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}` // Use service role key for internal function call
        },
        body: JSON.stringify({
          userId: profile.user_id,
          status: 'inactive',
          // Do not pass email, fullName, password, etc., as we only want to update status
        }),
      });

      const invokeResponseBody = await invokeResponse.json();

      if (!invokeResponse.ok) {
        console.error(`Failed to invoke update-reseller-user for user ${profile.user_id}:`, invokeResponseBody);
        // Continue processing other profiles even if one fails
      } else {
        console.log(`Successfully invoked update-reseller-user for user ${profile.user_id}. Response:`, invokeResponseBody);
      }

      updatedProfiles.push({
        user_id: profile.user_id,
        full_name: profile.full_name,
        expired_at: profile.credit_expiry_date,
        new_status: 'inactive',
        update_result: invokeResponseBody,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Attempted to update ${expiredProfiles.length} expired profiles to inactive`,
        count: expiredProfiles.length,
        profiles: updatedProfiles
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