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

// Mask sensitive data in logs
function maskUrl(url: string): string {
  return url.replace(/\/instances\/[^\/]+\/token\/[^\/]+/, '/instances/***MASKED***/token/***MASKED***');
}

// Detecta o tipo de dispositivo baseado no User-Agent
function detectDeviceType(userAgent: string): 'ios' | 'android' | 'desktop' | 'unknown' {
  const ua = userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) {
    return 'desktop';
  }
  return 'unknown';
}

// Gera o link do WhatsApp correto para o dispositivo
function generateWhatsAppLink(inviteLink: string, deviceType: string): string {
  // Extrai o código do convite do link
  const inviteCode = inviteLink.replace('https://chat.whatsapp.com/', '');
  
  switch (deviceType) {
    case 'ios':
      // Deep link para iOS
      return `whatsapp://chat?code=${inviteCode}`;
    case 'android':
      // Intent para Android
      return `intent://chat.whatsapp.com/${inviteCode}#Intent;scheme=https;package=com.whatsapp;end`;
    default:
      // Web fallback
      return inviteLink;
  }
}

// Busca metadados do grupo via Z-API para obter contagem de membros
async function getGroupMemberCount(inviteLink: string): Promise<number> {
  try {
    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
      console.warn('Z-API credentials not configured, skipping member count check');
      return 0;
    }

    const metadataUrl = `${ZAPI_BASE_URL}/group-invitation-metadata?url=${encodeURIComponent(inviteLink)}`;
    console.log(`Fetching group metadata from Z-API`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      metadataUrl,
      {
        method: 'GET',
        headers: {
          'Client-Token': ZAPI_CLIENT_TOKEN!,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to get group metadata: ${response.status} ${response.statusText}`);
      return 0;
    }

    const data = await response.json();
    const count = data.participantsCount || 0;
    console.log(`Group has ${count} members`);
    return count;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Group metadata request timed out');
    } else {
      console.error('Error fetching group metadata:', error);
    }
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
      console.error('Missing slug parameter');
      return new Response(
        JSON.stringify({ error: 'Slug não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] Processing redirect for slug: ${slug}`);

    // Inicializa o cliente Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Busca o smart link pelo slug
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

    console.log(`Found smart link: ${smartLink.name} (ID: ${smartLink.id}, Campaign: ${smartLink.campaign?.name || 'N/A'})`);

    // Busca os grupos da campanha ordenados por prioridade
    const { data: campaignGroups, error: groupsError } = await supabase
      .from('campaign_groups')
      .select('*')
      .eq('campaign_id', smartLink.campaign_id)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (groupsError || !campaignGroups || campaignGroups.length === 0) {
      console.error('No groups found for campaign:', groupsError);
      return new Response(
        JSON.stringify({ error: 'Nenhum grupo configurado para esta campanha. Configure grupos no painel.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${campaignGroups.length} active groups for campaign ${smartLink.campaign_id}`);

    // Detecta o dispositivo
    const userAgent = req.headers.get('user-agent') || '';
    const deviceType = smartLink.detect_device ? detectDeviceType(userAgent) : 'unknown';
    const referrer = req.headers.get('referer') || '';

    console.log(`Device detected: ${deviceType}`);

    const configuredGroups = campaignGroups.filter(g => {
      if (!g.invite_link) {
        console.warn(`Group ${g.group_name} (${g.group_phone}) has no invite_link configured`);
        return false;
      }

      if (!g.invite_link.includes('chat.whatsapp.com/')) {
        console.warn(`Group ${g.group_name} has invalid invite_link format: ${g.invite_link}`);
        return false;
      }

      return true;
    });

    if (configuredGroups.length === 0) {
      console.error(`No groups have valid invite_link configured for campaign ${smartLink.campaign_id}`);
      return new Response(
        JSON.stringify({
          error: 'Nenhum grupo configurado com links de convite válidos. Configure os links de convite no painel de gerenciamento de grupos.',
          details: `${campaignGroups.length} grupo(s) encontrado(s), mas nenhum tem invite_link válido configurado.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${configuredGroups.length} out of ${campaignGroups.length} groups have valid invite_link configured`);

    let selectedGroup = null;

    for (const group of configuredGroups) {
      let memberCount = group.current_members;

      const actualCount = await getGroupMemberCount(group.invite_link!);
      if (actualCount > 0) {
        memberCount = actualCount;

        await supabase
          .from('campaign_groups')
          .update({ current_members: actualCount })
          .eq('id', group.id)
          .then(({ error }) => {
            if (error) console.warn(`Failed to update member count for group ${group.id}:`, error);
          });
      }

      console.log(`Group "${group.group_name}" (${group.group_phone}): ${memberCount}/${group.member_limit} members`);

      if (memberCount < group.member_limit) {
        selectedGroup = group;
        console.log(`✓ Selected group "${group.group_name}" (has available slots)`);
        break;
      } else {
        console.log(`✗ Group "${group.group_name}" is full`);
      }
    }

    if (!selectedGroup) {
      selectedGroup = configuredGroups[configuredGroups.length - 1];
      console.warn(`⚠ All ${configuredGroups.length} groups are full. Using last group as fallback: "${selectedGroup.group_name}"`);
    }

    console.log(`➜ Final selected group: ${selectedGroup.group_name}`);

    // Registra o clique se rastreamento estiver ativo
    if (smartLink.track_clicks) {
      await supabase.from('smart_link_clicks').insert({
        smart_link_id: smartLink.id,
        redirected_to_group: selectedGroup.group_phone,
        device_type: deviceType,
        user_agent: userAgent.substring(0, 500),
        referrer: referrer.substring(0, 500),
      });

      // Incrementa contador de cliques
      await supabase
        .from('smart_links')
        .update({ total_clicks: smartLink.total_clicks + 1 })
        .eq('id', smartLink.id);
    }

    // Usa o invite_link diretamente (já validado acima)
    const inviteLink = selectedGroup.invite_link!;
    const redirectUrl = smartLink.detect_device 
      ? generateWhatsAppLink(inviteLink, deviceType)
      : inviteLink;

    console.log(`Redirecting to: ${redirectUrl}`);

    // Retorna página HTML com redirecionamento e fallback
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entrando no grupo...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: #25D366;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo svg { width: 48px; height: 48px; fill: white; }
    h1 { color: #333; font-size: 24px; margin-bottom: 12px; }
    p { color: #666; font-size: 16px; margin-bottom: 24px; }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e0e0e0;
      border-top-color: #25D366;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn {
      display: inline-block;
      background: #25D366;
      color: white;
      padding: 14px 32px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(37,211,102,0.4);
    }
    .fallback { margin-top: 20px; font-size: 14px; color: #999; }
    .fallback a { color: #128C7E; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    </div>
    <div class="spinner"></div>
    <h1>Entrando no grupo...</h1>
    <p>Você será redirecionado automaticamente para o WhatsApp.</p>
    <a href="${inviteLink}" class="btn" id="fallback-btn">Abrir WhatsApp</a>
    <p class="fallback">
      Não redirecionou? <a href="${inviteLink}">Clique aqui</a>
    </p>
  </div>
  <script>
    // Delay configurável antes do redirecionamento
    const delay = ${smartLink.redirect_delay || 0};
    
    setTimeout(function() {
      // Tenta o deep link primeiro
      const deepLink = "${deviceType === 'ios' || deviceType === 'android' ? redirectUrl : ''}";
      const webLink = "${inviteLink}";
      
      if (deepLink && deepLink !== webLink) {
        // Para mobile, tenta abrir o app
        window.location.href = deepLink;
        
        // Fallback para web após 2 segundos
        setTimeout(function() {
          window.location.href = webLink;
        }, 2000);
      } else {
        // Desktop ou fallback direto
        window.location.href = webLink;
      }
    }, delay);
  </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error: unknown) {
    console.error('Error in smart-link-redirect:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
