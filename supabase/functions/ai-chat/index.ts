// Streaming AI chat with usage-based token billing.
// Body: { messages, systemPrompt?, model?, projectId?, chatId?, tool?, options?: { web_search?, canvas?, deep_research?, learn_mode?, extra_files? } }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-tokens-charged, x-tokens-balance, x-tokens-error",
};

function estimateTokens(s: string): number {
  return Math.ceil((s?.length ?? 0) / 4);
}

interface ChatOptions {
  web_search?: boolean;
  canvas?: boolean;
  deep_research?: boolean;
  learn_mode?: boolean;
  extra_files?: boolean;
}

function buildAugmentedSystemPrompt(base: string | undefined, opts: ChatOptions, memories: string[]): string {
  const parts: string[] = [];
  if (base) parts.push(base);

  if (opts.canvas) {
    parts.push(`CANVAS MODE: When the user asks for code, documents, long text, or anything substantial, output it inside a fenced canvas block:
\`\`\`canvas:Title Here
...content...
\`\`\`
The frontend will render this in a side-panel canvas the user can edit. Use multiple canvases if needed. Keep chat replies short — put the substantial work in canvases.`);
  }
  if (opts.deep_research) {
    parts.push(`DEEP RESEARCH MODE: Reason step by step. Provide a structured answer with: Summary, Key Findings (bulleted), Detailed Analysis, Sources/References (if applicable), and Open Questions. Be thorough.`);
  }
  if (opts.web_search) {
    parts.push(`WEB CONTEXT: Treat the user request as if you have access to up-to-date information. When unsure, say so explicitly. Cite which claims would benefit from verification.`);
  }
  if (opts.learn_mode) {
    parts.push(`LEARN MODE: Pay attention to facts the user shares about themselves, their preferences, projects, names, etc. At the end of your reply, if you learned anything new and stable about the user, append a single line:
[REMEMBER]: <one short fact>
Only emit [REMEMBER] when truly novel and worth keeping.`);
  }
  if (memories.length > 0) {
    parts.push(`KNOWN FACTS ABOUT USER:\n${memories.map((m) => `- ${m}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const body = await req.json();
    const { messages, systemPrompt, model, projectId, chatId, tool, options } = body as {
      messages: { role: string; content: string }[];
      systemPrompt?: string;
      model?: string;
      projectId?: string;
      chatId?: string;
      tool?: string;
      options?: ChatOptions;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const opts = options || {};

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    const { data: u } = await supabase.auth.getUser(token);
    const userId = u.user?.id ?? null;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load memories if learn_mode or chat-based
    let memories: string[] = [];
    if (opts.learn_mode || chatId) {
      const { data: mems } = await supabase.from("user_memories").select("fact").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
      memories = (mems ?? []).map((m: { fact: string }) => m.fact);
    }

    const augSystem = buildAugmentedSystemPrompt(systemPrompt, opts, memories);

    const inputText = augSystem + messages.map((m) => m.content).join("\n");
    const estIn = estimateTokens(inputText);
    const { data: balRow } = await supabase.from("user_tokens").select("balance").eq("user_id", userId).maybeSingle();
    const balance = Number(balRow?.balance ?? 0);
    const multiplier = opts.deep_research ? 3 : 1;
    if (balance < (estIn + 50) * multiplier) {
      return new Response(JSON.stringify({ error: "insufficient_tokens", balance, required: (estIn + 50) * multiplier }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (projectId) {
      const last = messages[messages.length - 1];
      if (last?.role === "user") {
        await supabase.from("project_messages").insert({
          project_id: projectId, user_id: userId, role: "user", content: last.content,
        });
      }
    }
    if (chatId) {
      const last = messages[messages.length - 1];
      if (last?.role === "user") {
        await supabase.from("chat_messages").insert({
          chat_id: chatId, user_id: userId, role: "user", content: last.content,
        });
        await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
      }
    }

    const finalMessages = augSystem
      ? [{ role: "system", content: augSystem }, ...messages]
      : messages;
    const usedModel = model || "google/gemini-2.5-flash";

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: usedModel,
        messages: finalMessages,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit bereikt — probeer opnieuw." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (upstream.status === 402)
        return new Response(JSON.stringify({ error: "Geen AI credits meer." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reader = upstream.body!.getReader();
    let assistantText = "";
    let usageIn = 0, usageOut = 0;

    const stream = new ReadableStream({
      async pull(ctrl) {
        const { done, value } = await reader.read();
        if (done) {
          const inT = usageIn || estimateTokens(inputText);
          const outT = usageOut || estimateTokens(assistantText);
          const total = (inT + outT) * multiplier;
          try {
            const { data: chargeRes } = await supabase.rpc("deduct_tokens", {
              _user_id: userId, _amount: total, _tool: tool || "ai-chat", _model: usedModel,
              _in: inT, _out: outT,
            });
            if (projectId && assistantText) {
              await supabase.from("project_messages").insert({
                project_id: projectId, user_id: userId, role: "assistant", content: assistantText,
              });
            }
            if (chatId && assistantText) {
              await supabase.from("chat_messages").insert({
                chat_id: chatId, user_id: userId, role: "assistant", content: assistantText,
              });
            }
            // Extract memories from [REMEMBER]: lines
            if (opts.learn_mode && assistantText) {
              const memMatches = assistantText.matchAll(/\[REMEMBER\]:\s*(.+)/g);
              for (const m of memMatches) {
                const fact = m[1].trim().slice(0, 500);
                if (fact) {
                  await supabase.from("user_memories").insert({
                    user_id: userId, fact, source_chat_id: chatId || null,
                  });
                }
              }
            }
            const tail = `\ndata: ${JSON.stringify({ usage: { input_tokens: inT, output_tokens: outT, total }, balance: (chargeRes as { balance?: number } | null)?.balance })}\n\n`;
            ctrl.enqueue(new TextEncoder().encode(tail));
          } catch (e) { console.error("charge error:", e); }
          ctrl.close();
          return;
        }
        const chunk = new TextDecoder().decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") continue;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) assistantText += c;
            if (p.usage) {
              usageIn = p.usage.prompt_tokens ?? p.usage.input_tokens ?? usageIn;
              usageOut = p.usage.completion_tokens ?? p.usage.output_tokens ?? usageOut;
            }
          } catch { /* ignore parse */ }
        }
        ctrl.enqueue(value);
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
