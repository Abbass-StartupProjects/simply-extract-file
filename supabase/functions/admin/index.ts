import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getUser(supabaseUrl: string, anonKey: string, authHeader: string) {
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function listAllUsers(supabaseUrl: string, serviceKey: string, maxPages = 20): Promise<{ earliest: { id: string; created_at: string } | null; total: number } | null> {
  const admin = createClient(supabaseUrl, serviceKey);
  let earliest: { id: string; created_at: string } | null = null;
  let total = 0;
  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 500, page });
    if (error || !data) return null;
    for (const u of data.users) {
      total++;
      if (!earliest || new Date(u.created_at) < new Date(earliest.created_at)) {
        earliest = { id: u.id, created_at: u.created_at };
      }
    }
    if (data.users.length < 500) break;
  }
  return { earliest, total };
}

async function isSiteOwner(supabaseUrl: string, serviceKey: string, userId: string): Promise<boolean> {
  const result = await listAllUsers(supabaseUrl, serviceKey);
  return result?.earliest?.id === userId;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = await getUser(supabaseUrl, anonKey, authHeader);
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(await isSiteOwner(supabaseUrl, serviceKey, user.id))) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [userStats, startups, channels, startups7d, channels7d, votes, pendingStartups, pendingChannels, openTickets, pendingOrders, submittedOrders, orders7d] = await Promise.all([
      listAllUsers(supabaseUrl, serviceKey),
      admin.from("startups").select("id", { count: "exact", head: true }),
      admin.from("channels").select("id", { count: "exact", head: true }),
      admin.from("startups").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      admin.from("channels").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      admin.from("startup_votes").select("id", { count: "exact", head: true }),
      admin.from("startups").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("channels").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      admin.from("featured_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("featured_orders").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      admin.from("featured_orders").select("amount_usd", { count: "exact" }).gte("created_at", sevenDaysAgo).neq("status", "rejected"),
    ]);

    if (startups.error || channels.error || orders7d.error) {
      return new Response(JSON.stringify({ error: "Could not load dashboard data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      users: userStats?.total ?? 0,
      startups: startups.count ?? 0,
      channels: channels.count ?? 0,
      startups7d: startups7d.count ?? 0,
      channels7d: channels7d.count ?? 0,
      votes: votes.count ?? 0,
      pendingStartups: pendingStartups.count ?? 0,
      pendingChannels: pendingChannels.count ?? 0,
      openTickets: openTickets.count ?? 0,
      pendingOrders: (pendingOrders.count ?? 0) + (submittedOrders.count ?? 0),
      revenue7dCents: (orders7d.data ?? []).reduce((sum, row) => sum + Math.round((row.amount_usd ?? 0) * 100), 0),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
