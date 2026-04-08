import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DispatchCallRequest {
  phoneNumber: string;
  prompt?: string;
  modelProvider?: string;
  voice?: string;
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

    const body: DispatchCallRequest = await req.json();
    const { phoneNumber, prompt, modelProvider, voice } = body;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const roomName = `call-${phoneNumber.replace("+", "")}-${Date.now()}`;

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .upsert(
        {
          phone_number: phoneNumber,
          metadata: { prompt, model_provider: modelProvider, voice_id: voice },
        },
        { onConflict: "phone_number" }
      )
      .select()
      .maybeSingle();

    if (contactError) {
      console.error("Contact error:", contactError);
    }

    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        contact_id: contact?.id,
        phone_number: phoneNumber,
        room_name: roomName,
        status: "initiated",
        direction: "outbound",
        prompt: prompt || "",
        model_provider: modelProvider || "openai",
        voice_id: voice || "alloy",
      })
      .select()
      .single();

    if (callError) {
      throw callError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        callId: call.id,
        roomName: roomName,
        message: `Call dispatched to ${phoneNumber}`,
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
