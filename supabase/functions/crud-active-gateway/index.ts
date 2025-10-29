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
      console.error('Edge Function: User authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user role using service role to bypass RLS for user_roles table
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { method } = req;

    // Para operações GET, qualquer usuário autenticado pode ler o gateway ativo.
    // A verificação de função de admin é necessária apenas para POST/PUT.
    if (method !== 'GET') {
      const { data: userRoleData, error: userRoleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (userRoleError || userRoleData?.role !== 'admin') {
        console.warn('Edge Function: Unauthorized access attempt by non-admin user:', user.id);
        return new Response(JSON.stringify({ error: 'Access denied: Admin role required.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('Edge Function: Admin user confirmed for write operation.');
    }


    switch (method) {
      case 'GET': {
        const { data, error } = await supabaseAdmin
          .from('active_payment_gateway')
          .select('*')
          .eq('id', 1)
          .maybeSingle(); // Use maybeSingle to handle no rows found

        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'POST':
      case 'PUT': { // Both POST and PUT will perform an upsert
        const body = await req.json();
        const { gateway_name } = body;

        if (!gateway_name) {
          return new Response(JSON.stringify({ error: 'Missing required field: gateway_name' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data, error } = await supabaseAdmin
          .from('active_payment_gateway')
          .upsert({ id: 1, gateway_name }, { onConflict: 'id' })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      default:
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }
  } catch (error: any) {
    console.error('Edge Function: Error in crud-active-gateway:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});