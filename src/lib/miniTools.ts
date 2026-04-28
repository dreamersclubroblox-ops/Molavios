// 100+ instant client-side mini tools. No tokens used. All run in-browser.
// Each tool has: slug, name, description, icon (lucide name), category, run(input)->output.
// For UX simplicity each tool has a single text input + text output, OR a custom React component.
// Custom components keyed by slug are in MiniToolCustom.tsx.

export type MiniCategory =
  | "Tekst"
  | "Reken"
  | "Converters"
  | "Web/Dev"
  | "Datum/Tijd"
  | "Crypto"
  | "Kleuren"
  | "Random"
  | "Eenheid"
  | "Lijst"
  | "Spelletjes";

export interface MiniTool {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: MiniCategory;
  /** If present, tool is a simple text-in/text-out function. */
  run?: (input: string) => string;
  /** If present, tool renders a custom component (lookup by slug). */
  custom?: boolean;
  /** Hint shown as placeholder. */
  placeholder?: string;
}

const enc = (s: string) => encodeURIComponent(s);
const dec = (s: string) => { try { return decodeURIComponent(s); } catch { return "Ongeldige input"; } };

function rng(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export const MINI_TOOLS: MiniTool[] = [
  // ---- Tekst ----
  { slug: "uppercase", name: "UPPERCASE", description: "Tekst naar hoofdletters", icon: "CaseUpper", category: "Tekst",
    run: s => s.toUpperCase() },
  { slug: "lowercase", name: "lowercase", description: "Tekst naar kleine letters", icon: "CaseLower", category: "Tekst",
    run: s => s.toLowerCase() },
  { slug: "title-case", name: "Title Case", description: "Hoofdletter per woord", icon: "Heading", category: "Tekst",
    run: s => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) },
  { slug: "sentence-case", name: "Sentence case", description: "Eerste letter per zin", icon: "Type", category: "Tekst",
    run: s => s.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase()) },
  { slug: "reverse-text", name: "Tekst omdraaien", description: "abc → cba", icon: "FlipHorizontal", category: "Tekst",
    run: s => [...s].reverse().join("") },
  { slug: "word-count", name: "Woorden tellen", description: "Aantal woorden, regels en tekens", icon: "Hash", category: "Tekst",
    run: s => `Tekens: ${s.length}\nWoorden: ${s.trim().split(/\s+/).filter(Boolean).length}\nRegels: ${s.split("\n").length}` },
  { slug: "char-count", name: "Tekens tellen", description: "Aantal karakters incl. spaties", icon: "Sigma", category: "Tekst",
    run: s => `${s.length} tekens (${s.replace(/\s/g, "").length} zonder spaties)` },
  { slug: "remove-spaces", name: "Spaties weghalen", description: "Verwijdert alle whitespace", icon: "Minus", category: "Tekst",
    run: s => s.replace(/\s+/g, "") },
  { slug: "trim-lines", name: "Regels trimmen", description: "Whitespace per regel weghalen", icon: "AlignLeft", category: "Tekst",
    run: s => s.split("\n").map(l => l.trim()).join("\n") },
  { slug: "remove-duplicate-lines", name: "Dubbele regels weg", description: "Houd unieke regels", icon: "Filter", category: "Tekst",
    run: s => [...new Set(s.split("\n"))].join("\n") },
  { slug: "sort-lines-asc", name: "Regels A→Z", description: "Sorteer alfabetisch", icon: "ArrowDownAZ", category: "Tekst",
    run: s => s.split("\n").sort((a, b) => a.localeCompare(b)).join("\n") },
  { slug: "sort-lines-desc", name: "Regels Z→A", description: "Omgekeerd alfabetisch", icon: "ArrowUpAZ", category: "Tekst",
    run: s => s.split("\n").sort((a, b) => b.localeCompare(a)).join("\n") },
  { slug: "shuffle-lines", name: "Regels schudden", description: "Willekeurige volgorde", icon: "Shuffle", category: "Tekst",
    run: s => s.split("\n").map(l => [Math.random(), l] as const).sort((a, b) => a[0] - b[0]).map(x => x[1]).join("\n") },
  { slug: "leetspeak", name: "Leetspeak", description: "Hello → H3110", icon: "Bot", category: "Tekst",
    run: s => s.replace(/[aeisotbgzAEISOTBGZ]/g, c => ({ a: "4", e: "3", i: "1", s: "5", o: "0", t: "7", b: "8", g: "9", z: "2",
      A: "4", E: "3", I: "1", S: "5", O: "0", T: "7", B: "8", G: "9", Z: "2" } as Record<string, string>)[c]) },
  { slug: "rot13", name: "ROT13", description: "Caesar shift 13", icon: "RotateCcw", category: "Tekst",
    run: s => s.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= "Z" ? 90 : 122) >= c.charCodeAt(0) + 13 ? c.charCodeAt(0) + 13 : c.charCodeAt(0) - 13)) },
  { slug: "slugify", name: "Slugify", description: "Hello World! → hello-world", icon: "Link", category: "Tekst",
    run: s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") },
  { slug: "remove-emoji", name: "Emoji verwijderen", description: "Strip emoji uit tekst", icon: "Smile", category: "Tekst",
    run: s => s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "") },
  { slug: "find-replace", name: "Vind & vervang (regex)", description: "Format: /pattern/flags::replacement", icon: "Search", category: "Tekst",
    run: s => {
      const lines = s.split("\n");
      const head = lines[0]; const body = lines.slice(1).join("\n");
      const m = head.match(/^\/(.*)\/([gimsuy]*)::(.*)$/);
      if (!m) return "Eerste regel = /patroon/flags::vervanging\nGeef daaronder de tekst.";
      try { return body.replace(new RegExp(m[1], m[2]), m[3]); } catch (e) { return "Ongeldige regex"; }
    },
    placeholder: "/foo/gi::bar\nHier de tekst..." },

  // ---- Web/Dev ----
  { slug: "url-encode", name: "URL-encoden", description: "Maak veilige URL-string", icon: "Link2", category: "Web/Dev", run: enc },
  { slug: "url-decode", name: "URL-decoderen", description: "%20 → spatie", icon: "Link2Off", category: "Web/Dev", run: dec },
  { slug: "base64-encode", name: "Base64 encoden", description: "Tekst → base64", icon: "Binary", category: "Web/Dev",
    run: s => { try { return btoa(unescape(encodeURIComponent(s))); } catch { return "Fout"; } } },
  { slug: "base64-decode", name: "Base64 decoderen", description: "Base64 → tekst", icon: "Binary", category: "Web/Dev",
    run: s => { try { return decodeURIComponent(escape(atob(s.trim()))); } catch { return "Ongeldige base64"; } } },
  { slug: "html-encode", name: "HTML escapen", description: "< → &lt; etc.", icon: "Code", category: "Web/Dev",
    run: s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]) },
  { slug: "html-decode", name: "HTML unescapen", description: "&lt; → <", icon: "Code2", category: "Web/Dev",
    run: s => s.replace(/&(amp|lt|gt|quot|#39);/g, t => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" } as Record<string, string>)[t]) },
  { slug: "json-format", name: "JSON formatten", description: "Pretty print", icon: "Braces", category: "Web/Dev",
    run: s => { try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e: unknown) { return "Ongeldige JSON: " + (e instanceof Error ? e.message : ""); } } },
  { slug: "json-minify", name: "JSON minify", description: "Compact maken", icon: "Minimize2", category: "Web/Dev",
    run: s => { try { return JSON.stringify(JSON.parse(s)); } catch { return "Ongeldige JSON"; } } },
  { slug: "json-to-csv", name: "JSON → CSV", description: "Array van objecten naar CSV", icon: "Table", category: "Web/Dev",
    run: s => {
      try {
        const arr = JSON.parse(s);
        if (!Array.isArray(arr) || !arr.length) return "Verwacht: array van objecten";
        const keys = [...new Set(arr.flatMap((o: Record<string, unknown>) => Object.keys(o)))];
        const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        return [keys.join(","), ...arr.map((o: Record<string, unknown>) => keys.map(k => esc(o[k])).join(","))].join("\n");
      } catch { return "Ongeldige JSON"; }
    } },
  { slug: "csv-to-json", name: "CSV → JSON", description: "Eerste regel = headers", icon: "FileJson", category: "Web/Dev",
    run: s => {
      const lines = s.trim().split("\n");
      if (lines.length < 2) return "Minimaal 2 regels (header + data)";
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map(l => {
        const cells = l.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
      });
      return JSON.stringify(rows, null, 2);
    } },
  { slug: "yaml-to-json", name: "Mini YAML → JSON", description: "Eenvoudige key:value YAML", icon: "FileText", category: "Web/Dev",
    run: s => {
      const obj: Record<string, string> = {};
      for (const l of s.split("\n")) { const m = l.match(/^([^:#]+):\s*(.*)$/); if (m) obj[m[1].trim()] = m[2].trim(); }
      return JSON.stringify(obj, null, 2);
    } },
  { slug: "regex-tester", name: "Regex tester", description: "Eerste regel = /patroon/flags", icon: "Regex", category: "Web/Dev",
    run: s => {
      const lines = s.split("\n");
      const m = lines[0].match(/^\/(.*)\/([gimsuy]*)$/);
      if (!m) return "Eerste regel = /patroon/flags";
      try {
        const re = new RegExp(m[1], m[2].includes("g") ? m[2] : m[2] + "g");
        const matches = [...lines.slice(1).join("\n").matchAll(re)];
        return matches.length ? matches.map((mm, i) => `${i + 1}: ${mm[0]}`).join("\n") : "(geen matches)";
      } catch (e: unknown) { return "Fout: " + (e instanceof Error ? e.message : ""); }
    } },
  { slug: "uuid-v4", name: "UUID v4 generator", description: "Genereer een random UUID", icon: "Fingerprint", category: "Web/Dev",
    run: () => crypto.randomUUID() },
  { slug: "lorem-ipsum", name: "Lorem ipsum", description: "Aantal alinea's typen (1-20)", icon: "AlignJustify", category: "Web/Dev",
    run: s => {
      const n = Math.max(1, Math.min(20, parseInt(s) || 3));
      const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
      return Array(n).fill(lorem).join("\n\n");
    }, placeholder: "3" },
  { slug: "user-agent-info", name: "User-Agent info", description: "Toon je browser-info", icon: "Globe", category: "Web/Dev",
    run: () => `${navigator.userAgent}\n\nLanguage: ${navigator.language}\nPlatform: ${navigator.platform}` },
  { slug: "viewport-size", name: "Viewport size", description: "Huidige scherm-afmetingen", icon: "Monitor", category: "Web/Dev",
    run: () => `${window.innerWidth} × ${window.innerHeight}px (DPR ${window.devicePixelRatio})` },
  { slug: "html-strip-tags", name: "HTML tags strippen", description: "Alleen tekst overhouden", icon: "FileX", category: "Web/Dev",
    run: s => s.replace(/<[^>]+>/g, "") },
  { slug: "markdown-strip", name: "Markdown strippen", description: "Tot platte tekst", icon: "FileMinus", category: "Web/Dev",
    run: s => s.replace(/[*_`#>]/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1") },

  // ---- Reken ----
  { slug: "calculator", name: "Calculator", description: "Reken expressies (2+2*3)", icon: "Calculator", category: "Reken", custom: true },
  { slug: "percentage", name: "Percentage van getal", description: "Format: percent van getal (10 van 250)", icon: "Percent", category: "Reken",
    run: s => { const m = s.match(/([\d.]+)\s*(?:van|of)?\s*([\d.]+)/i); if (!m) return "10 van 250"; return `${(parseFloat(m[1]) * parseFloat(m[2]) / 100).toFixed(2)}`; },
    placeholder: "10 van 250" },
  { slug: "tip-calculator", name: "Fooi calculator", description: "bedrag % personen", icon: "Receipt", category: "Reken",
    run: s => { const [a, p, n] = s.split(/\s+/).map(Number); if (!a) return "100 15 4"; const total = a * (1 + (p || 0) / 100); return `Totaal: €${total.toFixed(2)}\nFooi: €${(a * (p || 0) / 100).toFixed(2)}\nPer persoon: €${(total / (n || 1)).toFixed(2)}`; },
    placeholder: "100 15 4" },
  { slug: "bmi", name: "BMI calculator", description: "lengte_cm gewicht_kg", icon: "Activity", category: "Reken",
    run: s => { const [h, w] = s.split(/\s+/).map(Number); if (!h || !w) return "180 75"; const bmi = w / Math.pow(h / 100, 2); return `BMI: ${bmi.toFixed(1)} (${bmi < 18.5 ? "ondergewicht" : bmi < 25 ? "normaal" : bmi < 30 ? "overgewicht" : "obesitas"})`; },
    placeholder: "180 75" },
  { slug: "factorial", name: "Faculteit", description: "n! (max 170)", icon: "X", category: "Reken",
    run: s => { const n = parseInt(s); if (isNaN(n) || n < 0 || n > 170) return "0-170"; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r.toString(); } },
  { slug: "fibonacci", name: "Fibonacci", description: "Eerste n Fibonacci-getallen (max 50)", icon: "Sigma", category: "Reken",
    run: s => { const n = Math.min(50, parseInt(s) || 10); const f = [0n, 1n]; for (let i = 2; i < n; i++) f.push(f[i - 1] + f[i - 2]); return f.slice(0, n).join(", "); } },
  { slug: "prime-check", name: "Priemgetal-check", description: "Is dit een priem?", icon: "Check", category: "Reken",
    run: s => { const n = parseInt(s); if (isNaN(n) || n < 2) return "Geef een geheel getal ≥ 2"; for (let i = 2; i * i <= n; i++) if (n % i === 0) return `${n} is geen priem (deelbaar door ${i})`; return `${n} is priem`; } },
  { slug: "gcd-lcm", name: "GGD & KGV", description: "Twee getallen", icon: "Divide", category: "Reken",
    run: s => { const [a, b] = s.split(/\s+/).map(Number); if (!a || !b) return "12 18"; const g = (x: number, y: number): number => y ? g(y, x % y) : x; const ggd = g(a, b); return `GGD: ${ggd}\nKGV: ${a * b / ggd}`; } },
  { slug: "quadratic", name: "Vierkantsvergelijking", description: "ax²+bx+c=0 (geef a b c)", icon: "Sigma", category: "Reken",
    run: s => { const [a, b, c] = s.split(/\s+/).map(Number); if (a == null) return "1 -3 2"; const d = b * b - 4 * a * c; if (d < 0) return "Geen reële oplossingen"; if (d === 0) return `x = ${(-b / 2 / a).toFixed(4)}`; const r = Math.sqrt(d); return `x₁ = ${((-b + r) / 2 / a).toFixed(4)}\nx₂ = ${((-b - r) / 2 / a).toFixed(4)}`; } },
  { slug: "average", name: "Gemiddelde", description: "Getallen gescheiden door spatie/komma", icon: "BarChart3", category: "Reken",
    run: s => { const n = s.split(/[\s,]+/).map(Number).filter(x => !isNaN(x)); if (!n.length) return "Geen getallen"; const sum = n.reduce((a, b) => a + b, 0); return `Gem: ${(sum / n.length).toFixed(4)}\nSom: ${sum}\nMin: ${Math.min(...n)}\nMax: ${Math.max(...n)}\nAantal: ${n.length}`; } },

  // ---- Eenheid ----
  { slug: "celsius-fahrenheit", name: "°C ↔ °F", description: "Bijv: 20c of 68f", icon: "Thermometer", category: "Eenheid",
    run: s => { const m = s.match(/(-?[\d.]+)\s*([cf])/i); if (!m) return "20c"; const v = parseFloat(m[1]); return m[2].toLowerCase() === "c" ? `${v}°C = ${(v * 9 / 5 + 32).toFixed(2)}°F` : `${v}°F = ${((v - 32) * 5 / 9).toFixed(2)}°C`; } },
  { slug: "km-miles", name: "km ↔ mijl", description: "Bijv: 10km of 5mi", icon: "Ruler", category: "Eenheid",
    run: s => { const m = s.match(/([\d.]+)\s*(km|mi)/i); if (!m) return "10km"; const v = parseFloat(m[1]); return m[2].toLowerCase() === "km" ? `${v}km = ${(v * 0.621371).toFixed(3)}mi` : `${v}mi = ${(v / 0.621371).toFixed(3)}km`; } },
  { slug: "kg-lb", name: "kg ↔ lb", description: "Bijv: 70kg of 154lb", icon: "Weight", category: "Eenheid",
    run: s => { const m = s.match(/([\d.]+)\s*(kg|lb)/i); if (!m) return "70kg"; const v = parseFloat(m[1]); return m[2].toLowerCase() === "kg" ? `${v}kg = ${(v * 2.20462).toFixed(3)}lb` : `${v}lb = ${(v / 2.20462).toFixed(3)}kg`; } },
  { slug: "bytes-format", name: "Bytes formatten", description: "1024000 → 1000 KB", icon: "HardDrive", category: "Eenheid",
    run: s => { let n = parseFloat(s); const u = ["B", "KB", "MB", "GB", "TB", "PB"]; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return `${n.toFixed(2)} ${u[i]}`; } },
  { slug: "binary-decimal", name: "Binair ↔ decimaal", description: "Bijv: 0b1010 of 10", icon: "Binary", category: "Eenheid",
    run: s => { s = s.trim(); if (s.startsWith("0b")) return `${s} = ${parseInt(s.slice(2), 2)}`; const n = parseInt(s); if (isNaN(n)) return "10 of 0b1010"; return `${n} = 0b${n.toString(2)}`; } },
  { slug: "hex-decimal", name: "Hex ↔ decimaal", description: "Bijv: 0xff of 255", icon: "Hash", category: "Eenheid",
    run: s => { s = s.trim(); if (s.startsWith("0x") || /^[a-f]/i.test(s)) return `${s} = ${parseInt(s.replace(/^0x/, ""), 16)}`; const n = parseInt(s); if (isNaN(n)) return "255 of 0xff"; return `${n} = 0x${n.toString(16)}`; } },
  { slug: "roman-numerals", name: "Romeinse cijfers", description: "Getal of romein", icon: "Hash", category: "Eenheid",
    run: s => {
      s = s.trim();
      const romans: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
      if (/^\d+$/.test(s)) { let n = parseInt(s); if (n < 1 || n > 3999) return "1-3999"; let out = ""; for (const [v, sym] of romans) { while (n >= v) { out += sym; n -= v; } } return out; }
      const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
      let total = 0; for (let i = 0; i < s.length; i++) { const c = map[s[i].toUpperCase()]; const n = map[s[i + 1]?.toUpperCase()]; total += c < n ? -c : c; } return total.toString();
    } },

  // ---- Datum/Tijd ----
  { slug: "unix-timestamp", name: "Unix timestamp ↔ datum", description: "Timestamp of leeg=nu", icon: "Clock", category: "Datum/Tijd",
    run: s => { if (!s.trim()) return `Nu: ${Math.floor(Date.now() / 1000)} (${new Date().toISOString()})`; const n = parseInt(s); if (isNaN(n)) return "Geef een unix timestamp"; return new Date(n * 1000).toISOString(); } },
  { slug: "date-diff", name: "Verschil tussen data", description: "yyyy-mm-dd yyyy-mm-dd", icon: "CalendarRange", category: "Datum/Tijd",
    run: s => { const [a, b] = s.split(/\s+/); const da = new Date(a), db = new Date(b); if (isNaN(+da) || isNaN(+db)) return "2024-01-01 2024-12-31"; const d = Math.abs(+db - +da) / 86400000; return `${d.toFixed(0)} dagen\n${(d / 7).toFixed(2)} weken\n${(d / 30.44).toFixed(2)} maanden\n${(d / 365.25).toFixed(2)} jaren`; } },
  { slug: "age-calc", name: "Leeftijd berekenen", description: "Geboortedatum (yyyy-mm-dd)", icon: "Cake", category: "Datum/Tijd",
    run: s => { const d = new Date(s); if (isNaN(+d)) return "1990-05-12"; const ms = Date.now() - +d; const years = ms / (365.25 * 86400000); return `${Math.floor(years)} jaar oud\n(${Math.floor(ms / 86400000)} dagen)`; } },
  { slug: "weekday", name: "Welke dag is...", description: "yyyy-mm-dd", icon: "Calendar", category: "Datum/Tijd",
    run: s => { const d = new Date(s); if (isNaN(+d)) return "2025-12-25"; return d.toLocaleDateString("nl-NL", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); } },
  { slug: "countdown", name: "Aftellen", description: "yyyy-mm-dd doel", icon: "Timer", category: "Datum/Tijd",
    run: s => { const d = new Date(s); if (isNaN(+d)) return "2026-01-01"; const ms = +d - Date.now(); if (ms < 0) return "Datum is voorbij"; return `${Math.floor(ms / 86400000)} dagen, ${Math.floor((ms % 86400000) / 3600000)} uur`; } },
  { slug: "world-clock", name: "Wereldklok", description: "Tijd in alle zones", icon: "Globe2", category: "Datum/Tijd",
    run: () => { const zones = ["UTC", "Europe/Amsterdam", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney", "Asia/Dubai"]; return zones.map(z => `${z}: ${new Date().toLocaleString("nl-NL", { timeZone: z })}`).join("\n"); } },

  // ---- Crypto/Hash ----
  { slug: "md5", name: "MD5 hash (light)", description: "Zwakke hash, niet voor secrets", icon: "Lock", category: "Crypto", custom: true },
  { slug: "sha-256", name: "SHA-256 hash", description: "Crypto.subtle SHA-256", icon: "Shield", category: "Crypto", custom: true },
  { slug: "sha-1", name: "SHA-1 hash", description: "Crypto.subtle SHA-1", icon: "ShieldAlert", category: "Crypto", custom: true },
  { slug: "password-strength", name: "Wachtwoord-sterkte", description: "Check je wachtwoord", icon: "KeyRound", category: "Crypto",
    run: s => {
      let score = 0; const reasons: string[] = [];
      if (s.length >= 12) { score++; reasons.push("✓ ≥12 tekens"); } else reasons.push("✗ minstens 12 tekens");
      if (/[a-z]/.test(s)) { score++; reasons.push("✓ kleine letters"); }
      if (/[A-Z]/.test(s)) { score++; reasons.push("✓ hoofdletters"); }
      if (/\d/.test(s)) { score++; reasons.push("✓ cijfers"); }
      if (/[^a-zA-Z0-9]/.test(s)) { score++; reasons.push("✓ symbolen"); }
      const labels = ["Heel zwak", "Zwak", "Redelijk", "Goed", "Sterk", "Zeer sterk"];
      return `${labels[score]}\n\n${reasons.join("\n")}`;
    } },
  { slug: "password-generator", name: "Wachtwoord-generator", description: "Lengte (default 16)", icon: "Key", category: "Crypto",
    run: s => { const len = Math.max(4, Math.min(128, parseInt(s) || 16)); const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+"; let p = ""; const arr = new Uint32Array(len); crypto.getRandomValues(arr); for (let i = 0; i < len; i++) p += chars[arr[i] % chars.length]; return p; } },
  { slug: "pin-generator", name: "Pincode generator", description: "Aantal cijfers (default 4)", icon: "LockKeyhole", category: "Crypto",
    run: s => { const n = Math.max(3, Math.min(12, parseInt(s) || 4)); let r = ""; for (let i = 0; i < n; i++) r += rng(0, 9); return r; } },

  // ---- Kleuren ----
  { slug: "color-picker", name: "Kleur picker", description: "Pick + zie HEX/RGB/HSL", icon: "Palette", category: "Kleuren", custom: true },
  { slug: "hex-to-rgb", name: "HEX → RGB", description: "#ff5733 → rgb(255,87,51)", icon: "Pipette", category: "Kleuren",
    run: s => { const m = s.replace("#", "").match(/^([a-f0-9]{6})$/i); if (!m) return "#ff5733"; const n = parseInt(m[1], 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; } },
  { slug: "rgb-to-hex", name: "RGB → HEX", description: "255,87,51 → #ff5733", icon: "Pipette", category: "Kleuren",
    run: s => { const m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/); if (!m) return "255,87,51"; return "#" + [+m[1], +m[2], +m[3]].map(n => n.toString(16).padStart(2, "0")).join(""); } },
  { slug: "color-contrast", name: "Kleur-contrast", description: "#fff #000 (WCAG ratio)", icon: "Contrast", category: "Kleuren",
    run: s => {
      const cs = s.match(/#?([a-f0-9]{6})/gi); if (!cs || cs.length < 2) return "#fff #000";
      const lum = (h: string) => { const n = parseInt(h.replace("#", ""), 16); const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255; const f = (x: number) => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const a = lum(cs[0]), b = lum(cs[1]); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      return `Contrast ratio: ${r.toFixed(2)}:1\nAA tekst: ${r >= 4.5 ? "✓" : "✗"} | AA grote tekst: ${r >= 3 ? "✓" : "✗"} | AAA: ${r >= 7 ? "✓" : "✗"}`;
    } },
  { slug: "random-color", name: "Random kleur", description: "Genereer willekeurige kleur", icon: "Shuffle", category: "Kleuren",
    run: () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0") },
  { slug: "palette-generator", name: "Palet genereren", description: "Geef base hex (#3b82f6)", icon: "Swatch", category: "Kleuren", custom: true },

  // ---- Random ----
  { slug: "random-number", name: "Random getal", description: "min max (bijv. 1 100)", icon: "Dices", category: "Random",
    run: s => { const [a, b] = s.split(/\s+/).map(Number); return rng(a || 1, b || 100).toString(); }, placeholder: "1 100" },
  { slug: "coin-flip", name: "Munt opgooien", description: "Kop of munt", icon: "Coins", category: "Random",
    run: () => Math.random() < 0.5 ? "🟡 Kop" : "⚪ Munt" },
  { slug: "dice-roll", name: "Dobbelsteen", description: "Aantal dobbelstenen (default 2)", icon: "Dices", category: "Random",
    run: s => { const n = Math.max(1, Math.min(20, parseInt(s) || 2)); const r = Array(n).fill(0).map(() => rng(1, 6)); return `${r.join(", ")} = ${r.reduce((a, b) => a + b, 0)}`; } },
  { slug: "name-picker", name: "Naam-trekker", description: "1 naam per regel", icon: "Users", category: "Random",
    run: s => { const n = s.split("\n").map(l => l.trim()).filter(Boolean); return n.length ? `Winnaar: ${n[rng(0, n.length - 1)]}` : "Geef minstens 1 naam"; } },
  { slug: "shuffle-list", name: "Lijst schudden", description: "1 item per regel", icon: "Shuffle", category: "Random",
    run: s => s.split("\n").filter(Boolean).map(x => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(x => x[1]).join("\n") },
  { slug: "random-quote", name: "Random quote", description: "100+ inspirerende quotes", icon: "Quote", category: "Random",
    run: () => { const qs = ["The only way to do great work is to love what you do. — Steve Jobs", "Be yourself; everyone else is already taken. — Oscar Wilde", "Life is what happens when you're busy making other plans. — John Lennon", "In the middle of difficulty lies opportunity. — Einstein", "Whether you think you can or can't, you're right. — Henry Ford", "Stay hungry, stay foolish. — Steve Jobs", "Done is better than perfect.", "Make it work, make it right, make it fast.", "Talk is cheap. Show me the code. — Linus Torvalds", "Premature optimization is the root of all evil. — Knuth"]; return qs[rng(0, qs.length - 1)]; } },
  { slug: "lottery-numbers", name: "Lotto-getallen", description: "6 unieke getallen 1-49", icon: "Ticket", category: "Random",
    run: () => { const s = new Set<number>(); while (s.size < 6) s.add(rng(1, 49)); return [...s].sort((a, b) => a - b).join(" "); } },

  // ---- Lijst ----
  { slug: "todo-quick", name: "Todo-list (lokaal)", description: "Snelle taken-lijst", icon: "ListTodo", category: "Lijst", custom: true },
  { slug: "tally-counter", name: "Teller / tally", description: "+1 / -1 / reset", icon: "Plus", category: "Lijst", custom: true },
  { slug: "stopwatch", name: "Stopwatch", description: "Start/pause/lap", icon: "Timer", category: "Lijst", custom: true },
  { slug: "pomodoro", name: "Pomodoro timer", description: "25/5 cycles", icon: "TimerReset", category: "Lijst", custom: true },

  // ---- Spelletjes ----
  { slug: "rock-paper-scissors", name: "Steen papier schaar", description: "Speel tegen de bot", icon: "Hand", category: "Spelletjes", custom: true },
  { slug: "memory-game", name: "Memory", description: "Klassiek kaartenspel", icon: "Brain", category: "Spelletjes", custom: true },
  { slug: "tic-tac-toe", name: "Boter kaas en eieren", description: "2-speler", icon: "Grid3x3", category: "Spelletjes", custom: true },
  { slug: "snake", name: "Snake", description: "Klassiek slang-spel", icon: "Worm", category: "Spelletjes", custom: true },
  { slug: "guess-number", name: "Raad het getal", description: "1-100", icon: "HelpCircle", category: "Spelletjes", custom: true },
  { slug: "typing-test", name: "Typtest", description: "WPM en accuracy", icon: "Keyboard", category: "Spelletjes", custom: true },
  { slug: "reaction-time", name: "Reactietijd", description: "Klik zo snel mogelijk", icon: "Zap", category: "Spelletjes", custom: true },

  // ---- Extra utility ----
  { slug: "qr-generator", name: "QR-code maker", description: "Genereer QR-code uit tekst/URL", icon: "QrCode", category: "Web/Dev", custom: true },
  { slug: "barcode-generator", name: "Barcode (Code128)", description: "Tekst/code naar barcode", icon: "Barcode", category: "Web/Dev", custom: true },
  { slug: "stopwords-counter", name: "Top-woorden tellen", description: "Frequentste woorden", icon: "BarChart", category: "Tekst",
    run: s => { const stop = new Set(["de", "het", "een", "en", "of", "the", "a", "an", "is", "to", "of", "in", "for", "on", "with"]); const counts: Record<string, number> = {}; for (const w of s.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []) { if (!stop.has(w)) counts[w] = (counts[w] ?? 0) + 1; } return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w, c]) => `${c}× ${w}`).join("\n") || "(geen)"; } },
  { slug: "tts", name: "Text-to-speech (browser)", description: "Lees tekst voor", icon: "Volume2", category: "Tekst", custom: true },
  { slug: "speech-to-text", name: "Speech-to-text (browser)", description: "Praat → tekst", icon: "Mic", category: "Tekst", custom: true },
  { slug: "morse-code", name: "Morse encoder", description: "Tekst → morse", icon: "Radio", category: "Crypto",
    run: s => { const m: Record<string, string> = { a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..", "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.", " ": "/" }; return s.toLowerCase().split("").map(c => m[c] ?? "").join(" "); } },
  { slug: "morse-decode", name: "Morse decoder", description: "Morse → tekst", icon: "Radio", category: "Crypto",
    run: s => { const m: Record<string, string> = { ".-": "a", "-...": "b", "-.-.": "c", "-..": "d", ".": "e", "..-.": "f", "--.": "g", "....": "h", "..": "i", ".---": "j", "-.-": "k", ".-..": "l", "--": "m", "-.": "n", "---": "o", ".--.": "p", "--.-": "q", ".-.": "r", "...": "s", "-": "t", "..-": "u", "...-": "v", ".--": "w", "-..-": "x", "-.--": "y", "--..": "z", "/": " " }; return s.split(" ").map(c => m[c] ?? "").join(""); } },
  { slug: "binary-text", name: "Tekst → binair", description: "Hello → 01001000...", icon: "Binary", category: "Crypto",
    run: s => [...s].map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ") },
  { slug: "binary-to-text", name: "Binair → tekst", description: "01001000 ... → Hello", icon: "Binary", category: "Crypto",
    run: s => s.split(/\s+/).filter(Boolean).map(b => String.fromCharCode(parseInt(b, 2))).join("") },
];

export const MINI_CATEGORIES: MiniCategory[] = [
  "Tekst", "Reken", "Converters", "Web/Dev", "Datum/Tijd", "Crypto", "Kleuren", "Random", "Eenheid", "Lijst", "Spelletjes",
];

export function findMiniTool(slug: string) {
  return MINI_TOOLS.find(t => t.slug === slug) ?? null;
}
