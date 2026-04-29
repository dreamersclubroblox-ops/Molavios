import { useState } from "react";
import { WifiOff, Cpu, X, Loader2, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LOCAL_MODELS, hasWebGPU, loadLocalModel, getCurrentLocalModel, isLocalReady } from "@/lib/webllm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function OfflineBanner({ online }: { online: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [, force] = useState(0);

  const ready = isLocalReady();
  const current = getCurrentLocalModel();
  const webgpu = hasWebGPU();

  if (online && !ready) return null;

  async function load(id: string) {
    if (!webgpu) { toast.error("WebGPU niet beschikbaar — gebruik desktop Chrome of Edge."); return; }
    setLoading(id); setProgress(0);
    try {
      await loadLocalModel(id, (text, p) => { setProgressText(text); setProgress(p); });
      toast.success(`${LOCAL_MODELS.find((m) => m.id === id)?.label} geladen — Lemiro werkt nu offline.`);
      force((n) => n + 1);
      setOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Laden mislukt");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className={cn(
        "mx-auto mb-3 flex max-w-3xl items-center gap-3 rounded-2xl px-4 py-2.5 text-xs ring-1 backdrop-blur",
        online
          ? "bg-emerald-500/10 ring-emerald-500/30 text-emerald-700 dark:text-emerald-300"
          : "bg-amber-500/10 ring-amber-500/30 text-amber-800 dark:text-amber-200",
      )}>
        {online ? <Cpu className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <div className="flex-1 min-w-0">
          {online ? (
            <span><strong>Lokaal model actief:</strong> {LOCAL_MODELS.find((m) => m.id === current)?.label ?? current} — Lemiro draait in je browser.</span>
          ) : ready ? (
            <span><strong>Offline</strong> — lokaal model ({LOCAL_MODELS.find((m) => m.id === current)?.label}) is actief, alle chat blijft werken.</span>
          ) : (
            <span><strong>Offline modus (WebCCU)</strong> — beperkte chat. Laad een lokaal model voor volledige offline AI.</span>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(true)}>
          {ready ? "Wissel model" : "Laad lokaal model"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Lokaal AI-model</DialogTitle>
            <DialogDescription>
              Draai een echte LLM volledig in je browser — werkt 100% offline na download. Modellen worden gecachet, dus dit is eenmalig.
            </DialogDescription>
          </DialogHeader>

          {!webgpu && (
            <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive ring-1 ring-destructive/30">
              <strong>WebGPU niet beschikbaar.</strong> Lokale modellen werken alleen op desktop met Chrome 113+ of Edge. Op mobiel valt Lemiro terug op WebCCU.
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> {progressText || "Downloaden…"}</div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Sluit dit venster niet. Eerste download kan paar minuten duren.</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-2">
              {LOCAL_MODELS.map((m) => (
                <button key={m.id} disabled={!webgpu} onClick={() => load(m.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left ring-1 ring-border transition-all",
                    webgpu ? "hover:-translate-y-0.5 hover:shadow" : "opacity-50",
                    current === m.id && "ring-2 ring-primary",
                  )}>
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
                    {current === m.id ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.sizeMB} MB</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
