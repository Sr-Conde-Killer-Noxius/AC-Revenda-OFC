import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[process-queue-and-send] Edge Function invoked.');
  console.log(`[process-queue-and-send] Request method: ${req.method}`);
  console.log(`[process-queue-and-send] Authorization header: ${req.headers.get('Authorization')}`);

  if (req.method === 'OPTIONS') {
    console.log('[process-queue-and-send] Handling OPTIONS request.');
    return new Response(null, { headers: corsHeaders })
  }
  
  // Manual authentication handling (since verify_jwt is false)
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    console.warn('[process-queue-and-send] Unauthorized: Missing Authorization header.');
    return new Response('Unauthorized', { 
      status: 401, 
      headers: corsHeaders 
    })
  }
  
  // Extract the token (assuming 'Bearer <token>')
  const token = authHeader.replace('Bearer ', '');
  console.log(`[process-queue-and-send] Received token (first 10 chars): ${token.substring(0, 10)}...`);

  // --- Existing logic of process-queue-and-send starts here ---
  // (No changes to the core logic, just added logs around it)

  // Use service role key to bypass RLS and access all scheduled notifications
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('[process-queue-and-send] Fetching pending scheduled notifications...');
    
    const currentTime = new Date().toISOString();
    console.log(`[process-queue-and-send] Current time (UTC): ${currentTime}`);
    
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', currentTime)
      .order('send_at', { ascending: true })
      .limit(10); // Process a batch of 10 notifications at a time
    
    console.log(`[process-queue-and-send] Query result: ${pendingNotifications?.length || 0} notifications found`);

    if (fetchError) {
      console.error('[process-queue-and-send] Error fetching pending notifications:', fetchError.message);
      throw new Error(fetchError.message);
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('[process-queue-and-send] No pending notifications to process.');
      return new Response(JSON.stringify({ message: 'No pending notifications.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[process-queue-and-send] Found ${pendingNotifications.length} pending notifications. Processing...`);

    for (const notification of pendingNotifications) {
      console.log(`[process-queue-and-send] Processing notification ID: ${notification.id}`);
      // Update status to processing
      await supabaseClient
        .from('scheduled_notifications')
        .update({ status: 'processing' })
        .eq('id', notification.id);

      // Invoke the send-scheduled-notification Edge Function
      try {
        console.log(`[process-queue-and-send] Invoking send-scheduled-notification for ID: ${notification.id}`);
        const { data: sendResult, error: invokeError } = await supabaseClient.functions.invoke('send-scheduled-notification', {
          body: { id: notification.id } // Changed from notificationId to id to match the function parameter
        });

        if (invokeError) {
          console.error(`[process-queue-and-send] Error invoking send-scheduled-notification for ID ${notification.id}:`, invokeError.message);
          // Update status to failed
          await supabaseClient
            .from('scheduled_notifications')
            .update({ status: 'failed' })
            .eq('id', notification.id);
        } else {
          console.log(`[process-queue-and-send] send-scheduled-notification invoked successfully for ID ${notification.id}. Result:`, sendResult);
          // Update status to sent
          await supabaseClient
            .from('scheduled_notifications')
            .update({ status: 'sent' })
            .eq('id', notification.id);
        }
      } catch (invokeCatchError) {
        console.error(`[process-queue-and-send] Caught error during send-scheduled-notification invocation for ID ${notification.id}:`, invokeCatchError);
        await supabaseClient
          .from('scheduled_notifications')
          .update({ status: 'failed' })
          .eq('id', notification.id);
      }
    }

    console.log('[process-queue-and-send] All pending notifications processed in this batch.');
    return new Response(JSON.stringify({ message: 'Notifications processed successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[process-queue-and-send] Global error caught:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})