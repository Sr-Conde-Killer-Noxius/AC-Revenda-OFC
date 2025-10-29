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

  const supabaseAdmin = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

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

    // Check if user is admin
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabaseAdmin
          .from('subscriber_plans')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      case 'POST': {
        const newPlan = await req.json();
        const { data, error } = await supabaseAdmin
          .from('subscriber_plans')
          .insert(newPlan)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }
      case 'PUT': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing plan ID for update.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const updatedPlan = await req.json();
        const { data, error } = await supabaseAdmin
          .from('subscriber_plans')
          .update(updatedPlan)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing plan ID for delete.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const { error } = await supabaseAdmin
          .from('subscriber_plans')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return new Response(JSON.stringify({ message: 'Plan deleted successfully.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 204,
        });
      }
      default:
        return new Response('Method Not Allowed', {
          headers: { ...corsHeaders, 'Allow': 'GET, POST, PUT, DELETE' },
          status: 405,
        });
    }
  } catch (error: any) {
    console.error('Error in crud-subscriber-plans Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});