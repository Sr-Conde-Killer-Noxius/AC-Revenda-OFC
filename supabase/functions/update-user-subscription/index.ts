// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userRoleData, error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRoleError || userRoleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Access denied: Admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const { subscriptionId, userId, plan_name, price, status, next_billing_date } = await req.json();

      // Basic validation for always required fields
      if (!subscriptionId || !userId || !plan_name || price === undefined || status === undefined) {
        return new Response(JSON.stringify({ error: 'Missing required fields for subscription update.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch the subscriber plan to check if it's free
      const { data: subscriberPlan, error: planError } = await supabaseAdmin
        .from('subscriber_plans')
        .select('is_free')
        .eq('name', plan_name)
        .single();

      if (planError) {
        return new Response(JSON.stringify({ error: `Failed to fetch plan details: ${planError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isFreePlan = subscriberPlan?.is_free || false;

      // Adjusted validation for next_billing_date and price based on isFreePlan
      if (!isFreePlan) {
        if (next_billing_date === null || next_billing_date === undefined) {
          return new Response(JSON.stringify({ error: 'Next billing date is required for non-free plans.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (price <= 0) {
          return new Response(JSON.stringify({ error: 'Price must be positive for non-free plans.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else { // If it's a free plan, ensure price is 0 and next_billing_date is null
        if (price !== 0) {
          return new Response(JSON.stringify({ error: 'Price must be 0 for free plans.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (next_billing_date !== null) {
          return new Response(JSON.stringify({ error: 'Next billing date must be null for free plans.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_name,
          price,
          status,
          next_billing_date,
        })
        .eq('id', subscriptionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log financial entry for price changes or new subscriptions (if not free)
      if (price > 0) {
        const { error: financialEntryError } = await supabaseAdmin
          .from('admin_financial_entries')
          .insert({
            admin_user_id: user.id,
            subscriber_id: userId,
            description: `Atualização de assinatura para ${plan_name}`,
            value: price,
            type: 'income', // Assuming it's an income for the admin
          });

        if (financialEntryError) {
          console.error('Error inserting financial entry:', financialEntryError.message);
          // Don't throw, as subscription update is more critical
        }
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('Edge Function: Error in update-user-subscription:', error.message, error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});