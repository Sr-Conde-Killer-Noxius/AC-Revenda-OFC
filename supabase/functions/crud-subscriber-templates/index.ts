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
    console.log('crud-subscriber-templates: Function started.');
    console.log(`crud-subscriber-templates: Request Method: ${req.method}`);
    console.log(`crud-subscriber-templates: Request URL: ${req.url}`);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('crud-subscriber-templates: Unauthorized - Missing Authorization header.');
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
    const id = url.searchParams.get('id');

    switch (method) {
      case 'GET': {
        if (id) {
          const { data, error } = await supabaseAdmin
            .from('subscriber_templates')
            .select('*')
            .eq('id', id)
            .single();
          if (error) {
            console.error(`crud-subscriber-templates: GET (single) error for ID ${id}:`, error.message);
            throw error;
          }
          return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          const { data, error } = await supabaseAdmin
            .from('subscriber_templates')
            .select('*')
            .order('name', { ascending: true });
          if (error) {
            console.error('crud-subscriber-templates: GET (all) error:', error.message);
            throw error;
          }
          return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      case 'POST': {
        const body = await req.json();
        console.log('crud-subscriber-templates: POST request body:', JSON.stringify(body));
        const { name, content, type } = body;
        if (!name || !content) {
          return new Response(JSON.stringify({ error: 'Missing required fields: name, content' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { data, error } = await supabaseAdmin
          .from('subscriber_templates')
          .insert({ admin_user_id: user.id, name, content, type: type || 'normal' })
          .select()
          .single();
        if (error) {
          console.error('crud-subscriber-templates: POST error:', error.message);
          throw error;
        }
        console.log('crud-subscriber-templates: POST successful, data:', JSON.stringify(data));
        return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'PUT': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing ID for update' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const body = await req.json();
        console.log(`crud-subscriber-templates: PUT request for ID ${id}, body:`, JSON.stringify(body));
        const { name, content, type, admin_user_id } = body; // Capturar admin_user_id do body
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (content !== undefined) updateData.content = content;
        if (type !== undefined) updateData.type = type;
        if (admin_user_id !== undefined) updateData.admin_user_id = admin_user_id; // Incluir admin_user_id na atualização

        const { data, error } = await supabaseAdmin
          .from('subscriber_templates')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (error) {
          console.error(`crud-subscriber-templates: PUT error for ID ${id}:`, error.message);
          throw error;
        }
        console.log(`crud-subscriber-templates: PUT successful for ID ${id}, data:`, JSON.stringify(data));
        return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); // Alterado para 200 OK
      }
      case 'DELETE': {
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing ID for delete' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        console.log(`crud-subscriber-templates: DELETE request for ID ${id}`);
        const { error } = await supabaseAdmin
          .from('subscriber_templates')
          .delete()
          .eq('id', id);
        if (error) {
          console.error(`crud-subscriber-templates: DELETE error for ID ${id}:`, error.message);
          throw error;
        }
        console.log(`crud-subscriber-templates: DELETE successful for ID ${id}`);
        return new Response(JSON.stringify({ message: 'Subscriber template deleted successfully.' }), { status: 204, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      default:
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }
  } catch (error: any) {
    console.error('crud-subscriber-templates: Unhandled error in Edge Function:', error.message, error); // Log do erro completo
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});