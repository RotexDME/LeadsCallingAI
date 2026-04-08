import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QueueCallsRequest {
  numbers: string[];
  prompt?: string;
}

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

    const body: QueueCallsRequest = await req.json();
    const { numbers, prompt } = body;

    if (!numbers || numbers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Phone numbers are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];

    for (const phoneNumber of numbers) {
      try {
        const roomName = `call-${phoneNumber.replace("+", "")}-${Date.now()}`;

        const { data: contact } = await supabase
          .from("contacts")
          .upsert(
            {
              phone_number: phoneNumber,
              metadata: { prompt },
            },
            { onConflict: "phone_number" }
          )
          .select()
          .maybeSingle();

        const { data: call, error: callError } = await supabase
          .from("calls")
          .insert({
            contact_id: contact?.id,
            phone_number: phoneNumber,
            room_name: roomName,
            status: "initiated",
            direction: "outbound",
            prompt: prompt || "",
          })
          .select()
          .single();

        if (callError) {
          results.push({
            phoneNumber,
            status: "failed",
            error: callError.message,
          });
        } else {
          results.push({
            phoneNumber,
            status: "dispatched",
            callId: call.id,
          });
        }
      } catch (error: any) {
        results.push({
          phoneNumber,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total: numbers.length,
        dispatched: results.filter((r) => r.status === "dispatched").length,
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
