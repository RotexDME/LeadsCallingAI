import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface VoiceChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  modelProvider?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: VoiceChatRequest = await req.json();
    const { messages, systemPrompt, modelProvider } = body;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");

    const useGroq = modelProvider === "groq" && groqKey;

    const systemMessage: ChatMessage = {
      role: "system",
      content: systemPrompt ||
        `You are a helpful and polite School Receptionist at "Rapid X High School".
Your Goal: Answer questions from parents about admissions, fees, and timings.
Key Behaviors:
1. Multilingual: You can speak fluent English and Hindi. If the user speaks Hindi, switch to Hindi immediately.
2. Polite & Warm: Always be welcoming and respectful.
3. Be Concise: Keep answers short (1-2 sentences).
4. Admissions: If asked about admissions, say they are open for Grade 1 to 10 and ask if they want to schedule a visit.
5. Fees: If asked about fees, say "Please visit the school office for exact details, but it starts at roughly 50k per year."
If they say "Bye", say "Namaste" or "Goodbye".`,
    };

    const allMessages = [systemMessage, ...messages];

    let apiUrl: string;
    let apiKey: string;
    let model: string;

    if (useGroq) {
      apiUrl = "https://api.groq.com/openai/v1/chat/completions";
      apiKey = groqKey!;
      model = "llama-3.3-70b-versatile";
    } else {
      if (!openaiKey) {
        return new Response(
          JSON.stringify({ error: "No AI API key configured. Set OPENAI_API_KEY or GROQ_API_KEY in edge function secrets." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      apiUrl = "https://api.openai.com/v1/chat/completions";
      apiKey = openaiKey;
      model = "gpt-4o-mini";
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(
        JSON.stringify({ error: `AI API error: ${err}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't process that.";

    return new Response(
      JSON.stringify({ reply, model }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("voice-chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
