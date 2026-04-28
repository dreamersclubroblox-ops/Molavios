import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ToolShell } from "@/components/ToolShell";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Eraser, Paintbrush, Pipette, Trash2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SKIN_W = 64, SKIN_H = 64;

const REGIONS = {
  head: { x: 0, y: 0, w: 32, h: 16 },
  body: { x: 16, y: 16, w: 24, h: 16 },
  arm_r: { x: 40, y: 16, w: 16, h: 16 },
  leg_r: { x: 0, y: 16, w: 16, h: 16 },
  arm_l: { x: 32, y: 48, w: 16, h: 16 },
  leg_l: { x: 16, y: 48, w: 16, h: 16 },
};

function defaultSkinDataURL(): string {
  const c = document.createElement("canvas");
  c.width = SKIN_W; c.height = SKIN_H;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, SKIN_W, SKIN_H);
  g.fillStyle = "#c68642";
  g.fillRect(0, 0, 32, 16);
  g.fillStyle = "#0e7c66";
  g.fillRect(16, 16, 24, 16);
  g.fillStyle = "#c68642";
  g.fillRect(40, 16, 16, 16);
  g.fillRect(32, 48, 16, 16);
  g.fillStyle = "#3a4a8a";
  g.fillRect(0, 16, 16, 16);
  g.fillRect(16, 48, 16, 16);
  return c.toDataURL();
}

export default function SkinEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState("#c44a3a");
  const [tool, setTool] = useState<"paint" | "erase" | "pick">("paint");
  const [zoom, setZoom] = useState(10);
  const [pixelData, setPixelData] = useState<string>("");
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = SKIN_W; c.height = SKIN_H;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, SKIN_W, SKIN_H);
      ctx.drawImage(img, 0, 0);
      setPixelData(c.toDataURL());
    };
    img.src = defaultSkinDataURL();
  }, []);

  useEffect(() => {
    const mount = previewRef.current; if (!mount) return;
    const w = mount.clientWidth, h = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 8, 28);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    const tex = new THREE.CanvasTexture(canvasRef.current!);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    textureRef.current = tex;

    const player = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true });
    
    function makeBox(w: number, hgt: number, d: number) {
      const geo = new THREE.BoxGeometry(w, hgt, d);
      return new THREE.Mesh(geo, mat);
    }

    const head = makeBox(8, 8, 8); head.position.set(0, 10, 0);
    const body = makeBox(8, 12, 4); body.position.set(0, 0, 0);
    const armR = makeBox(4, 12, 4); armR.position.set(-6, 0, 0);
    const armL = makeBox(4, 12, 4); armL.position.set(6, 0, 0);
    const legR = makeBox(4, 12, 4); legR.position.set(-2, -12, 0);
    const legL = makeBox(4, 12, 4); legL.position.set(2, -12, 0);
    player.add(head, body, armR, armL, legR, legL);
    scene.add(player);

    let raf = 0;
    function tick() {
      player.rotation.y += 0.01;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();

    const onResize = () => {
      const w2 = mount.clientWidth, h2 = mount.clientHeight;
      camera.aspect = w2 / h2; camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mat.dispose(); tex.dispose();
    };
  }, []);

  useEffect(() => { if (textureRef.current) textureRef.current.needsUpdate = true; }, [pixelData]);

  function paintAt(e: React.MouseEvent) {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * SKIN_W);
    const y = Math.floor((e.clientY - rect.top) / rect.height * SKIN_H);
    if (x < 0 || y < 0 || x >= SKIN_W || y >= SKIN_H) return;
    const ctx = c.getContext("2d")!;
    if (tool === "pick") {
      const px = ctx.getImageData(x, y, 1, 1).data;
      if (px[3] > 0) setColor(`#${[px[0], px[1], px[2]].map((n) => n.toString(16).padStart(2, "0")).join("")}`);
      return;
    }
    if (tool === "erase") {
      ctx.clearRect(x, y, 1, 1);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
    setPixelData(c.toDataURL());
  }

  const [drawing, setDrawing] = useState(false);
  function onDown(e: React.MouseEvent) { setDrawing(true); paintAt(e); }
  function onMove(e: React.MouseEvent) { if (drawing) paintAt(e); }
  function onUp() { setDrawing(false); }

  function clearAll() {
    if (!confirm("Skin leegmaken?")) return;
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, SKIN_W, SKIN_H);
    setPixelData(c.toDataURL());
  }

  function reset() {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, SKIN_W, SKIN_H); ctx.drawImage(img, 0, 0); setPixelData(c.toDataURL()); };
    img.src = defaultSkinDataURL();
  }

  function downloadPng() {
    const c = canvasRef.current!;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "skin.png"; a.click();
      URL.revokeObjectURL(url);
    });
  }

  function uploadSkin(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width !== 64 || img.height !== 64) toast.warning("Skin moet 64x64 zijn — geladen maar uitlijning kan afwijken.");
      const c = canvasRef.current!; const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, SKIN_W, SKIN_H);
      ctx.drawImage(img, 0, 0, SKIN_W, SKIN_H);
      setPixelData(c.toDataURL());
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  const SWATCHES = ["#000000", "#ffffff", "#c44a3a", "#e8a23a", "#f0d846", "#5fbf3a", "#3aaee0", "#3a4a8a", "#a05fc4", "#c68642", "#7a3a1a", "#666666"];

  return (
    <ToolShell slug="skin-editor" fallbackName="Skin Editor" fallbackIcon="User" fallbackDescription="Teken een Minecraft skin met live 3D preview">
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={tool === "paint" ? "default" : "secondary"} onClick={() => setTool("paint")}><Paintbrush className="mr-1.5 h-3.5 w-3.5" />Verf</Button>
            <Button size="sm" variant={tool === "erase" ? "default" : "secondary"} onClick={() => setTool("erase")}><Eraser className="mr-1.5 h-3.5 w-3.5" />Gum</Button>
            <Button size="sm" variant={tool === "pick" ? "default" : "secondary"} onClick={() => setTool("pick")}><Pipette className="mr-1.5 h-3.5 w-3.5" />Pipet</Button>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent" />
            <div className="flex flex-wrap gap-1">
              {SWATCHES.map((s) => (
                <button key={s} onClick={() => setColor(s)} className={cn("h-6 w-6 rounded border", color === s ? "border-foreground ring-2 ring-foreground/40" : "border-border")} style={{ background: s }} />
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Label className="text-xs">Zoom</Label>
              <Slider min={4} max={16} step={1} value={[zoom]} onValueChange={(v) => setZoom(v[0])} className="w-24" />
            </div>
          </div>

          <div className="grid place-items-center overflow-auto rounded-xl bg-[repeating-conic-gradient(#888_0_25%,#bbb_0_50%)] bg-[length:16px_16px] p-4">
            <canvas
              ref={canvasRef}
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
              style={{ width: SKIN_W * zoom, height: SKIN_H * zoom, imageRendering: "pixelated", cursor: tool === "pick" ? "crosshair" : "cell" }}
              className="bg-transparent"
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={clearAll}><Trash2 className="mr-1 h-3.5 w-3.5" />Leeg</Button>
            <Button size="sm" variant="secondary" onClick={reset}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset</Button>
            <Label htmlFor="skin-upload" className="cursor-pointer">
              <Button asChild size="sm" variant="secondary"><span><Upload className="mr-1 h-3.5 w-3.5" />Upload</span></Button>
            </Label>
            <input id="skin-upload" type="file" accept="image/png" onChange={uploadSkin} className="hidden" />
            <Button size="sm" onClick={downloadPng} className="ml-auto"><Download className="mr-1 h-3.5 w-3.5" />Download PNG</Button>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-2 ring-1 ring-border">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">3D Preview</div>
          <div ref={previewRef} className="aspect-square w-full overflow-hidden rounded-xl bg-[#1a1a2e]" />
          <p className="mt-2 px-2 text-[11px] text-muted-foreground">Auto-rotating preview. Pixels updaten live.</p>
        </div>
      </div>
    </ToolShell>
  );
}
