import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId : null;
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Ownership check first: the order must belong to the caller.
    const { data: order, error: orderError } = await adminClient
      .from("featured_orders")
      .select("id, startup_id, status, tier_days")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((order as { status: string }).status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Order already processed" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: startup } = await adminClient
      .from("startups")
      .select("submitted_by")
      .eq("id", (order as { startup_id: string }).startup_id)
      .maybeSingle();

    if (!startup || (startup as { submitted_by: string }).submitted_by !== user.id) {
      return new Response(
        JSON.stringify({ error: "You can only boost your own listings" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment is NEVER auto-confirmed here. A claimed tx hash is not proof of
    // payment; only the site owner can verify an order (admin panel).
    // Mark it submitted for review — but only if it is still pending, so two
    // concurrent requests can't both claim it.
    const { data: updated, error: updateError } = await adminClient
      .from("featured_orders")
      .update({ status: "submitted" })
      .eq("id", orderId)
      .eq("status", "pending")
      .select("id");

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Could not record your boost request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!updated || (updated as { id: string }[]).length === 0) {
      return new Response(
        JSON.stringify({ error: "Order already processed" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Boost request submitted for review" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
