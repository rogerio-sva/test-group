import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for scheduled messages to process...');

    // Find scheduled messages where scheduled_at <= now()
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from('message_history')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching scheduled messages:', fetchError);
      throw fetchError;
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      console.log('No scheduled messages ready to process');
      return new Response(
        JSON.stringify({ message: 'No scheduled messages to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${scheduledMessages.length} scheduled message(s) to process`);

    let processedCount = 0;

    for (const message of scheduledMessages) {
      console.log(`Processing scheduled message: ${message.id} - ${message.title}`);

      // Update status to pending
      const { error: updateError } = await supabase
        .from('message_history')
        .update({ status: 'pending' })
        .eq('id', message.id);

      if (updateError) {
        console.error(`Error updating message ${message.id}:`, updateError);
        continue;
      }

      // Invoke the broadcast function
      const { error: invokeError } = await supabase.functions.invoke('zapi-broadcast', {
        body: {
          messageHistoryId: message.id,
          delayBetween: 5000,
          mentionsEveryOne: false
        }
      });

      if (invokeError) {
        console.error(`Error invoking broadcast for ${message.id}:`, invokeError);
        // Update status to failed
        await supabase
          .from('message_history')
          .update({ status: 'failed', error_message: invokeError.message })
          .eq('id', message.id);
        continue;
      }

      processedCount++;
      console.log(`Successfully triggered broadcast for: ${message.id}`);
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedCount} scheduled message(s)`,
        processed: processedCount,
        total: scheduledMessages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing scheduled messages:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
