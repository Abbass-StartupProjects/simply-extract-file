import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getAdminUser(supabaseUrl: string, serviceKey: string, authHeader: string) {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function listUsersOverview(supabaseUrl: string, serviceKey: string, maxPages = 20): Promise<{ earliestId: string | null; total: number } | null> {
  const admin = createClient(supabaseUrl, serviceKey);
  let earliestId: string | null = null;
  let earliestAt = "";
  let total = 0;
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 500, page });
    if (error || !data) return null;
    for (const u of data.users) {
      total++;
      if (!earliestId || u.created_at < earliestAt) {
        earliestId = u.id;
        earliestAt = u.created_at;
      }
    }
    if (data.users.length < 500) break;
  }
  return { earliestId, total };
}

async function isOwner(supabaseUrl: string, serviceKey: string, userId: string): Promise<boolean> {
  const result = await listUsersOverview(supabaseUrl, serviceKey);
  return result?.earliestId === userId;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = await getAdminUser(supabaseUrl, serviceKey, authHeader);
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!(await isOwner(supabaseUrl, serviceKey, user.id))) {
      return new Response(JSON.stringify({ error: "Only the account owner can manage Slack notifications" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    if (req.method === "GET") {
      const { data } = await adminClient
        .from("slack_settings")
        .select("webhook_url, enabled")
        .limit(1)
        .maybeSingle();
      return new Response(
        JSON.stringify({
          configured: Boolean(data?.webhook_url),
          enabled: Boolean(data?.enabled),
          webhook_url: data?.webhook_url ?? "",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const webhookUrl = typeof body.webhook_url === "string" ? body.webhook_url.trim() : "";
      const enabled = Boolean(body.enabled);
      if (enabled && !/^https:\/\/hooks\.slack\.com\/services\//.test(webhookUrl)) {
        return new Response(JSON.stringify({ error: "Enter a valid Slack webhook URL (starts with https://hooks.slack.com/services/)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: upsertError } = await adminClient
        .from("slack_settings")
        .upsert({ id: 1, webhook_url: webhookUrl || null, enabled, updated_at: new Date().toISOString() });
      if (upsertError) {
        return new Response(JSON.stringify({ error: "Could not save Slack settings" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let testSent: boolean | null = null;
      if (body.test === true && enabled && webhookUrl) {
        const slackRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "✅ Launchrocket is connected to this channel. You will be notified about new submissions, boost orders, and support tickets." }),
        });
        testSent = slackRes.ok;
      }

      return new Response(JSON.stringify({ success: true, testSent }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
