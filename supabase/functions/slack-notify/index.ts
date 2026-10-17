import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type NotifyPayload = {
  type?: unknown;
  title?: unknown;
  lines?: unknown;
};

const TYPE_EMOJI: Record<string, string> = {
  startup: "🚀 New startup submission",
  channel: "📺 New channel submission",
  ticket: "🛟 New support ticket",
  boost: "💎 New boost order",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // This function is only meant to be called by the database trigger
    // (notify_slack via pg_net), which authenticates with the project's anon
    // key. Reject anything else so outsiders can't inject Slack messages.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const expected = `Bearer ${anonKey}`;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: keyData } = await adminClient
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", "app_anon_key")
      .maybeSingle();
    const triggerKey = keyData ? (keyData as { decrypted_secret: string }).decrypted_secret : null;
    if (
      (authHeader !== expected || !anonKey) &&
      (!triggerKey || authHeader !== `Bearer ${triggerKey}`)
    ) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as NotifyPayload;
    const type = typeof body.type === "string" ? body.type : "";
    const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
    if (!type || !title) {
      return new Response(
        JSON.stringify({ error: "type and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const lines = Array.isArray(body.lines)
      ? body.lines.filter((l): l is string => typeof l === "string").map((l) => l.slice(0, 300)).slice(0, 10)
      : [];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: settings } = await supabase
      .from("slack_settings")
      .select("webhook_url, enabled")
      .limit(1)
      .maybeSingle();

    const webhookUrl = settings?.webhook_url;
    if (!settings?.enabled || !webhookUrl) {
      return new Response(
        JSON.stringify({ sent: false, reason: "Slack notifications are not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const label = TYPE_EMOJI[type] ?? "🔔 Notification";
    const text = lines.length
      ? `${label}\n*${title}*\n${lines.map((l) => `• ${l}`).join("\n")}`
      : `${label}\n*${title}*`;

    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!slackRes.ok) {
      return new Response(
        JSON.stringify({ sent: false, reason: `Slack responded with ${slackRes.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
