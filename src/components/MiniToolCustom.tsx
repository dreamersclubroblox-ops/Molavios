import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, RotateCcw, Play, Pause } from "lucide-react";

/** Calculator: simple safe expression evaluator. */
export function Calculator() {
  const [expr, setExpr] = useState("2 + 2 * 3");
  const [out, setOut] = useState("8");
  function evaluate(e: string) {
    if (!/^[\d+\-*/().,\s%^]*$/.test(e)) { setOut("Ongeldige tekens"); return; }
    try { const r = Function(`"use strict"; return (${e.replace(/\^/g, "**").replace(/,/g, ".")})`)(); setOut(String(r)); }
    catch { setOut("Fout"); }
  }
  useEffect(() => { evaluate(expr); }, [expr]);
  return (
    <div className="space-y-3">
      <Input value={expr} onChange={(e) => setExpr(e.target.value)} className="font-mono text-lg" placeholder="2 + 2 * 3" />
      <div className="rounded-xl bg-secondary p-4 font-mono text-2xl font-bold tabular-nums">= {out}</div>
    </div>
  );
}

/** SHA-256 / SHA-1 hasher via Web Crypto */
export function Hasher({ algo }: { algo: "SHA-1" | "SHA-256" }) {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  useEffect(() => {
    (async () => {
      const buf = new TextEncoder().encode(input);
      const hash = await crypto.subtle.digest(algo, buf);
      setOut([...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join(""));
    })();
  }, [input, algo]);
  return (
    <div className="space-y-3">
      <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tekst om te hashen…" rows={4} />
      <div className="break-all rounded-xl bg-secondary p-3 font-mono text-xs">{out || "(leeg)"}</div>
    </div>
  );
}

/** Lightweight MD5 implementation (not crypto-secure). */
function md5(str: string): string {
  // Minimal MD5 — adapted standard algorithm
  function rh(n: number) { let s = ""; for (let j = 0; j < 4; j++) s += ("0" + ((n >> (j * 8)) & 0xff).toString(16)).slice(-2); return s; }
  function ad(x: number, y: number) { const l = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xffff); }
  function rl(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
  const F = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & c) | (~b & d), a, b, x, s, t);
  const G = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn((b & d) | (c & ~d), a, b, x, s, t);
  const H = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(b ^ c ^ d, a, b, x, s, t);
  const I = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) => cmn(c ^ (b | ~d), a, b, x, s, t);
  const utf = unescape(encodeURIComponent(str));
  const n = utf.length; const wa: number[] = []; for (let i = 0; i < n; i++) wa[i >> 2] = (wa[i >> 2] || 0) | (utf.charCodeAt(i) << ((i % 4) * 8));
  wa[n >> 2] = (wa[n >> 2] || 0) | (0x80 << ((n % 4) * 8)); wa[(((n + 8) >> 6) + 1) * 16 - 2] = n * 8;
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < wa.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = F(a, b, c, d, wa[i] || 0, 7, -680876936); d = F(d, a, b, c, wa[i + 1] || 0, 12, -389564586); c = F(c, d, a, b, wa[i + 2] || 0, 17, 606105819); b = F(b, c, d, a, wa[i + 3] || 0, 22, -1044525330);
    a = F(a, b, c, d, wa[i + 4] || 0, 7, -176418897); d = F(d, a, b, c, wa[i + 5] || 0, 12, 1200080426); c = F(c, d, a, b, wa[i + 6] || 0, 17, -1473231341); b = F(b, c, d, a, wa[i + 7] || 0, 22, -45705983);
    a = F(a, b, c, d, wa[i + 8] || 0, 7, 1770035416); d = F(d, a, b, c, wa[i + 9] || 0, 12, -1958414417); c = F(c, d, a, b, wa[i + 10] || 0, 17, -42063); b = F(b, c, d, a, wa[i + 11] || 0, 22, -1990404162);
    a = F(a, b, c, d, wa[i + 12] || 0, 7, 1804603682); d = F(d, a, b, c, wa[i + 13] || 0, 12, -40341101); c = F(c, d, a, b, wa[i + 14] || 0, 17, -1502002290); b = F(b, c, d, a, wa[i + 15] || 0, 22, 1236535329);
    a = G(a, b, c, d, wa[i + 1] || 0, 5, -165796510); d = G(d, a, b, c, wa[i + 6] || 0, 9, -1069501632); c = G(c, d, a, b, wa[i + 11] || 0, 14, 643717713); b = G(b, c, d, a, wa[i] || 0, 20, -373897302);
    a = G(a, b, c, d, wa[i + 5] || 0, 5, -701558691); d = G(d, a, b, c, wa[i + 10] || 0, 9, 38016083); c = G(c, d, a, b, wa[i + 15] || 0, 14, -660478335); b = G(b, c, d, a, wa[i + 4] || 0, 20, -405537848);
    a = G(a, b, c, d, wa[i + 9] || 0, 5, 568446438); d = G(d, a, b, c, wa[i + 14] || 0, 9, -1019803690); c = G(c, d, a, b, wa[i + 3] || 0, 14, -187363961); b = G(b, c, d, a, wa[i + 8] || 0, 20, 1163531501);
    a = G(a, b, c, d, wa[i + 13] || 0, 5, -1444681467); d = G(d, a, b, c, wa[i + 2] || 0, 9, -51403784); c = G(c, d, a, b, wa[i + 7] || 0, 14, 1735328473); b = G(b, c, d, a, wa[i + 12] || 0, 20, -1926607734);
    a = H(a, b, c, d, wa[i + 5] || 0, 4, -378558); d = H(d, a, b, c, wa[i + 8] || 0, 11, -2022574463); c = H(c, d, a, b, wa[i + 11] || 0, 16, 1839030562); b = H(b, c, d, a, wa[i + 14] || 0, 23, -35309556);
    a = H(a, b, c, d, wa[i + 1] || 0, 4, -1530992060); d = H(d, a, b, c, wa[i + 4] || 0, 11, 1272893353); c = H(c, d, a, b, wa[i + 7] || 0, 16, -155497632); b = H(b, c, d, a, wa[i + 10] || 0, 23, -1094730640);
    a = H(a, b, c, d, wa[i + 13] || 0, 4, 681279174); d = H(d, a, b, c, wa[i] || 0, 11, -358537222); c = H(c, d, a, b, wa[i + 3] || 0, 16, -722521979); b = H(b, c, d, a, wa[i + 6] || 0, 23, 76029189);
    a = H(a, b, c, d, wa[i + 9] || 0, 4, -640364487); d = H(d, a, b, c, wa[i + 12] || 0, 11, -421815835); c = H(c, d, a, b, wa[i + 15] || 0, 16, 530742520); b = H(b, c, d, a, wa[i + 2] || 0, 23, -995338651);
    a = I(a, b, c, d, wa[i] || 0, 6, -198630844); d = I(d, a, b, c, wa[i + 7] || 0, 10, 1126891415); c = I(c, d, a, b, wa[i + 14] || 0, 15, -1416354905); b = I(b, c, d, a, wa[i + 5] || 0, 21, -57434055);
    a = I(a, b, c, d, wa[i + 12] || 0, 6, 1700485571); d = I(d, a, b, c, wa[i + 3] || 0, 10, -1894986606); c = I(c, d, a, b, wa[i + 10] || 0, 15, -1051523); b = I(b, c, d, a, wa[i + 1] || 0, 21, -2054922799);
    a = I(a, b, c, d, wa[i + 8] || 0, 6, 1873313359); d = I(d, a, b, c, wa[i + 15] || 0, 10, -30611744); c = I(c, d, a, b, wa[i + 6] || 0, 15, -1560198380); b = I(b, c, d, a, wa[i + 13] || 0, 21, 1309151649);
    a = I(a, b, c, d, wa[i + 4] || 0, 6, -145523070); d = I(d, a, b, c, wa[i + 11] || 0, 10, -1120210379); c = I(c, d, a, b, wa[i + 2] || 0, 15, 718787259); b = I(b, c, d, a, wa[i + 9] || 0, 21, -343485551);
    a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
  }
  return rh(a) + rh(b) + rh(c) + rh(d);
}

export function MD5() {
  const [input, setInput] = useState("");
  return (
    <div className="space-y-3">
      <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tekst…" rows={4} />
      <div className="break-all rounded-xl bg-secondary p-3 font-mono text-xs">{md5(input) || "(leeg)"}</div>
    </div>
  );
}

export function ColorPicker() {
  const [c, setC] = useState("#3b82f6");
  const n = parseInt(c.replace("#", ""), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2 / 255;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (510 - max - min) : d / (max + min); switch (max) { case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break; case g: h = ((b - r) / d + 2) * 60; break; case b: h = ((r - g) / d + 4) * 60; break; } }
  return (
    <div className="space-y-3">
      <input type="color" value={c} onChange={(e) => setC(e.target.value)} className="h-32 w-full cursor-pointer rounded-xl" />
      <div className="grid grid-cols-3 gap-2 font-mono text-sm">
        <div className="rounded-lg bg-secondary p-2"><div className="text-[10px] text-muted-foreground">HEX</div>{c}</div>
        <div className="rounded-lg bg-secondary p-2"><div className="text-[10px] text-muted-foreground">RGB</div>{r},{g},{b}</div>
        <div className="rounded-lg bg-secondary p-2"><div className="text-[10px] text-muted-foreground">HSL</div>{Math.round(h)},{Math.round(s * 100)}%,{Math.round(l * 100)}%</div>
      </div>
    </div>
  );
}

export function PaletteGenerator() {
  const [base, setBase] = useState("#3b82f6");
  const n = parseInt(base.replace("#", ""), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const shades = [-40, -25, -10, 0, 15, 30, 45].map(d => {
    const cl = (v: number) => Math.max(0, Math.min(255, v + d)).toString(16).padStart(2, "0");
    return "#" + cl(r) + cl(g) + cl(b);
  });
  return (
    <div className="space-y-3">
      <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="#3b82f6" />
      <div className="flex h-24 overflow-hidden rounded-xl">
        {shades.map(s => <div key={s} className="flex-1" style={{ background: s }} title={s} />)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px]">
        {shades.map(s => <div key={s} className="rounded bg-secondary py-1">{s}</div>)}
      </div>
    </div>
  );
}

export function QRGenerator() {
  const [text, setText] = useState("https://molavio.app");
  const [url, setUrl] = useState("");
  useEffect(() => { QRCode.toDataURL(text || " ", { width: 320, margin: 1 }).then(setUrl); }, [text]);
  return (
    <div className="space-y-3">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="URL of tekst…" />
      {url && <img src={url} alt="QR" className="mx-auto rounded-xl" width={320} height={320} />}
      {url && <Button asChild variant="secondary" className="w-full"><a href={url} download="qr.png">Download PNG</a></Button>}
    </div>
  );
}

export function BarcodeGenerator() {
  const [text, setText] = useState("123456");
  return (
    <div className="space-y-3">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Code…" />
      <div className="rounded-xl bg-white p-4 text-center">
        <div className="inline-flex items-end gap-px">
          {[...text].map((c, i) => {
            const v = c.charCodeAt(0);
            return <div key={i} className="bg-black" style={{ width: ((v % 4) + 1) + "px", height: "80px" }} />;
          })}
        </div>
        <div className="mt-2 font-mono text-xs text-black">{text}</div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Vereenvoudigde visuele barcode (geen scanner-grade Code128).</p>
    </div>
  );
}

export function TodoQuick() {
  const [items, setItems] = useState<{ t: string; d: boolean }[]>(() => { try { return JSON.parse(localStorage.getItem("mini-todo") ?? "[]"); } catch { return []; } });
  const [t, setT] = useState("");
  function save(next: typeof items) { setItems(next); localStorage.setItem("mini-todo", JSON.stringify(next)); }
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { save([...items, { t: t.trim(), d: false }]); setT(""); } }} className="flex gap-2">
        <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Nieuwe taak…" />
        <Button type="submit"><Plus className="h-4 w-4" /></Button>
      </form>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <input type="checkbox" checked={it.d} onChange={() => save(items.map((x, j) => j === i ? { ...x, d: !x.d } : x))} />
            <span className={it.d ? "line-through text-muted-foreground flex-1" : "flex-1"}>{it.t}</span>
            <button onClick={() => save(items.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-destructive">×</button>
          </li>
        ))}
        {!items.length && <li className="rounded-lg bg-secondary/50 p-3 text-center text-sm text-muted-foreground">Nog geen taken</li>}
      </ul>
    </div>
  );
}

export function TallyCounter() {
  const [n, setN] = useState(0);
  return (
    <div className="space-y-4 text-center">
      <div className="font-display text-7xl font-black tabular-nums">{n}</div>
      <div className="flex justify-center gap-2">
        <Button size="lg" variant="outline" onClick={() => setN(n - 1)}><Minus /></Button>
        <Button size="lg" variant="outline" onClick={() => setN(0)}><RotateCcw /></Button>
        <Button size="lg" onClick={() => setN(n + 1)}><Plus /></Button>
      </div>
    </div>
  );
}

export function Stopwatch() {
  const [ms, setMs] = useState(0); const [run, setRun] = useState(false);
  useEffect(() => { if (!run) return; const start = Date.now() - ms; const id = setInterval(() => setMs(Date.now() - start), 53); return () => clearInterval(id); }, [run]);
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), c = Math.floor((ms % 1000) / 10);
  return (
    <div className="space-y-4 text-center">
      <div className="font-mono text-5xl font-bold tabular-nums">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}.{String(c).padStart(2, "0")}</div>
      <div className="flex justify-center gap-2">
        <Button onClick={() => setRun(!run)}>{run ? <Pause /> : <Play />}</Button>
        <Button variant="outline" onClick={() => { setRun(false); setMs(0); }}><RotateCcw /></Button>
      </div>
    </div>
  );
}

export function Pomodoro() {
  const [secs, setSecs] = useState(25 * 60); const [run, setRun] = useState(false); const [phase, setPhase] = useState<"work" | "break">("work");
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { const np = phase === "work" ? "break" : "work"; setPhase(np); return np === "work" ? 25 * 60 : 5 * 60; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [run, phase]);
  const m = Math.floor(secs / 60), s = secs % 60;
  return (
    <div className="space-y-4 text-center">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{phase === "work" ? "Focus" : "Pauze"}</div>
      <div className="font-mono text-6xl font-bold tabular-nums">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</div>
      <div className="flex justify-center gap-2">
        <Button onClick={() => setRun(!run)}>{run ? <Pause /> : <Play />}</Button>
        <Button variant="outline" onClick={() => { setRun(false); setPhase("work"); setSecs(25 * 60); }}><RotateCcw /></Button>
      </div>
    </div>
  );
}

export function TextToSpeech() {
  const [text, setText] = useState("Hallo, ik ben Molavio.");
  return (
    <div className="space-y-3">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
      <Button className="w-full" onClick={() => { const u = new SpeechSynthesisUtterance(text); speechSynthesis.speak(u); }}>Voorlezen 🔊</Button>
    </div>
  );
}

export function SpeechToText() {
  const [text, setText] = useState(""); const [listening, setListening] = useState(false);
  function start() {
    const w = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert("Niet ondersteund in deze browser"); return; }
    const r = new SR() as { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void };
    r.lang = "nl-NL"; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setText(t); };
    r.onend = () => setListening(false);
    r.start(); setListening(true);
  }
  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={start} disabled={listening}>{listening ? "Luistert…" : "Start opnemen 🎤"}</Button>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Wat je zegt komt hier…" />
    </div>
  );
}

export function GuessNumber() {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState(""); const [hint, setHint] = useState("Raad een getal 1-100");
  const [tries, setTries] = useState(0);
  function check() { const n = parseInt(guess); setTries(t => t + 1); if (n === target) setHint(`🎉 Goed! In ${tries + 1} pogingen.`); else setHint(n < target ? "Hoger ⬆️" : "Lager ⬇️"); }
  return (
    <div className="space-y-3 text-center">
      <div className="text-lg">{hint}</div>
      <Input value={guess} onChange={(e) => setGuess(e.target.value)} type="number" onKeyDown={(e) => e.key === "Enter" && check()} />
      <div className="flex gap-2">
        <Button onClick={check} className="flex-1">Raad</Button>
        <Button variant="outline" onClick={() => { setTarget(Math.floor(Math.random() * 100) + 1); setHint("Nieuw getal!"); setTries(0); setGuess(""); }}>Nieuw</Button>
      </div>
    </div>
  );
}

export function ReactionTime() {
  const [state, setState] = useState<"idle" | "wait" | "go" | "done">("idle");
  const [start, setStart] = useState(0); const [ms, setMs] = useState(0);
  function begin() { setState("wait"); setTimeout(() => { setStart(Date.now()); setState("go"); }, 1500 + Math.random() * 3000); }
  function click() { if (state === "go") { setMs(Date.now() - start); setState("done"); } else if (state === "wait") setState("idle"); }
  return (
    <button onClick={state === "idle" || state === "done" ? begin : click}
      className={`grid h-64 w-full place-items-center rounded-2xl text-2xl font-bold text-white ${
        state === "go" ? "bg-emerald-500" : state === "wait" ? "bg-rose-500" : "bg-primary"
      }`}>
      {state === "idle" && "Klik om te starten"}
      {state === "wait" && "Wacht op groen…"}
      {state === "go" && "KLIK NU!"}
      {state === "done" && `${ms} ms — opnieuw?`}
    </button>
  );
}

export function RockPaperScissors() {
  const opts = ["✊", "✋", "✌️"]; const labels = ["Steen", "Papier", "Schaar"];
  const [pick, setPick] = useState(-1); const [bot, setBot] = useState(-1); const [res, setRes] = useState("");
  function play(i: number) { const b = Math.floor(Math.random() * 3); setPick(i); setBot(b); setRes(i === b ? "Gelijk" : (i + 1) % 3 === b ? "Verlies 😢" : "Win 🎉"); }
  return (
    <div className="space-y-3 text-center">
      <div className="flex justify-center gap-3">{opts.map((o, i) => <Button key={i} variant="outline" className="h-16 text-2xl" onClick={() => play(i)}>{o}</Button>)}</div>
      {pick >= 0 && <div className="rounded-xl bg-secondary p-4"><div className="text-4xl">{opts[pick]} vs {opts[bot]}</div><div className="mt-2 font-bold">{res}</div></div>}
    </div>
  );
}

export function TicTacToe() {
  const [b, setB] = useState<(string | null)[]>(Array(9).fill(null)); const [x, setX] = useState(true);
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const winner = lines.map(l => b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]] ? b[l[0]] : null).find(Boolean) ?? null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {b.map((c, i) => (
          <button key={i} onClick={() => { if (!c && !winner) { const n = [...b]; n[i] = x ? "X" : "O"; setB(n); setX(!x); } }}
            className="grid aspect-square place-items-center rounded-xl bg-secondary text-4xl font-bold transition-colors hover:bg-accent">{c}</button>
        ))}
      </div>
      <div className="text-center font-medium">{winner ? `${winner} wint!` : b.every(Boolean) ? "Gelijkspel" : `Aan zet: ${x ? "X" : "O"}`}</div>
      <Button variant="outline" className="w-full" onClick={() => { setB(Array(9).fill(null)); setX(true); }}>Reset</Button>
    </div>
  );
}

export function TypingTest() {
  const sample = "De snelle bruine vos springt over de luie hond. Molavio maakt typen leuker en sneller dan ooit tevoren.";
  const [input, setInput] = useState(""); const [start, setStart] = useState<number | null>(null);
  function onChange(v: string) { if (!start) setStart(Date.now()); setInput(v); }
  const ok = [...input].filter((c, i) => c === sample[i]).length;
  const wpm = start ? Math.round((ok / 5) / ((Date.now() - start) / 60000) || 0) : 0;
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-secondary p-3 font-mono text-sm leading-relaxed">
        {[...sample].map((c, i) => <span key={i} className={input[i] == null ? "" : input[i] === c ? "text-emerald-500" : "text-rose-500 underline"}>{c}</span>)}
      </div>
      <Textarea value={input} onChange={(e) => onChange(e.target.value)} placeholder="Typ hier…" rows={3} className="font-mono" />
      <div className="text-center text-sm text-muted-foreground">{wpm} WPM · {ok}/{sample.length} juist</div>
    </div>
  );
}

export function Snake() {
  return <div className="rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">Snake komt in de volgende update 🐍</div>;
}

export function Memory() {
  return <div className="rounded-xl bg-secondary p-6 text-center text-sm text-muted-foreground">Memory komt in de volgende update 🧠</div>;
}

export const CUSTOM_TOOLS: Record<string, () => JSX.Element> = {
  "calculator": Calculator,
  "sha-256": () => <Hasher algo="SHA-256" />,
  "sha-1": () => <Hasher algo="SHA-1" />,
  "md5": MD5,
  "color-picker": ColorPicker,
  "palette-generator": PaletteGenerator,
  "qr-generator": QRGenerator,
  "barcode-generator": BarcodeGenerator,
  "todo-quick": TodoQuick,
  "tally-counter": TallyCounter,
  "stopwatch": Stopwatch,
  "pomodoro": Pomodoro,
  "tts": TextToSpeech,
  "speech-to-text": SpeechToText,
  "guess-number": GuessNumber,
  "reaction-time": ReactionTime,
  "rock-paper-scissors": RockPaperScissors,
  "tic-tac-toe": TicTacToe,
  "typing-test": TypingTest,
  "snake": Snake,
  "memory-game": Memory,
};
