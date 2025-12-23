import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SyncRequest {
  groupId: string;
  campaignId: string;
}

interface Participant {
  phone: string;
  name?: string;
  isAdmin?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { groupId, campaignId }: SyncRequest = await req.json();

    if (!groupId || !campaignId) {
      return new Response(
        JSON.stringify({ error: 'groupId and campaignId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] Starting sync for group ${groupId}, campaign ${campaignId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('campaign_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Z-API credentials
    const { data: credentials, error: credsError } = await supabase
      .from('api_settings')
      .select('*')
      .eq('id', 'zapi_credentials')
      .single();

    if (credsError || !credentials) {
      return new Response(
        JSON.stringify({ error: 'Z-API credentials not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ZAPI_BASE_URL = `https://api.z-api.io/instances/${credentials.instance_id}/token/${credentials.token}`;

    // Fetch group participants from Z-API
    console.log(`Fetching participants for group ${group.group_phone}`);
    const response = await fetch(`${ZAPI_BASE_URL}/group/${group.group_phone}/participants`, {
      method: 'GET',
      headers: {
        'Client-Token': credentials.client_token,
      },
    });

    if (!response.ok) {
      console.error(`Z-API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch participants: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const participants: Participant[] = data.participants || [];

    console.log(`Found ${participants.length} participants`);

    let membersAdded = 0;
    let membersUpdated = 0;
    const errors: string[] = [];

    // Get existing group members
    const { data: existingMembers } = await supabase
      .from('group_members')
      .select('phone')
      .eq('group_id', groupId);

    const existingPhones = new Set((existingMembers || []).map(m => m.phone));

    // Process each participant
    for (const participant of participants) {
      try {
        const cleanPhone = participant.phone.replace(/\D/g, '');

        // Upsert contact
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .upsert(
            {
              phone: cleanPhone,
              name: participant.name || cleanPhone,
              is_active: true,
            },
            { onConflict: 'phone', ignoreDuplicates: false }
          )
          .select()
          .single();

        if (contactError) {
          console.error(`Error upserting contact ${cleanPhone}:`, contactError);
          errors.push(`Contact ${cleanPhone}: ${contactError.message}`);
          continue;
        }

        // Upsert group member
        const { error: memberError } = await supabase
          .from('group_members')
          .upsert(
            {
              group_id: groupId,
              contact_id: contact.id,
              phone: cleanPhone,
              is_admin: participant.isAdmin || false,
              is_active: true,
              synced_at: new Date().toISOString(),
            },
            { onConflict: 'group_id,contact_id', ignoreDuplicates: false }
          );

        if (memberError) {
          console.error(`Error upserting group member ${cleanPhone}:`, memberError);
          errors.push(`Group member ${cleanPhone}: ${memberError.message}`);
          continue;
        }

        // Upsert campaign contact
        const { error: campaignContactError } = await supabase
          .from('campaign_contacts')
          .upsert(
            {
              campaign_id: campaignId,
              contact_id: contact.id,
              status: 'active',
              source: 'group_sync',
            },
            { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true }
          );

        if (campaignContactError) {
          console.error(`Error upserting campaign contact ${cleanPhone}:`, campaignContactError);
        }

        if (existingPhones.has(cleanPhone)) {
          membersUpdated++;
        } else {
          membersAdded++;
        }
      } catch (err) {
        console.error('Error processing participant:', err);
        errors.push(`Participant ${participant.phone}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Mark inactive members (members in DB but not in API response)
    const currentPhones = participants.map(p => p.phone.replace(/\D/g, ''));
    const { error: deactivateError } = await supabase
      .from('group_members')
      .update({ is_active: false, synced_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .not('phone', 'in', `(${currentPhones.join(',')})`);

    if (deactivateError) {
      console.error('Error deactivating members:', deactivateError);
    }

    // Update sync job
    const { error: syncJobError } = await supabase
      .from('sync_jobs')
      .upsert(
        {
          campaign_id: campaignId,
          group_id: groupId,
          last_sync_at: new Date().toISOString(),
          status: errors.length > 0 ? 'completed' : 'completed',
          members_added: membersAdded,
        },
        { onConflict: 'campaign_id,group_id', ignoreDuplicates: false }
      );

    if (syncJobError) {
      console.error('Error updating sync job:', syncJobError);
    }

    // Log activity
    await supabase.from('campaign_activity_log').insert({
      campaign_id: campaignId,
      activity_type: 'sync_completed',
      description: `Synced ${membersAdded + membersUpdated} members from group ${group.group_name}`,
      metadata: {
        group_id: groupId,
        members_added: membersAdded,
        members_updated: membersUpdated,
        total_participants: participants.length,
      },
    });

    console.log(`Sync completed: ${membersAdded} added, ${membersUpdated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        membersAdded,
        membersUpdated,
        totalProcessed: participants.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in sync-group-members:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});