import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const ZAPI_BASE_URL = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;

function detectDeviceType(userAgent: string): 'ios' | 'android' | 'desktop' | 'unknown' {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) return 'desktop';
  return 'unknown';
}

function generateWhatsAppLink(inviteLink: string, deviceType: string): string {
  const inviteCode = inviteLink.replace('https://chat.whatsapp.com/', '');
  switch (deviceType) {
    case 'ios':
      return `whatsapp://chat?code=${inviteCode}`;
    case 'android':
      return `intent://chat.whatsapp.com/${inviteCode}#Intent;scheme=https;package=com.whatsapp;end`;
    default:
      return inviteLink;
  }
}

async function getGroupMemberCount(inviteLink: string): Promise<number> {
  try {
    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) return 0;
    const metadataUrl = `${ZAPI_BASE_URL}/group-invitation-metadata?url=${encodeURIComponent(inviteLink)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(metadataUrl, {
      method: 'GET',
      headers: { 'Client-Token': ZAPI_CLIENT_TOKEN! },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.participantsCount || 0;
  } catch (error) {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] Processing redirect for slug: ${slug}`);
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: smartLink, error: linkError } = await supabase
      .from('smart_links')
      .select('*, campaign:campaigns(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (linkError || !smartLink) {
      console.error('Smart link not found:', linkError);
      return new Response(
        JSON.stringify({ error: 'Link não encontrado ou inativo. Verifique se o slug está correto.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found smart link: ${smartLink.name} (ID: ${smartLink.id})`);

    const { data: campaignGroups, error: groupsError } = await supabase
      .from('campaign_groups')
      .select('*')
      .eq('campaign_id', smartLink.campaign_id)
      .eq('is_active', true)
      .eq('rotation_enabled', true)
      .order('priority', { ascending: true });

    if (groupsError || !campaignGroups || campaignGroups.length === 0) {
      console.error('No groups found:', groupsError);
      return new Response(
        JSON.stringify({ error: 'Nenhum grupo com rotação ativa encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${campaignGroups.length} active groups`);

    const userAgent = req.headers.get('user-agent') || '';
    const deviceType = smartLink.detect_device ? detectDeviceType(userAgent) : 'unknown';
    const referrer = req.headers.get('referer') || '';

    const configuredGroups = campaignGroups.filter(g => 
      g.invite_link && g.invite_link.includes('chat.whatsapp.com/')
    );

    if (configuredGroups.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum grupo configurado com links válidos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let selectedGroup = null;

    for (const group of configuredGroups) {
      let memberCount = group.current_members;
      const actualCount = await getGroupMemberCount(group.invite_link!);
      if (actualCount > 0) {
        memberCount = actualCount;
        await supabase
          .from('campaign_groups')
          .update({ current_members: actualCount })
          .eq('id', group.id);
      }

      console.log(`Group "${group.group_name}": ${memberCount}/${group.member_limit}`);

      if (memberCount < group.member_limit) {
        selectedGroup = group;
        console.log(`Selected: ${group.group_name}`);
        break;
      }
    }

    if (!selectedGroup) {
      selectedGroup = configuredGroups[configuredGroups.length - 1];
      console.log(`All full, using fallback: ${selectedGroup.group_name}`);
    }

    if (smartLink.track_clicks) {
      await supabase.from('smart_link_clicks').insert({
        smart_link_id: smartLink.id,
        redirected_to_group: selectedGroup.group_phone,
        device_type: deviceType,
        user_agent: userAgent.substring(0, 500),
        referrer: referrer.substring(0, 500),
      });

      await supabase
        .from('smart_links')
        .update({ total_clicks: smartLink.total_clicks + 1 })
        .eq('id', smartLink.id);
    }

    const inviteLink = selectedGroup.invite_link!;
    const redirectUrl = smartLink.detect_device 
      ? generateWhatsAppLink(inviteLink, deviceType)
      : inviteLink;

    console.log(`Redirecting to: ${inviteLink}`);

    return new Response(
      JSON.stringify({
        success: true,
        inviteLink,
        redirectUrl,
        deviceType,
        groupName: selectedGroup.group_name,
        delay: smartLink.redirect_delay || 0,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});