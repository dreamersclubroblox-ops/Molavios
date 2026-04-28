import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Star, Store as StoreIcon, Shield, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { useApps, useTools } from "@/hooks/useCatalog";
import { useAuth } from "@/contexts/AuthContext";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: tools = [] } = useTools();
  const { data: apps = [] } = useApps();
  const { isAdmin } = useAuth();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-xs items-center justify-between gap-2 rounded-full border-border/60 bg-background/60 px-3 text-muted-foreground backdrop-blur md:inline-flex"
      >
        <span className="flex items-center gap-2 text-sm"><Search className="h-4 w-4" /> Zoek tools…</span>
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>

      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Zoek" className="md:hidden">
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Zoek een tool, app of pagina…" />
        <CommandList>
          <CommandEmpty>Niets gevonden.</CommandEmpty>

          <CommandGroup heading="Navigatie">
            <CommandItem onSelect={() => go("/")}><Home className="mr-2 h-4 w-4" />Home</CommandItem>
            <CommandItem onSelect={() => go("/store")}><StoreIcon className="mr-2 h-4 w-4" />Store</CommandItem>
            <CommandItem onSelect={() => go("/favorites")}><Star className="mr-2 h-4 w-4" />Favorieten</CommandItem>
            {isAdmin && (
              <CommandItem onSelect={() => go("/admin")}><Shield className="mr-2 h-4 w-4" />Admin</CommandItem>
            )}
          </CommandGroup>

          {tools.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tools">
                {tools.map((t) => (
                  <CommandItem key={t.id} value={`tool ${t.name} ${t.description ?? ""}`} onSelect={() => go(t.route)}>
                    <Icon name={t.icon} className="mr-2 h-4 w-4" />
                    <span>{t.name}</span>
                    {t.description && (
                      <span className="ml-2 truncate text-xs text-muted-foreground">{t.description}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {apps.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Apps">
                {apps.map((a) => (
                  <CommandItem key={a.id} value={`app ${a.name}`} onSelect={() => go(`/apps/${a.slug}`)}>
                    <Icon name={a.icon} className="mr-2 h-4 w-4" />
                    {a.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
