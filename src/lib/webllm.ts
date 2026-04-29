// Lazy WebLLM wrapper — only loaded when user opts in.
// Models run fully in-browser via WebGPU. ~1-2GB download per model, cached by browser.

import type { MLCEngine, ChatCompletionMessageParam } from "@mlc-ai/web-llm";

export interface LocalModelInfo {
  id: string;
  label: string;
  sizeMB: number;
  description: string;
}

export const LOCAL_MODELS: LocalModelInfo[] = [
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B", sizeMB: 800, description: "Snel, compact — werkt op de meeste apparaten." },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B", sizeMB: 1900, description: "Slimmer, iets trager. Aanbevolen op desktop." },
  { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 2B", sizeMB: 1500, description: "Google Gemma — goede balans." },
  { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 Mini", sizeMB: 2200, description: "Microsoft Phi — sterk in redeneren." },
];

export function hasWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

let engine: MLCEngine | null = null;
let currentModel: string | null = null;

export type ProgressCb = (text: string, progress: number) => void;

export async function loadLocalModel(modelId: string, onProgress?: ProgressCb): Promise<void> {
  if (!hasWebGPU()) throw new Error("WebGPU niet ondersteund — gebruik een recente desktop browser (Chrome/Edge).");
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  if (engine && currentModel === modelId) return;
  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (r) => onProgress?.(r.text, r.progress),
  });
  currentModel = modelId;
}

export function getCurrentLocalModel(): string | null {
  return currentModel;
}

export function isLocalReady(): boolean {
  return engine !== null;
}

export async function streamLocalChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!engine) throw new Error("Lokaal model niet geladen.");
  const stream = await engine.chat.completions.create({
    messages: messages as ChatCompletionMessageParam[],
    stream: true,
    temperature: 0.7,
  });
  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) onDelta(delta);
  }
}

// WebCCU — degraded fallback when no local model and no internet.
// Pure rule-based, no AI. Keeps the chat usable.
export function webCCUReply(userText: string, history: { role: string; content: string }[]): string {
  const t = userText.trim().toLowerCase();
  if (!t) return "_(leeg bericht)_";

  const greetings = ["hi", "hallo", "hoi", "hey", "hello", "goedemorgen", "goedenavond"];
  if (greetings.some((g) => t.startsWith(g))) {
    return "**WebCCU offline-modus**\n\nHallo! Je bent momenteel offline. Ik werk in beperkte modus — geen AI, geen web. Schakel internet in voor volledige Lemiro, of laad een lokaal model via de knop bovenaan.";
  }
  if (/\b(help|hulp|wat kan je|wat kun je)\b/.test(t)) {
    return "**WebCCU — beperkte modus**\n\n- Berichten worden opgeslagen\n- Je geschiedenis blijft beschikbaar\n- Wanneer je weer online bent, kan je een echte AI vraag stellen\n- Of installeer een **lokaal model** (knop bovenaan) — dan werkt AI volledig offline.";
  }
  if (/\b(tijd|hoe laat|datum|vandaag)\b/.test(t)) {
    return `Het is nu **${new Date().toLocaleString("nl-NL")}** (lokale tijd).`;
  }
  if (/\b(reken|bereken|\d+\s*[\+\-\*\/x]\s*\d+)/.test(t)) {
    try {
      const expr = userText.replace(/[^0-9+\-*/().,x ]/g, "").replace(/x/g, "*").replace(/,/g, ".");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();
      if (typeof result === "number" && isFinite(result)) return `**${expr.trim()} = ${result}**`;
    } catch { /* ignore */ }
  }
  // Echo with context hint
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant")?.content;
  return `**WebCCU offline** — ik kan zonder internet of lokaal model niet redeneren.\n\n_Je bericht is opgeslagen:_ "${userText.slice(0, 200)}${userText.length > 200 ? "…" : ""}"\n\n${lastAssistant ? "_Je laatste AI-antwoord staat nog hierboven._" : "Probeer het opnieuw zodra je weer online bent, of laad een lokaal model."}`;
}
