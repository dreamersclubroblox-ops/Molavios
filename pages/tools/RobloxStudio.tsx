import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as THREE from "three";
import { ToolShell } from "@/components/ToolShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Box, Code2, Play, Save, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RBProject { id: string; name: string; description: string | null; }
interface RBFile { id: string; project_id: string; path: string; content: string; language: string; }

interface SceneObject {
  id: string; name: string; type: "Part" | "Block" | "Sphere" | "SpawnLocation";
  x: number; y: number; z: number;
  sx: number; sy: number; sz: number;
  color: string;
}

const STARTER_LUA = `-- Welkom bij Molavio Roblox Studio-lite!
-- Schrijf hier je server-side Lua script.

local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(plr)
    print("Speler joinde: " .. plr.Name)
    plr.CharacterAdded:Connect(function(char)
        local hum = char:WaitForChild("Humanoid")
        hum.WalkSpeed = 24
    end)
end)
`;

export default function RobloxStudio() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [scene, setScene] = useState<SceneObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["rb-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("website_projects").select("id,name,description")
        .eq("user_id", user!.id).like("description", "RB:%").order("created_at", { ascending: false });
      return (data ?? []) as RBProject[];
    },
  });

  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: ["rb-files", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase.from("project_files").select("*").eq("project_id", activeId!).order("path");
      return (data ?? []) as RBFile[];
    },
  });

  const active = projects.find((p) => p.id === activeId) || null;
  const activeFile = files.find((f) => f.path === activePath) ?? null;
  const sceneFile = files.find((f) => f.path === "scene.json");

  useEffect(() => { if (!activeId && projects[0]) setActiveId(projects[0].id); }, [projects, activeId]);
  useEffect(() => { if (!activePath && files[0]) setActivePath(files[0].path); }, [files, activePath]);
  useEffect(() => {
    if (sceneFile) {
      try { setScene(JSON.parse(sceneFile.content)); } catch { setScene([]); }
    } else setScene([]);
  }, [sceneFile?.id]);

  // 3D preview of scene
  useEffect(() => {
    const mount = previewRef.current; if (!mount) return;
    const w = mount.clientWidth, h = mount.clientHeight || 360;
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0x87ceeb);
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(20, 18, 28);
    camera.lookAt(0, 2, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);
    sc.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(10, 20, 10); sc.add(dl);
    // Ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: 0x4a8c3a }));
    ground.rotation.x = -Math.PI / 2;
    sc.add(ground);
    // Grid
    sc.add(new THREE.GridHelper(80, 40, 0x222222, 0x444444));
    // Objects
    for (const o of scene) {
      let geo: THREE.BufferGeometry;
      if (o.type === "Sphere") geo = new THREE.SphereGeometry(o.sx / 2, 16, 16);
      else if (o.type === "SpawnLocation") geo = new THREE.BoxGeometry(o.sx, 0.5, o.sz);
      else geo = new THREE.BoxGeometry(o.sx, o.sy, o.sz);
      const mat = new THREE.MeshLambertMaterial({ color: o.color });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(o.x, o.y, o.z);
      if (o.id === selectedId) {
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffff00 }));
        m.add(line);
      }
      sc.add(m);
    }
    let raf = 0;
    let theta = 0;
    function tick() {
      theta += 0.003;
      camera.position.x = Math.cos(theta) * 30;
      camera.position.z = Math.sin(theta) * 30;
      camera.lookAt(0, 2, 0);
      renderer.render(sc, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();
    const onResize = () => {
      const w2 = mount.clientWidth; const h2 = mount.clientHeight || 360;
      camera.aspect = w2 / h2; camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); renderer.dispose(); };
  }, [scene, selectedId]);

  async function createProject() {
    if (!user || !newName.trim()) return;
    const { data, error } = await supabase.from("website_projects").insert({
      user_id: user.id, name: newName.trim(), description: "RB:studio",
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("project_files").insert([
      { project_id: data.id, user_id: user.id, path: "scripts/server.lua", content: STARTER_LUA, language: "lua" },
      { project_id: data.id, user_id: user.id, path: "scripts/client.lua", content: "-- Client script\nprint('client loaded')\n", language: "lua" },
      { project_id: data.id, user_id: user.id, path: "scene.json", content: JSON.stringify([
        { id: crypto.randomUUID(), name: "SpawnLocation", type: "SpawnLocation", x: 0, y: 0.25, z: 0, sx: 6, sy: 0.5, sz: 6, color: "#cccccc" },
        { id: crypto.randomUUID(), name: "Baseplate", type: "Block", x: 0, y: -0.5, z: 0, sx: 60, sy: 1, sz: 60, color: "#888888" },
      ], null, 2), language: "json" },
      { project_id: data.id, user_id: user.id, path: "README.md", content: `# ${newName}\n\nRoblox Studio-lite project. Schrijf Lua scripts en bouw de scene.\nExporteer scene.json naar Roblox via een plugin (toekomstig).`, language: "markdown" },
    ]);
    toast.success("Project aangemaakt");
    setNewName(""); setActiveId(data.id);
    qc.invalidateQueries({ queryKey: ["rb-projects", user.id] });
  }

  async function deleteProject(id: string) {
    if (!confirm("Project verwijderen?")) return;
    await supabase.from("project_files").delete().eq("project_id", id);
    await supabase.from("website_projects").delete().eq("id", id);
    if (activeId === id) { setActiveId(null); setActivePath(null); }
    qc.invalidateQueries({ queryKey: ["rb-projects", user!.id] });
  }

  async function saveScene(next: SceneObject[]) {
    setScene(next);
    if (!sceneFile) return;
    const content = JSON.stringify(next, null, 2);
    await supabase.from("project_files").update({ content }).eq("id", sceneFile.id);
    qc.setQueryData(["rb-files", activeId], (old?: RBFile[]) => (old ?? []).map((f) => f.id === sceneFile.id ? { ...f, content } : f));
  }

  function addObject(type: SceneObject["type"]) {
    const obj: SceneObject = {
      id: crypto.randomUUID(), name: type, type,
      x: 0, y: 2, z: 0, sx: 4, sy: 4, sz: 4, color: type === "Sphere" ? "#ff6b6b" : "#4dd0e1",
    };
    saveScene([...scene, obj]);
    setSelectedId(obj.id);
  }

  async function saveActive(content: string) {
    if (!activeFile) return;
    await supabase.from("project_files").update({ content, updated_at: new Date().toISOString() }).eq("id", activeFile.id);
    qc.setQueryData(["rb-files", activeId], (old?: RBFile[]) => (old ?? []).map((f) => f.id === activeFile.id ? { ...f, content } : f));
  }

  const selected = scene.find((o) => o.id === selectedId) || null;

  if (!user) return <ToolShell slug="roblox-studio" fallbackName="Roblox Studio-lite" fallbackIcon="Gamepad2"><div className="grid place-items-center p-10 text-muted-foreground">Log in.</div></ToolShell>;

  return (
    <ToolShell slug="roblox-studio" fallbackName="Roblox Studio-lite" fallbackIcon="Gamepad2" fallbackDescription="Bouw scenes en schrijf Lua scripts">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nieuw project…" className="h-9 w-48" />
        <Button onClick={createProject} disabled={!newName.trim()} size="sm"><Plus className="mr-1 h-4 w-4" />Maken</Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[180px_1fr]">
        <aside className="space-y-1.5">
          {projects.length === 0 && <div className="rounded-xl bg-card p-3 text-xs text-muted-foreground ring-1 ring-border">Geen projecten.</div>}
          {projects.map((p) => (
            <div key={p.id} className={cn("group flex items-center gap-1 rounded-xl px-2 py-1.5 ring-1",
              activeId === p.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border")}>
              <button onClick={() => setActiveId(p.id)} className="flex-1 truncate text-left text-sm font-medium">{p.name}</button>
              <Button variant="ghost" size="icon" className={cn("h-7 w-7 opacity-0 group-hover:opacity-100", activeId === p.id && "text-primary-foreground")} onClick={() => deleteProject(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </aside>

        <div className="min-w-0">
          {!active ? (
            <div className="grid h-64 place-items-center rounded-2xl bg-card ring-1 ring-border text-sm text-muted-foreground">Selecteer of maak een project.</div>
          ) : (
            <Tabs defaultValue="scene">
              <TabsList>
                <TabsTrigger value="scene"><Box className="mr-1.5 h-3.5 w-3.5" />Scene</TabsTrigger>
                <TabsTrigger value="scripts"><Code2 className="mr-1.5 h-3.5 w-3.5" />Scripts</TabsTrigger>
              </TabsList>

              <TabsContent value="scene">
                <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => addObject("Block")}><Plus className="mr-1 h-3.5 w-3.5" />Block</Button>
                      <Button size="sm" onClick={() => addObject("Sphere")}><Plus className="mr-1 h-3.5 w-3.5" />Sphere</Button>
                      <Button size="sm" onClick={() => addObject("SpawnLocation")}><Plus className="mr-1 h-3.5 w-3.5" />Spawn</Button>
                    </div>
                    <div ref={previewRef} className="h-[420px] w-full overflow-hidden rounded-2xl ring-1 ring-border" />
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-2xl bg-card p-2 ring-1 ring-border">
                      <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hierarchy</p>
                      <div className="space-y-0.5">
                        {scene.map((o) => (
                          <div key={o.id} className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-xs",
                            selectedId === o.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                            <button onClick={() => setSelectedId(o.id)} className="flex-1 truncate text-left">{o.name}</button>
                            <Button variant="ghost" size="icon" className={cn("h-5 w-5", selectedId === o.id && "text-primary-foreground")}
                              onClick={() => saveScene(scene.filter((x) => x.id !== o.id))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selected && (
                      <div className="space-y-2 rounded-2xl bg-card p-3 ring-1 ring-border text-xs">
                        <div><Label className="text-[11px]">Naam</Label><Input value={selected.name} onChange={(e) => saveScene(scene.map((o) => o.id === selected.id ? { ...o, name: e.target.value } : o))} className="h-7 text-xs" /></div>
                        <div className="grid grid-cols-3 gap-1">
                          {(["x","y","z"] as const).map((k) => (
                            <div key={k}><Label className="text-[11px] uppercase">{k}</Label><Input type="number" value={selected[k]} onChange={(e) => saveScene(scene.map((o) => o.id === selected.id ? { ...o, [k]: Number(e.target.value) } : o))} className="h-7 text-xs" /></div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {(["sx","sy","sz"] as const).map((k) => (
                            <div key={k}><Label className="text-[11px] uppercase">{k.slice(1)}</Label><Input type="number" value={selected[k]} onChange={(e) => saveScene(scene.map((o) => o.id === selected.id ? { ...o, [k]: Number(e.target.value) } : o))} className="h-7 text-xs" /></div>
                          ))}
                        </div>
                        <div><Label className="text-[11px]">Kleur</Label><input type="color" value={selected.color} onChange={(e) => saveScene(scene.map((o) => o.id === selected.id ? { ...o, color: e.target.value } : o))} className="h-7 w-full rounded border border-border bg-transparent" /></div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="scripts">
                <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                  <div className="rounded-2xl bg-card p-2 ring-1 ring-border">
                    {files.filter((f) => f.path.endsWith(".lua") || f.path.endsWith(".md")).map((f) => (
                      <button key={f.id} onClick={() => setActivePath(f.path)}
                        className={cn("block w-full truncate rounded-lg px-2 py-1 text-left text-xs",
                          activePath === f.path ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}>
                        {f.path}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-card ring-1 ring-border">
                    {activeFile ? (
                      <>
                        <div className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">{activeFile.path}</div>
                        <Textarea value={activeFile.content} onChange={(e) => saveActive(e.target.value)}
                          spellCheck={false}
                          className="h-[420px] resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0" />
                      </>
                    ) : <div className="grid h-64 place-items-center text-sm text-muted-foreground">Selecteer een script.</div>}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
