import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_SYSTEM_PROMPT = `You are a helpful and polite School Receptionist at "Rapid X High School".
Your Goal: Answer questions from parents about admissions, fees, and timings.
Key Behaviors:
1. Multilingual: You can speak fluent English and Hindi. If the user speaks Hindi, switch to Hindi immediately.
2. Polite & Warm: Always be welcoming and respectful.
3. Be Concise: Keep answers short (1-2 sentences).
4. Admissions: If asked about admissions, say they are open for Grade 1 to 10 and ask if they want to schedule a visit.
5. Fees: If asked about fees, say "Please visit the school office for exact details, but it starts at roughly 50k per year."
If they say "Bye", say "Namaste" or "Goodbye".`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface VoiceChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  contextOverride?: string;
  modelProvider?: string;
}

async function getConfig(): Promise<{
  openaiKey: string | null;
  groqKey: string | null;
  systemPrompt: string;
  contextPrompt: string;
}> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("agent_config")
    .select("key, value")
    .in("key", ["LLM_OPENAI_KEY", "LLM_GROQ_KEY", "AI_SYSTEM_PROMPT", "AI_CONTEXT_PROMPT"]);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }

  return {
    openaiKey: map["LLM_OPENAI_KEY"] || null,
    groqKey: map["LLM_GROQ_KEY"] || null,
    systemPrompt: map["AI_SYSTEM_PROMPT"]?.trim() || DEFAULT_SYSTEM_PROMPT,
    contextPrompt: map["AI_CONTEXT_PROMPT"]?.trim() || "",
  };
}

function buildSystemContent(systemPrompt: string, contextPrompt: string): string {
  if (!contextPrompt) return systemPrompt;
  return `${systemPrompt}\n\n---\nContext / Knowledge Base:\n${contextPrompt}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: VoiceChatRequest = await req.json();
    const { messages, systemPrompt: overridePrompt, contextOverride, modelProvider } = body;

    const { openaiKey, groqKey, systemPrompt: dbSystem, contextPrompt } = await getConfig();

    const useGroq = modelProvider === "groq" && groqKey;

    const basePrompt = overridePrompt || dbSystem;
    const combinedContext = [contextPrompt, contextOverride].filter(Boolean).join("\n\n");
    const systemContent = buildSystemContent(basePrompt, combinedContext);

    const systemMessage: ChatMessage = {
      role: "system",
      content: systemContent,
    };

    const isGreeting = messages.length === 1 && messages[0].role === "user" && messages[0].content === "__greeting__";
    const allMessages = isGreeting
      ? [systemMessage, { role: "user" as const, content: "Begin the call with a natural opening greeting." }]
      : [systemMessage, ...messages];

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
          JSON.stringify({ error: "No AI API key configured. Add your OpenAI or Groq key in Settings." }),
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
