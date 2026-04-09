import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("agent_config")
        .select("key, value, label, group, is_secret, placeholder, updated_at")
        .order("group")
        .order("key");

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, config: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const updates: { key: string; value: string }[] = body.updates;

      if (!Array.isArray(updates) || updates.length === 0) {
        return new Response(JSON.stringify({ error: "updates array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = await Promise.all(
        updates.map(({ key, value }) =>
          supabase
            .from("agent_config")
            .update({ value })
            .eq("key", key)
        )
      );

      const failed = results.filter(r => r.error);
      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} key(s)`);
      }

      return new Response(JSON.stringify({ success: true, updated: updates.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
