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
    console.log('Edge Function: User authenticated, userId:', user.id);

    // Fetch user role using service role to bypass RLS for user_roles table
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
      console.warn('Edge Function: Unauthorized access attempt by non-admin user:', user.id);
      return new Response(JSON.stringify({ error: 'Access denied: Admin role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Edge Function: Admin user confirmed.');

    const { method } = req;
    const url = new URL(req.url);
    const id = url.searchParams.get('id'); // For GET (single), PUT, DELETE

    switch (method) {
      case 'GET': {
        if (id) {
          const { data, error } = await supabaseAdmin
            .from('subscriber_automations')
            .select('*, subscriber_templates(name)')
            .eq('id', id)
            .single();
          if (error) throw error;
          return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          const { data, error } = await supabaseAdmin
            .from('subscriber_automations')
            .select('*, subscriber_templates(name)')
            .order('created_at', { ascending: true });
          if (error) throw error;
          return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      case 'POST': {
        const body = await req.json();
        const { days_offset, subscriber_template_id, subscriber_ids, scheduled_time } = body;
        if (days_offset === undefined || !subscriber_template_id || !subscriber_ids || !scheduled_time) {
          return new Response(JSON.stringify({ error: 'Missing required fields: days_offset, subscriber_template_id, subscriber_ids, scheduled_time' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { data, error } = await supabaseAdmin
          .from('subscriber_automations')
          .insert({ admin_user_id: user.id, days_offset, subscriber_template_id, subscriber_ids, scheduled_time })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'PUT': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing ID for update' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const body = await req.json();
        const { days_offset, subscriber_template_id, subscriber_ids, scheduled_time } = body;
        const updateData: any = {};
        if (days_offset !== undefined) updateData.days_offset = days_offset;
        if (subscriber_template_id !== undefined) updateData.subscriber_template_id = subscriber_template_id;
        if (subscriber_ids !== undefined) updateData.subscriber_ids = subscriber_ids;
        if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;

        const { data, error } = await supabaseAdmin
          .from('subscriber_automations')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing ID for delete' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabaseAdmin
          .from('subscriber_automations')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return new Response(JSON.stringify({ message: 'Subscriber automation deleted successfully.' }), { status: 204, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      default:
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }
  } catch (error: any) {
    console.error('Edge Function: Error in crud-subscriber-automations:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});