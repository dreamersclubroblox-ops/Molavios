import { Link } from "react-router-dom";
import { Coins, Flame, LogOut, Shield, User as UserIcon, Sparkles, Gift } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTokenBalance } from "@/hooks/useTokens";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

function nextReward(streak: number) {
  const r = Math.floor(500 * Math.pow(1.1, streak));
  return Math.min(r, 50000);
}

export function ProfileMenu() {
  const { user, isAdmin, signOut } = useAuth();
  const { data: balance } = useTokenBalance(user?.id);
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const { data: streak } = useQuery({
    queryKey: ["streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_streaks")
        .select("current_streak,longest_streak,last_claim_date,total_claimed")
        .eq("user_id", user!.id).maybeSingle();
      return data ?? { current_streak: 0, longest_streak: 0, last_claim_date: null, total_claimed: 0 };
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = streak?.last_claim_date === today;
  const currentReward = Math.min(Math.floor(500 * Math.pow(1.1, Math.max(0, (streak?.current_streak ?? 0)))), 50000);

  async function claim() {
    if (!user || claiming || claimedToday) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_daily_streak", { _user_id: user.id });
    setClaiming(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { ok: boolean; reward?: number; streak?: number; error?: string };
    if (!r.ok) {
      toast.info(r.error === "already_claimed" ? "Vandaag al geclaimd" : (r.error ?? "Fout"));
      return;
    }
    toast.success(`+${r.reward} tokens · ${r.streak} dagen 🔥`);
    qc.invalidateQueries({ queryKey: ["tokens", user.id] });
    qc.invalidateQueries({ queryKey: ["streak", user.id] });
  }

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link to="/auth">Inloggen</Link>
      </Button>
    );
  }

  const initial = (user.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="group flex items-center gap-2 rounded-full bg-secondary/70 pl-2 pr-1 py-1 text-sm transition-all hover:bg-secondary">
          <span className="flex items-center gap-1 text-xs font-semibold tabular-nums">
            <Coins className="h-3.5 w-3.5 text-amber-500" />{(balance ?? 0).toLocaleString()}
          </span>
          {(streak?.current_streak ?? 0) > 0 && (
            <span className="hidden xs:flex items-center gap-0.5 text-xs font-semibold text-orange-500">
              <Flame className="h-3.5 w-3.5" />{streak!.current_streak}
            </span>
          )}
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-violet-600/10 via-fuchsia-500/5 to-cyan-500/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-cyan-500 font-bold text-white">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.email}</div>
              <div className="text-xs text-muted-foreground">{isAdmin ? "Admin" : "Gebruiker"}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-background/60 p-2.5 backdrop-blur">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Coins className="h-3 w-3" />Tokens</div>
              <div className="font-display text-lg font-bold tabular-nums">{(balance ?? 0).toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-background/60 p-2.5 backdrop-blur">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Flame className="h-3 w-3 text-orange-500" />Streak</div>
              <div className="font-display text-lg font-bold tabular-nums">{streak?.current_streak ?? 0} <span className="text-xs font-normal text-muted-foreground">dagen</span></div>
            </div>
          </div>

          <Button
            onClick={claim}
            disabled={claiming || claimedToday}
            className={cn(
              "mt-3 w-full gap-2",
              !claimedToday && "bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90"
            )}
          >
            <AnimatePresence mode="wait">
              {claimedToday ? (
                <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Vandaag al geclaimd
                </motion.span>
              ) : (
                <motion.span key="claim" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5">
                  <Gift className="h-4 w-4" /> Claim +{currentReward.toLocaleString()} tokens
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            Morgen: +{nextReward(streak?.current_streak ?? 0).toLocaleString()} (×1.1 per dag)
          </p>
        </div>

        <div className="flex flex-col p-1">
          <Link to="/favorites" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
            <UserIcon className="h-4 w-4" /> Mijn favorieten
          </Link>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
          <button onClick={signOut} className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent">
            <LogOut className="h-4 w-4" /> Uitloggen
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
