import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, MessageSquarePlus, Trash2, Pin, Send, Loader2, Globe, PanelRightOpen, Brain, GraduationCap, FilePlus2,
  Sparkles, X, Copy, Check, Search, Square, RefreshCcw, Pencil, Bot, User as UserIcon, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Chat {
  id: string; title: string; model: string; pinned: boolean; updated_at: string;
  web_search: boolean; canvas: boolean; deep_research: boolean; learn_mode: boolean; extra_files: boolean;
}
interface ChatMsg { id?: string; role: "user" | "assistant"; content: string; }
interface CanvasBlock { title: string; content: string; }

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const MODELS = [
  { v: "google/gemini-2.5-flash", l: "Gemini 2.5 Flash", short: "2.5 Flash" },
  { v: "google/gemini-2.5-pro", l: "Gemini 2.5 Pro", short: "2.5 Pro" },
  { v: "google/gemini-3-flash-preview", l: "Gemini 3 Flash · next", short: "3 Flash" },
  { v: "google/gemini-3.1-pro-preview", l: "Gemini 3.1 Pro · top", short: "3.1 Pro" },
  { v: "openai/gpt-5-mini", l: "GPT-5 Mini", short: "GPT-5m" },
  { v: "openai/gpt-5", l: "GPT-5", short: "GPT-5" },
  { v: "openai/gpt-5.2", l: "GPT-5.2 · reasoning", short: "GPT-5.2" },
];

const SUGGESTIONS = [
  { icon: "💡", title: "Leg uit", body: "Leg quantum computing uit alsof ik 12 ben." },
  { icon: "✍️", title: "Schrijf", body: "Schrijf een korte LinkedIn post over productiviteit." },
  { icon: "🧮", title: "Reken", body: "Hoeveel weegt 3 ton lucht in een kamer van 5x4x2.5m?" },
  { icon: "🐛", title: "Debug", body: "Debug deze functie:\n\n```js\nfunction sum(a,b){ return a-b }\n```" },
  { icon: "🍳", title: "Recept", body: "Maak een snel recept met kip, rijst en paprika voor 4 personen." },
  { icon: "🎨", title: "Idee", body: "Geef me 5 namen voor een gezellige koffiebar in Amsterdam." },
];

function parseCanvas(text: string): { stripped: string; canvases: CanvasBlock[] } {
  const blocks: CanvasBlock[] = [];
  const stripped = text.replace(/```canvas:([^\n]+)\n([\s\S]*?)```/g, (_m, t, c) => {
    blocks.push({ title: t.trim(), content: c });
    return ""; // canvases shown as separate buttons
  });
  return { stripped: stripped.trim(), canvases: blocks };
}

export default function ChatsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [openCanvas, setOpenCanvas] = useState<CanvasBlock | null>(null);
  const [canvasCopied, setCanvasCopied] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickToBottomRef = useRef(true);

  const { data: chats = [] } = useQuery({
    queryKey: ["chats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("chats").select("*").eq("user_id", user!.id)
        .order("pinned", { ascending: false }).order("updated_at", { ascending: false });
      return (data ?? []) as Chat[];
    },
  });

  const active = chats.find((c) => c.id === activeId) || null;

  const { data: msgs = [], refetch: refetchMsgs } = useQuery({
    queryKey: ["chat-msgs", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("id,role,content").eq("chat_id", activeId!).order("created_at");
      return (data ?? []) as ChatMsg[];
    },
  });

  const [streamingMsgs, setStreamingMsgs] = useState<ChatMsg[] | null>(null);
  const displayMsgs = streamingMsgs ?? msgs;

  useEffect(() => { setStreamingMsgs(null); setEditingIdx(null); }, [activeId]);

  // Smart auto-scroll
  function onScroll() {
    const el = scrollRef.current; if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }
  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [displayMsgs]);
  useEffect(() => { if (!activeId && chats[0]) setActiveId(chats[0].id); }, [chats, activeId]);

  // Auto-resize composer
  useEffect(() => {
    const ta = composerRef.current; if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [input]);

  const filtered = useMemo(() => chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())), [chats, search]);

  async function newChat() {
    if (!user) return;
    const { data, error } = await supabase.from("chats").insert({ user_id: user.id, title: "Nieuwe chat" }).select().single();
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["chats", user.id] });
    setActiveId(data.id);
    setTimeout(() => composerRef.current?.focus(), 50);
  }

  async function delChat(id: string) {
    if (!confirm("Chat verwijderen?")) return;
    await supabase.from("chat_messages").delete().eq("chat_id", id);
    await supabase.from("chats").delete().eq("id", id);
    if (activeId === id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["chats", user!.id] });
  }

  async function togglePin(c: Chat) {
    await supabase.from("chats").update({ pinned: !c.pinned }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["chats", user!.id] });
  }

  async function patch(c: Chat, p: Partial<Chat>) {
    await supabase.from("chats").update(p).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["chats", user!.id] });
  }

  async function streamReply(history: ChatMsg[]) {
    if (!active) return;
    setStreamingMsgs(history);
    setBusy(true);
    stickToBottomRef.current = true;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(FN_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          systemPrompt: "Je bent Molavio, een vriendelijke en uitgebreide AI-assistent. Antwoord in dezelfde taal als de gebruiker. Gebruik Markdown rijk: kopjes, lijsten, tabellen, en code-blocks met language tag (bv. ```ts).",
          model: active.model,
          chatId: active.id,
          tool: "chat",
          options: {
            web_search: active.web_search,
            canvas: active.canvas,
            deep_research: active.deep_research,
            learn_mode: active.learn_mode,
            extra_files: active.extra_files,
          },
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 402) toast.error("Onvoldoende tokens — wacht op streak of koop bij.");
        else if (resp.status === 429) toast.error("Te veel verzoeken. Wacht even.");
        else toast.error("AI fout");
        setStreamingMsgs(null); setBusy(false); abortRef.current = null; return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", assistant = "", pushed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const p = JSON.parse(j);
            if (p.usage) { qc.invalidateQueries({ queryKey: ["tokens", user!.id] }); continue; }
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              assistant += c;
              setStreamingMsgs((prev) => {
                const arr = prev ?? history;
                if (!pushed) { pushed = true; return [...arr, { role: "assistant", content: assistant }]; }
                return arr.map((m, i) => i === arr.length - 1 ? { ...m, content: assistant } : m);
              });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      setStreamingMsgs(null);
      refetchMsgs();
    } catch (e: unknown) {
      const isAbort = e instanceof DOMException && e.name === "AbortError";
      if (!isAbort) { console.error(e); toast.error("Verbindingsfout"); }
      // Persist whatever we got streamed so far via refetch
      refetchMsgs();
      setStreamingMsgs(null);
    } finally {
      setBusy(false); abortRef.current = null;
    }
  }

  function stop() { abortRef.current?.abort(); }

  async function sendMessage(text?: string) {
    const t = (text ?? input).trim();
    if (!active || !t || busy) return;
    if (msgs.length === 0) patch(active, { title: t.slice(0, 60) });
    const next = [...msgs, { role: "user" as const, content: t }];
    setInput("");
    streamReply(next);
  }

  async function regenerate() {
    if (!active || busy) return;
    // Drop last assistant from DB & history, re-stream
    const last = msgs[msgs.length - 1];
    if (last?.role !== "assistant" || !last.id) return toast.info("Niets om te regenereren");
    await supabase.from("chat_messages").delete().eq("id", last.id);
    const trimmed = msgs.slice(0, -1);
    qc.setQueryData(["chat-msgs", active.id], trimmed);
    streamReply(trimmed);
  }

  async function saveEdit(idx: number) {
    if (!active) return;
    const target = msgs[idx];
    if (!target?.id) return;
    const newText = editingText.trim();
    if (!newText) return;
    // Update message and delete everything after it
    await supabase.from("chat_messages").update({ content: newText }).eq("id", target.id);
    const toDelete = msgs.slice(idx + 1).filter((m) => m.id).map((m) => m.id!);
    if (toDelete.length) await supabase.from("chat_messages").delete().in("id", toDelete);
    const newHistory: ChatMsg[] = [...msgs.slice(0, idx), { ...target, content: newText }];
    qc.setQueryData(["chat-msgs", active.id], newHistory);
    setEditingIdx(null);
    if (target.role === "user") streamReply(newHistory);
  }

  function copyMessage(idx: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 1500);
  }

  function copyCanvas() {
    if (!openCanvas) return;
    navigator.clipboard.writeText(openCanvas.content);
    setCanvasCopied(true); setTimeout(() => setCanvasCopied(false), 1500);
  }

  if (!user) return (<AppLayout><div className="grid place-items-center p-10 text-muted-foreground">Log in.</div></AppLayout>);

  const modelInfo = MODELS.find((m) => m.v === active?.model);

  return (
    <AppLayout>
      <div className="grid h-[calc(100vh-8rem)] gap-3 lg:grid-cols-[260px_1fr] lg:gap-4">
        {/* Sidebar */}
        <aside className="flex flex-col gap-2 rounded-2xl bg-card/50 p-2 ring-1 ring-border lg:max-h-full">
          <Button onClick={newChat} className="w-full"><MessageSquarePlus className="mr-2 h-4 w-4" />Nieuwe chat</Button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek…" className="pl-8 h-8 text-xs" />
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {filtered.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">Geen chats</p>}
            {filtered.map((c) => (
              <div key={c.id} className={cn(
                "group flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm ring-1 transition-all",
                activeId === c.id ? "bg-primary text-primary-foreground ring-primary shadow-sm" : "ring-transparent hover:bg-muted",
              )}>
                <button onClick={() => setActiveId(c.id)} className="flex-1 truncate text-left">
                  {c.pinned && <Pin className="mr-1 inline h-3 w-3" />}{c.title}
                </button>
                <Button variant="ghost" size="icon" className={cn("h-6 w-6 opacity-0 group-hover:opacity-100", activeId === c.id && "text-primary-foreground hover:bg-primary-foreground/10")} onClick={() => togglePin(c)}>
                  <Pin className={cn("h-3 w-3", c.pinned && "fill-current")} />
                </Button>
                <Button variant="ghost" size="icon" className={cn("h-6 w-6 opacity-0 group-hover:opacity-100", activeId === c.id && "text-primary-foreground hover:bg-primary-foreground/10")} onClick={() => delChat(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </aside>

        {/* Conversation */}
        <div className={cn("flex min-w-0 flex-col rounded-2xl bg-card/50 ring-1 ring-border overflow-hidden", openCanvas && "lg:grid lg:grid-cols-[1fr_1fr] lg:gap-0")}>
          <div className="flex min-w-0 flex-col">
            {!active ? (
              <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
                <div className="text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>Selecteer of maak een chat.</p>
                  <Button onClick={newChat} className="mt-3" size="sm"><Plus className="mr-1 h-4 w-4" />Nieuwe chat</Button>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/40 p-2 backdrop-blur">
                  <Input value={active.title} onChange={(e) => patch(active, { title: e.target.value })}
                    className="h-8 w-44 border-0 bg-transparent text-sm font-semibold focus-visible:ring-1" />
                  <Select value={active.model} onValueChange={(v) => patch(active, { model: v })}>
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <Bot className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Model">{modelInfo?.short}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>{MODELS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <ToggleChip icon={Globe} label="Web" on={active.web_search} onClick={() => patch(active, { web_search: !active.web_search })} />
                    <ToggleChip icon={PanelRightOpen} label="Canvas" on={active.canvas} onClick={() => patch(active, { canvas: !active.canvas })} />
                    <ToggleChip icon={Brain} label="Deep" on={active.deep_research} onClick={() => patch(active, { deep_research: !active.deep_research })} />
                    <ToggleChip icon={GraduationCap} label="Leren" on={active.learn_mode} onClick={() => patch(active, { learn_mode: !active.learn_mode })} />
                    <ToggleChip icon={FilePlus2} label="Files" on={active.extra_files} onClick={() => patch(active, { extra_files: !active.extra_files })} />
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
                  <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
                    {displayMsgs.length === 0 && (
                      <div className="space-y-6 py-8">
                        <div className="text-center">
                          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg">
                            <Sparkles className="h-7 w-7" />
                          </div>
                          <h2 className="font-display text-2xl font-bold">Hoe kan ik helpen?</h2>
                          <p className="mt-1 text-sm text-muted-foreground">Vraag wat je wilt — Molavio kan denken, schrijven, coderen en uitleggen.</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {SUGGESTIONS.map((s) => (
                            <button key={s.title} onClick={() => sendMessage(s.body)}
                              className="group flex items-start gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-md">
                              <span className="text-xl">{s.icon}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">{s.title}</p>
                                <p className="line-clamp-2 text-xs text-muted-foreground">{s.body}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {displayMsgs.map((m, i) => {
                      const isUser = m.role === "user";
                      const isLast = i === displayMsgs.length - 1;
                      const streaming = busy && isLast && !isUser;
                      const { stripped, canvases } = !isUser ? parseCanvas(m.content) : { stripped: m.content, canvases: [] };
                      const isEditing = editingIdx === i;

                      return (
                        <div key={i} className={cn("group flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
                          <div className={cn(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-full text-white shadow-sm",
                            isUser ? "bg-foreground text-background" : "bg-gradient-to-br from-violet-600 to-cyan-500",
                          )}>
                            {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>

                          <div className={cn("min-w-0 flex-1 space-y-1.5", isUser && "flex flex-col items-end")}>
                            {isEditing ? (
                              <div className="w-full max-w-2xl space-y-2">
                                <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={4} className="resize-none" />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => saveEdit(i)}>Opslaan & opnieuw</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingIdx(null)}>Annuleer</Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={cn(
                                  "rounded-2xl px-4 py-2.5 text-sm break-words",
                                  isUser
                                    ? "max-w-[85%] whitespace-pre-wrap bg-primary text-primary-foreground"
                                    : "w-full bg-transparent text-foreground",
                                )}>
                                  {isUser ? (
                                    m.content
                                  ) : stripped ? (
                                    <MarkdownMessage content={stripped} />
                                  ) : streaming ? (
                                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Denken…
                                    </span>
                                  ) : null}
                                  {streaming && stripped && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-foreground/60 align-middle" />}
                                </div>

                                {canvases.map((cv, j) => (
                                  <button key={j} onClick={() => setOpenCanvas(cv)}
                                    className="flex w-full max-w-md items-center gap-2 rounded-xl bg-background px-3 py-2 text-left text-xs ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow">
                                    <PanelRightOpen className="h-3.5 w-3.5" />
                                    <span className="flex-1 truncate font-medium">{cv.title}</span>
                                    <span className="text-muted-foreground">Open canvas →</span>
                                  </button>
                                ))}

                                {/* Action row */}
                                {!streaming && (
                                  <div className={cn(
                                    "flex items-center gap-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
                                    isUser && "flex-row-reverse",
                                  )}>
                                    <button onClick={() => copyMessage(i, m.content)}
                                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] hover:bg-muted">
                                      {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                      {copiedIdx === i ? "Gekopieerd" : "Kopieer"}
                                    </button>
                                    {isUser && (
                                      <button onClick={() => { setEditingIdx(i); setEditingText(m.content); }}
                                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] hover:bg-muted">
                                        <Pencil className="h-3 w-3" />Bewerk
                                      </button>
                                    )}
                                    {!isUser && isLast && (
                                      <button onClick={regenerate}
                                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] hover:bg-muted">
                                        <RefreshCcw className="h-3 w-3" />Opnieuw
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Composer */}
                <div className="border-t border-border bg-background/40 p-3 backdrop-blur">
                  <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl bg-card p-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/40">
                    <Textarea
                      ref={composerRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder={`Bericht naar ${modelInfo?.short ?? "Molavio"}…`}
                      rows={1}
                      className="min-h-[40px] max-h-60 flex-1 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                    />
                    {busy ? (
                      <Button onClick={stop} size="icon" variant="destructive" className="h-9 w-9 shrink-0" title="Stop">
                        <Square className="h-4 w-4 fill-current" />
                      </Button>
                    ) : (
                      <Button onClick={() => sendMessage()} disabled={!input.trim()} size="icon" className="h-9 w-9 shrink-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-muted-foreground">
                    Molavio kan fouten maken. Controleer belangrijke info. <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Enter</kbd> verzendt · <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Shift+Enter</kbd> nieuwe regel
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Canvas pane */}
          {openCanvas && (
            <div className="flex flex-col border-t border-border lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 border-b border-border bg-background/40 px-3 py-2">
                <PanelRightOpen className="h-4 w-4" />
                <span className="flex-1 truncate text-sm font-medium">{openCanvas.title}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyCanvas}>
                  {canvasCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenCanvas(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea value={openCanvas.content} onChange={(e) => setOpenCanvas({ ...openCanvas, content: e.target.value })}
                className="flex-1 resize-none rounded-none border-0 bg-background font-mono text-xs focus-visible:ring-0" />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ToggleChip({ icon: I, label, on, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 transition-all",
      on ? "bg-primary text-primary-foreground ring-primary shadow-sm" : "bg-background ring-border hover:bg-muted",
    )}>
      <I className="h-3 w-3" /> {label}
    </button>
  );
}
