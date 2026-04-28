import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MINI_TOOLS, MINI_CATEGORIES } from "@/lib/miniTools";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ToolGetter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Alle");

  const { data: saved = [] } = useQuery({
    queryKey: ["saved-tools", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("saved_tools").select("tool_slug").eq("user_id", user!.id);
      return data?.map(r => r.tool_slug) ?? [];
    },
  });

  const filtered = useMemo(() => {
    return MINI_TOOLS.filter(t => {
      if (cat !== "Alle" && t.category !== cat) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s) || t.slug.includes(s);
    });
  }, [q, cat]);

  async function toggleSave(slug: string) {
    if (!user) return;
    if (saved.includes(slug)) {
      await supabase.from("saved_tools").delete().eq("user_id", user.id).eq("tool_slug", slug);
    } else {
      await supabase.from("saved_tools").insert({ user_id: user.id, tool_slug: slug });
      toast.success("Opgeslagen");
    }
    qc.invalidateQueries({ queryKey: ["saved-tools", user.id] });
  }

  return (
    <AppLayout>
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tool Getter</p>
        <h1 className="font-display text-3xl font-black tracking-tight">Vind elke kleine tool</h1>
        <p className="mt-1 text-sm text-muted-foreground">{MINI_TOOLS.length} ingebouwde mini-tools — instant, geen tokens.</p>
      </header>

      <div className="sticky top-14 z-20 -mx-3 mb-4 bg-surface/80 px-3 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek een tool…" className="pl-9" />
          </div>
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["Alle", ...MINI_CATEGORIES].map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all",
                cat === c ? "bg-foreground text-background" : "bg-secondary hover:bg-accent")}>{c}</button>
          ))}
        </div>
      </div>

      {saved.length > 0 && cat === "Alle" && !q && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">⭐ Opgeslagen</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MINI_TOOLS.filter(t => saved.includes(t.slug)).map(t => (
              <ToolCard key={t.slug} tool={t} saved onToggle={() => toggleSave(t.slug)} onOpen={() => nav(`/mini/${t.slug}`)} />
            ))}
          </div>
        </section>
      )}

      <motion.div layout className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((t, i) => (
          <ToolCard key={t.slug} tool={t} saved={saved.includes(t.slug)} onToggle={() => toggleSave(t.slug)} onOpen={() => nav(`/mini/${t.slug}`)} delay={i * 0.01} />
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Geen tool gevonden voor "{q}"</p>
          <Button asChild className="mt-3" size="sm">
            <Link to={`/tools/code?prompt=${encodeURIComponent("Maak een mini-tool: " + q)}`}>
              <Sparkles className="mr-1 h-4 w-4" /> Laat AI er één maken
            </Link>
          </Button>
        </div>
      )}
    </AppLayout>
  );
}

function ToolCard({ tool, saved, onToggle, onOpen, delay = 0 }: { tool: typeof MINI_TOOLS[number]; saved: boolean; onToggle: () => void; onOpen: () => void; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-foreground">
          <Icon name={tool.icon} className="h-4 w-4" />
        </div>
        <div className="font-medium text-sm leading-tight">{tool.name}</div>
        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{tool.description}</div>
      </button>
      <button onClick={onToggle} className="absolute right-2 top-2 rounded-full p-1.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100" aria-label="Opslaan">
        {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
      </button>
    </motion.div>
  );
}
