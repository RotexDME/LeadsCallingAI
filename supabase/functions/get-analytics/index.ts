import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: calls, error: callsError } = await supabase
      .from("calls")
      .select("*");

    if (callsError) {
      throw callsError;
    }

    const totalCalls = calls?.length || 0;
    const completedCalls = calls?.filter((c) => c.status === "completed").length || 0;
    const failedCalls = calls?.filter((c) => c.status === "failed").length || 0;
    const activeCalls = calls?.filter((c) =>
      c.status === "initiated" || c.status === "ringing" || c.status === "answered"
    ).length || 0;

    const avgDuration = calls
      ?.filter((c) => c.duration_seconds)
      .reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / (completedCalls || 1);

    return new Response(
      JSON.stringify({
        success: true,
        analytics: {
          totalCalls,
          completedCalls,
          failedCalls,
          activeCalls,
          avgDuration: Math.round(avgDuration || 0),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
