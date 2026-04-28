import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { findMiniTool } from "@/lib/miniTools";
import { CUSTOM_TOOLS } from "@/components/MiniToolCustom";

export default function MiniToolPage() {
  const { slug = "" } = useParams();
  const tool = findMiniTool(slug);
  const [input, setInput] = useState("");

  if (!tool) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Tool niet gevonden.</p>
        <Button asChild variant="link"><Link to="/tool-getter">Terug</Link></Button>
      </AppLayout>
    );
  }

  const Custom = tool.custom ? CUSTOM_TOOLS[tool.slug] : null;
  const out = !tool.custom && tool.run ? tool.run(input) : "";

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link to="/tool-getter"><ArrowLeft className="mr-1 h-4 w-4" />Tool Getter</Link>
      </Button>

      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
          <Icon name={tool.icon} className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{tool.category}</p>
          <h1 className="font-display text-2xl font-bold">{tool.name}</h1>
          <p className="text-sm text-muted-foreground">{tool.description}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
        {Custom ? <Custom /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoer</label>
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} rows={10} placeholder={tool.placeholder ?? "Typ hier…"} className="font-mono text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultaat</label>
              <div className="min-h-[252px] whitespace-pre-wrap break-words rounded-md border border-input bg-secondary/40 p-3 font-mono text-sm">{out || (input ? "" : "(geef invoer)")}</div>
              {out && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigator.clipboard.writeText(out)}>Kopieer</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
