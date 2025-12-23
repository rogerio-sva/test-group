import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface VerifyRequest {
  domain: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { domain }: VerifyRequest = await req.json();

    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Domain is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${new Date().toISOString()}] Verifying domain: ${domain}`);

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          error: 'Invalid domain format. Please use format: subdomain.example.com',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to fetch from the domain
    let verified = false;
    let error = null;
    let statusCode = 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const testUrl = `https://${domain}`;
      console.log(`Testing URL: ${testUrl}`);

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      statusCode = response.status;

      // Consider it verified if we get any response (even 404)
      // This means the domain is reachable and DNS is configured
      verified = statusCode > 0;

      console.log(`Domain ${domain} responded with status: ${statusCode}`);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          error = 'Request timed out. Domain may not be configured correctly.';
        } else {
          error = `Failed to reach domain: ${err.message}`;
        }
      } else {
        error = 'Unknown error occurred while verifying domain';
      }
      console.error(`Domain verification failed:`, error);
    }

    // Update the database
    if (verified) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error: updateError } = await supabase
        .from('api_settings')
        .update({
          custom_domain: domain,
          domain_verified: true,
          domain_verified_at: new Date().toISOString(),
        })
        .eq('id', 'zapi_credentials');

      if (updateError) {
        console.error('Error updating api_settings:', updateError);
        return new Response(
          JSON.stringify({
            success: false,
            verified: false,
            error: 'Failed to save verification status',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: verified,
        verified,
        domain,
        statusCode: statusCode || null,
        error,
        message: verified
          ? 'Domain verified successfully'
          : 'Domain verification failed',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in verify-custom-domain:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});