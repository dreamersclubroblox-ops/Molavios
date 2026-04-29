import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

function resolveLogin(input: string) {
  const v = input.trim();
  if (v.includes("@")) return v;
  return `${v.toLowerCase()}@bouncytools.local`;
}

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = resolveLogin(String(fd.get("email")));
    const password = String(fd.get("password"));

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Welkom terug bij Lemiro");
      navigate("/");
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { display_name: String(fd.get("name") || "") },
        },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account aangemaakt — welkom bij Lemiro");
      navigate("/");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) { toast.error("Google login mislukt"); return; }
      if (result.redirected) return;
      navigate("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google login fout");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-600/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/30 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-float-up">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-2xl shadow-violet-500/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Lemiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">Eén AI. Chat, canvas, code, search.</p>
        </div>

        {/* Glass card */}
        <div className="glass rounded-3xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1">
            <button
              onClick={() => setMode("signin")}
              className={`rounded-lg py-2 text-sm font-medium transition-all ${mode === "signin" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Inloggen
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`rounded-lg py-2 text-sm font-medium transition-all ${mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Account maken
            </button>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5 animate-float-up">
                <Label htmlFor="name" className="text-xs">Naam</Label>
                <Input id="name" name="name" required placeholder="Hoe heet je?" className="h-11" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email of gebruikersnaam</Label>
              <Input id="email" name="email" required placeholder="jij@mail.com" className="h-11" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Wachtwoord</Label>
              <Input id="password" name="password" type="password" required minLength={6} placeholder="••••••••" className="h-11"
                autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>

            <Button className="h-11 w-full text-sm font-semibold" type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Log in" : "Sign up"}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">of</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google */}
          <Button variant="outline" className="h-11 w-full text-sm font-medium" onClick={handleGoogle} disabled={googleLoading}>
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Doorgaan met Google
              </>
            )}
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Door verder te gaan ga je akkoord met de voorwaarden van Lemiro.
        </p>
      </div>
    </div>
  );
}
