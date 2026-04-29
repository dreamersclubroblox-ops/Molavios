import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ToolShell } from "@/components/ToolShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Download, Sparkles, Loader2, FilePlus, Sword, Apple, Box, Gem, Wand2, Folder, FolderOpen, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

interface MCProject {
  id: string; name: string; description: string | null; enabled: boolean;
}
interface MCFile {
  id: string; project_id: string; path: string; content: string; language: string;
}

type ProjectKind = "addon" | "mod-fabric" | "mod-forge" | "plugin-paper" | "plugin-spigot";

function detectLang(p: string): string {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  return { json: "json", mcmeta: "json", java: "java", kt: "kotlin", yml: "yaml", yaml: "yaml", lang: "plaintext", png: "binary", txt: "plaintext", md: "markdown" }[ext] ?? "plaintext";
}

const PROJECT_KINDS: { v: ProjectKind; l: string; desc: string }[] = [
  { v: "addon", l: "Bedrock Add-on (BP+RP)", desc: "Behavior Pack + Resource Pack voor Minecraft Bedrock (.mcaddon)" },
  { v: "mod-fabric", l: "Java Mod — Fabric", desc: "Mod voor Minecraft Java met Fabric loader" },
  { v: "mod-forge", l: "Java Mod — Forge", desc: "Mod voor Minecraft Java met Forge loader" },
  { v: "plugin-paper", l: "Server Plugin — Paper", desc: "Server-side plugin voor Paper-servers" },
  { v: "plugin-spigot", l: "Server Plugin — Spigot", desc: "Server-side plugin voor Spigot/Bukkit" },
];

function uuid4(): string {
  return crypto.randomUUID();
}

function scaffoldFiles(kind: ProjectKind, projectName: string, ns: string): { path: string; content: string }[] {
  const safeName = projectName || "MyPack";
  if (kind === "addon") {
    const bpUuid = uuid4(), rpUuid = uuid4(), bpModUuid = uuid4(), rpModUuid = uuid4();
    return [
      { path: "behavior_pack/manifest.json", content: JSON.stringify({
        format_version: 2,
        header: { name: `${safeName} BP`, description: "Behavior Pack", uuid: bpUuid, version: [1,0,0], min_engine_version: [1,20,0] },
        modules: [{ type: "data", uuid: bpModUuid, version: [1,0,0] }],
        dependencies: [{ uuid: rpUuid, version: [1,0,0] }],
      }, null, 2) },
      { path: "behavior_pack/pack_icon.png.txt", content: "(Plaats hier pack_icon.png — 128x128 PNG)" },
      { path: "resource_pack/manifest.json", content: JSON.stringify({
        format_version: 2,
        header: { name: `${safeName} RP`, description: "Resource Pack", uuid: rpUuid, version: [1,0,0], min_engine_version: [1,20,0] },
        modules: [{ type: "resources", uuid: rpModUuid, version: [1,0,0] }],
      }, null, 2) },
      { path: "resource_pack/pack_icon.png.txt", content: "(Plaats hier pack_icon.png — 128x128 PNG)" },
      { path: "resource_pack/texts/en_US.lang", content: `pack.name=${safeName}\n` },
      { path: "README.md", content: `# ${safeName}\n\nBedrock Add-on. Plaats items in:\n- behavior_pack/items/<id>.json\n- resource_pack/textures/items/<id>.png\n` },
    ];
  }
  if (kind === "mod-fabric") {
    const id = ns || "examplemod";
    return [
      { path: "src/main/resources/fabric.mod.json", content: JSON.stringify({
        schemaVersion: 1, id, version: "1.0.0", name: safeName, description: "Fabric mod",
        authors: ["You"], license: "MIT",
        environment: "*",
        entrypoints: { main: [`com.example.${id}.${capitalize(id)}`] },
        depends: { fabricloader: ">=0.15.0", minecraft: "~1.20.4", java: ">=17" },
      }, null, 2) },
      { path: `src/main/java/com/example/${id}/${capitalize(id)}.java`, content:
`package com.example.${id};

import net.fabricmc.api.ModInitializer;

public class ${capitalize(id)} implements ModInitializer {
    public static final String MOD_ID = "${id}";

    @Override
    public void onInitialize() {
        System.out.println("[" + MOD_ID + "] Initialized!");
    }
}
` },
      { path: `src/main/resources/assets/${id}/lang/en_us.json`, content: JSON.stringify({ [`itemGroup.${id}`]: capitalize(id) }, null, 2) },
      { path: "build.gradle", content:
`plugins { id 'fabric-loom' version '1.6-SNAPSHOT' }
archivesBaseName = '${id}'
version = '1.0.0'
group = 'com.example.${id}'
dependencies {
    minecraft "com.mojang:minecraft:1.20.4"
    mappings "net.fabricmc:yarn:1.20.4+build.3:v2"
    modImplementation "net.fabricmc:fabric-loader:0.15.7"
}
` },
      { path: "README.md", content: `# ${safeName}\nFabric mod. Build met \`./gradlew build\`.` },
    ];
  }
  if (kind === "mod-forge") {
    const id = ns || "examplemod";
    return [
      { path: "src/main/resources/META-INF/mods.toml", content:
`modLoader="javafml"
loaderVersion="[47,)"
license="MIT"
[[mods]]
modId="${id}"
version="1.0.0"
displayName="${safeName}"
description='''A Forge mod.'''
` },
      { path: `src/main/java/com/example/${id}/${capitalize(id)}.java`, content:
`package com.example.${id};

import net.minecraftforge.fml.common.Mod;

@Mod("${id}")
public class ${capitalize(id)} {
    public ${capitalize(id)}() {
        System.out.println("[${id}] Loaded!");
    }
}
` },
      { path: "build.gradle", content: `// Forge build.gradle — see Forge MDK for full template\n` },
      { path: "README.md", content: `# ${safeName}\nForge mod template.` },
    ];
  }
  // plugins
  const id = ns || "exampleplugin";
  const apiLine = kind === "plugin-paper" ? "api-version: '1.20'" : "api-version: 1.20";
  return [
    { path: "src/main/resources/plugin.yml", content:
`name: ${safeName}
version: 1.0.0
main: com.example.${id}.${capitalize(id)}
${apiLine}
description: A ${kind === "plugin-paper" ? "Paper" : "Spigot/Bukkit"} plugin
commands:
  hello:
    description: Says hello
    usage: /hello
` },
    { path: `src/main/java/com/example/${id}/${capitalize(id)}.java`, content:
`package com.example.${id};

import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

public class ${capitalize(id)} extends JavaPlugin {
    @Override
    public void onEnable() {
        getLogger().info("${safeName} enabled!");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (cmd.getName().equalsIgnoreCase("hello")) {
            sender.sendMessage("Hello from ${safeName}!");
            return true;
        }
        return false;
    }
}
` },
    { path: "pom.xml", content: `<!-- Maven pom — add Spigot/Paper repo & API dependency -->\n` },
    { path: "README.md", content: `# ${safeName}\n${kind === "plugin-paper" ? "Paper" : "Spigot"} plugin.` },
  ];
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---- Form-based generators ----
function buildBedrockItem(opts: { id: string; name: string; texture: string; type: "sword" | "food" | "block" | "tool" }): { path: string; content: string }[] {
  const ns = "lemiro";
  const fullId = `${ns}:${opts.id}`;
  const components: Record<string, unknown> = {
    "minecraft:icon": { texture: opts.id },
    "minecraft:display_name": { value: opts.name },
    "minecraft:max_stack_size": opts.type === "sword" || opts.type === "tool" ? 1 : 64,
  };
  if (opts.type === "sword") {
    components["minecraft:damage"] = 7;
    components["minecraft:durability"] = { max_durability: 250 };
    components["minecraft:hand_equipped"] = true;
  } else if (opts.type === "food") {
    components["minecraft:food"] = { nutrition: 4, saturation_modifier: "normal" };
    components["minecraft:use_animation"] = "eat";
    components["minecraft:use_duration"] = 32;
  } else if (opts.type === "tool") {
    components["minecraft:durability"] = { max_durability: 200 };
    components["minecraft:hand_equipped"] = true;
  }
  const bpItem = {
    format_version: "1.20.10",
    "minecraft:item": { description: { identifier: fullId, category: "equipment" }, components },
  };
  const rpTextures = {
    resource_pack_name: ns,
    texture_name: "atlas.items",
    texture_data: { [opts.id]: { textures: `textures/items/${opts.id}` } },
  };
  return [
    { path: `behavior_pack/items/${opts.id}.json`, content: JSON.stringify(bpItem, null, 2) },
    { path: `resource_pack/textures/item_texture.json`, content: JSON.stringify(rpTextures, null, 2) },
    { path: `resource_pack/textures/items/${opts.id}.png.txt`, content: opts.texture || "(Plaats hier de PNG-textuur 16x16)" },
  ];
}

export default function MinecraftMaker() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<ProjectKind>("addon");
  const [newNs, setNewNs] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["mc-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("website_projects").select("id,name,description,enabled")
        .eq("user_id", user!.id).like("description", "MC:%").order("created_at", { ascending: false });
      return (data ?? []) as MCProject[];
    },
  });

  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: ["mc-files", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*").eq("project_id", activeId!).order("path");
      return (data ?? []) as MCFile[];
    },
  });

  useEffect(() => { if (!activeId && projects[0]) setActiveId(projects[0].id); }, [projects, activeId]);
  useEffect(() => { if (!activePath && files[0]) setActivePath(files[0].path); }, [files, activePath]);

  const active = projects.find((p) => p.id === activeId) || null;
  const activeFile = files.find((f) => f.path === activePath) ?? null;
  const projectKind = (active?.description?.replace("MC:", "") as ProjectKind) || "addon";

  async function createProject() {
    if (!user || !newName.trim()) return;
    const { data, error } = await supabase.from("website_projects").insert({
      user_id: user.id, name: newName.trim(), description: `MC:${newKind}`,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    const scaffold = scaffoldFiles(newKind, newName.trim(), newNs.trim());
    for (const f of scaffold) {
      await supabase.from("project_files").insert({
        project_id: data.id, user_id: user.id, path: f.path, content: f.content, language: detectLang(f.path),
      });
    }
    toast.success("Project aangemaakt");
    setActiveId(data.id); setActivePath(null); setNewName(""); setNewNs("");
    qc.invalidateQueries({ queryKey: ["mc-projects", user.id] });
  }

  async function deleteProject(id: string) {
    if (!confirm("Project verwijderen?")) return;
    await supabase.from("project_files").delete().eq("project_id", id);
    await supabase.from("website_projects").delete().eq("id", id);
    if (activeId === id) { setActiveId(null); setActivePath(null); }
    qc.invalidateQueries({ queryKey: ["mc-projects", user!.id] });
  }

  async function addFile(path: string, content: string) {
    if (!activeId || !user) return;
    const exists = files.find((f) => f.path === path);
    if (exists) {
      await supabase.from("project_files").update({ content }).eq("id", exists.id);
    } else {
      await supabase.from("project_files").insert({
        project_id: activeId, user_id: user.id, path, content, language: detectLang(path),
      });
    }
    refetchFiles();
  }

  async function saveActive(content: string) {
    if (!activeFile) return;
    await supabase.from("project_files").update({ content, updated_at: new Date().toISOString() }).eq("id", activeFile.id);
    qc.setQueryData(["mc-files", activeId], (old?: MCFile[]) => (old ?? []).map((f) => f.id === activeFile.id ? { ...f, content } : f));
  }

  async function deleteFile(path: string) {
    if (!confirm(`Bestand "${path}" verwijderen?`)) return;
    await supabase.from("project_files").delete().eq("project_id", activeId!).eq("path", path);
    if (activePath === path) setActivePath(null);
    refetchFiles();
  }

  async function exportPack() {
    if (!active || files.length === 0) { toast.error("Geen bestanden"); return; }
    const zip = new JSZip();
    for (const f of files) {
      if (f.path.endsWith(".png.txt")) continue; // skip placeholder text
      zip.file(f.path, f.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ext = projectKind === "addon" ? "mcaddon" : (projectKind.startsWith("mod") ? "zip" : "zip");
    a.href = url; a.download = `${active.name.replace(/\s+/g, "-")}.${ext}`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Geëxporteerd");
  }

  // Easy editor state
  const [itemForm, setItemForm] = useState({ id: "iron_blade", name: "Iron Blade", texture: "", type: "sword" as "sword" | "food" | "block" | "tool" });

  async function addItemFromForm() {
    if (!active || projectKind !== "addon") { toast.error("Easy items werken alleen op Bedrock add-ons."); return; }
    const fs = buildBedrockItem(itemForm);
    for (const f of fs) await addFile(f.path, f.content);
    toast.success(`Item "${itemForm.name}" toegevoegd`);
  }

  if (!user) return <ToolShell slug="minecraft-maker" fallbackName="Minecraft Maker" fallbackIcon="Box"><div className="grid place-items-center p-10 text-muted-foreground">Log in.</div></ToolShell>;

  return (
    <ToolShell slug="minecraft-maker" fallbackName="Minecraft Maker" fallbackIcon="Box" fallbackDescription="Maak add-ons, mods en plugins voor Minecraft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {active && <Button variant="secondary" size="sm" onClick={exportPack}><Download className="mr-1.5 h-4 w-4" />Export</Button>}
        <Dialog>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Nieuw project</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nieuw Minecraft project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Naam</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My Cool Pack" /></div>
              <div><Label>Type</Label>
                <Select value={newKind} onValueChange={(v) => setNewKind(v as ProjectKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROJECT_KINDS.map((k) => <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>)}</SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">{PROJECT_KINDS.find((k) => k.v === newKind)?.desc}</p>
              </div>
              {newKind !== "addon" && <div><Label>Mod/Plugin ID (lowercase, geen spaties)</Label><Input value={newNs} onChange={(e) => setNewNs(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} placeholder="examplemod" /></div>}
              <Button onClick={createProject} disabled={!newName.trim()} className="w-full">Maken</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1.5">
          {projects.length === 0 && <div className="rounded-xl bg-card p-3 text-xs text-muted-foreground ring-1 ring-border">Geen projecten — klik "Nieuw".</div>}
          {projects.map((p) => (
            <div key={p.id} className={cn("group flex items-center gap-1 rounded-xl px-2 py-1.5 ring-1",
              activeId === p.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border hover:shadow")}>
              <button onClick={() => { setActiveId(p.id); setActivePath(null); }} className="flex-1 truncate text-left text-sm font-medium">
                {p.name}
              </button>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7 opacity-0 group-hover:opacity-100", activeId === p.id && "text-primary-foreground hover:bg-primary-foreground/10")} onClick={() => deleteProject(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </aside>

        <div className="min-w-0">
          {!active ? (
            <div className="grid h-64 place-items-center rounded-2xl bg-card text-sm text-muted-foreground ring-1 ring-border">Selecteer of maak een project.</div>
          ) : (
            <Tabs defaultValue="files">
              <TabsList>
                <TabsTrigger value="files"><FileCode2 className="mr-1.5 h-3.5 w-3.5" />Files</TabsTrigger>
                <TabsTrigger value="easy"><Wand2 className="mr-1.5 h-3.5 w-3.5" />Easy editor</TabsTrigger>
              </TabsList>

              <TabsContent value="files">
                <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                  <div className="rounded-2xl bg-card p-2 ring-1 ring-border sm:max-h-[calc(100vh-22rem)] sm:overflow-y-auto">
                    {files.map((f) => (
                      <div key={f.id} className="group flex items-center">
                        <button onClick={() => setActivePath(f.path)}
                          className={cn("flex-1 truncate rounded-lg px-2 py-1 text-left text-xs",
                            activePath === f.path ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>
                          {f.path}
                        </button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteFile(f.path)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <NewFileButton onAdd={(p) => addFile(p, "")} />
                  </div>
                  <div className="rounded-2xl bg-card ring-1 ring-border">
                    {activeFile ? (
                      <>
                        <div className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">{activeFile.path}</div>
                        <Textarea value={activeFile.content} onChange={(e) => saveActive(e.target.value)}
                          spellCheck={false}
                          className="h-[calc(100vh-26rem)] min-h-[300px] resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0" />
                      </>
                    ) : <div className="grid h-64 place-items-center text-sm text-muted-foreground">Selecteer een bestand.</div>}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="easy">
                <div className="rounded-2xl bg-card p-4 ring-1 ring-border space-y-3">
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Sword className="h-5 w-5" />Item maken (Bedrock add-on)</h3>
                  <p className="text-xs text-muted-foreground">Vul in en klik "Toevoegen" — files worden automatisch in je add-on geplaatst.</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label>ID (lowercase)</Label><Input value={itemForm.id} onChange={(e) => setItemForm({ ...itemForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} /></div>
                    <div><Label>Display naam</Label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
                    <div><Label>Type</Label>
                      <Select value={itemForm.type} onValueChange={(v) => setItemForm({ ...itemForm, type: v as typeof itemForm.type })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sword">Zwaard</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                          <SelectItem value="food">Eten</SelectItem>
                          <SelectItem value="block">Block-icoon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2"><Label>Texture-pad (optioneel notitie)</Label><Input value={itemForm.texture} onChange={(e) => setItemForm({ ...itemForm, texture: e.target.value })} placeholder="textures/items/iron_blade.png" /></div>
                  </div>
                  <Button onClick={addItemFromForm}><Plus className="mr-1 h-4 w-4" />Toevoegen</Button>
                </div>

                <div className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-border">
                  <h3 className="mb-2 font-display text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" />Tip: Skin Editor</h3>
                  <p className="text-xs text-muted-foreground">Gebruik de aparte <strong>Skin Editor</strong>-tool om een skin te tekenen en deze als textuur in je add-on te exporteren.</p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </ToolShell>
  );
}

function NewFileButton({ onAdd }: { onAdd: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="sm" className="mt-1 h-7 w-full justify-start text-xs"><FilePlus className="mr-1.5 h-3 w-3" />Nieuw bestand</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nieuw bestand</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="behavior_pack/items/cool.json" />
          <Button onClick={() => { if (path.trim()) { onAdd(path.trim()); setPath(""); setOpen(false); } }} className="w-full">Maken</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
