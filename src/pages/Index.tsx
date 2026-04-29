import { Link } from "react-router-dom";
import { Star, Sparkles, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { useApps, useTools } from "@/hooks/useCatalog";
import { useFavoriteActions } from "@/hooks/useUserActions";
import { cn } from "@/lib/utils";

// Curated accent palette for bento tiles. HSL with light/dark variants.
const ACCENTS = [
  { bg: "from-violet-500/15 to-fuchsia-500/10", chip: "bg-violet-500", text: "text-violet-600 dark:text-violet-300" },
  { bg: "from-sky-500/15 to-cyan-500/10",       chip: "bg-sky-500",    text: "text-sky-600 dark:text-sky-300" },
  { bg: "from-emerald-500/15 to-teal-500/10",   chip: "bg-emerald-500",text: "text-emerald-600 dark:text-emerald-300" },
  { bg: "from-amber-500/15 to-orange-500/10",   chip: "bg-amber-500",  text: "text-amber-600 dark:text-amber-300" },
  { bg: "from-rose-500/15 to-pink-500/10",      chip: "bg-rose-500",   text: "text-rose-600 dark:text-rose-300" },
  { bg: "from-indigo-500/15 to-blue-500/10",    chip: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-300" },
];
const accentFor = (i: number) => ACCENTS[i % ACCENTS.length];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

// Bento sizing pattern: feature first tile larger
const bentoClass = (i: number) => {
  if (i === 0) return "sm:col-span-2 sm:row-span-2";
  if (i === 3) return "sm:col-span-2";
  return "";
};

export default function Index() {
  const { data: apps = [] } = useApps();
  const { data: tools = [] } = useTools();
  const { isFavorite, toggle } = useFavoriteActions();

  const aiTools = tools.filter((t) => t.type === "ai");

  return (
    <AppLayout>
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="relative mb-8 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-violet-500/10 via-sky-500/5 to-emerald-500/10 px-5 py-8 sm:px-8 sm:py-12"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-400/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-sky-400/30 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3 w-3" /> Lemiro · alles op één plek
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">
            Bouw, denk, <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">creëer</span>.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Chat, code, beelden, websitebuilder, Minecraft maker, 100+ mini-tools — alles met één account.
          </p>
        </div>
      </motion.section>

      {/* AI Tools — Bento */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">AI Tools</p>
            <h2 className="font-display text-xl font-bold sm:text-2xl">Direct te gebruiken</h2>
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid auto-rows-[minmax(140px,auto)] grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        >
          {aiTools.map((t, i) => {
            const a = accentFor(i);
            return (
              <motion.div key={t.id} variants={item} className={cn(bentoClass(i))}>
                <Link
                  to={t.route}
                  className={cn(
                    "group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border border-border/60 p-4 sm:p-5",
                    "bg-gradient-to-br backdrop-blur-md",
                    a.bg,
                    "transition-all duration-300 ease-spring hover:-translate-y-1 hover:shadow-2xl hover:border-foreground/20"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className={cn("grid h-11 w-11 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:rotate-3", a.chip)}>
                      <Icon name={t.icon} className="h-5 w-5" />
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); toggle("tool", t.id); }}
                      aria-label="Favoriet"
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                      <Star className={cn("h-4 w-4", isFavorite("tool", t.id) && "fill-foreground text-foreground")} />
                    </button>
                  </div>
                  <div>
                    <h3 className={cn("font-display text-base font-bold sm:text-xl", i === 0 && "sm:text-2xl")}>{t.name}</h3>
                    {t.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 sm:text-sm">{t.description}</p>
                    )}
                    <span className={cn("mt-2 inline-flex items-center gap-1 text-xs font-semibold", a.text)}>
                      Open <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Apps */}
      <section className="mt-10 sm:mt-14">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">Apps</p>
          <h2 className="font-display text-xl font-bold sm:text-2xl">Game-specifieke tools</h2>
        </div>
        <motion.div
          variants={container} initial="hidden" animate="show"
          className="grid gap-3 sm:grid-cols-2 sm:gap-4"
        >
          {apps.map((app, i) => {
            const appTools = tools.filter((t) => t.app_id === app.id);
            const a = accentFor(i + 2);
            return (
              <motion.div
                key={app.id}
                variants={item}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border border-border/60 p-5 backdrop-blur-md transition-all duration-300 ease-spring hover:-translate-y-1 hover:shadow-xl",
                  "bg-gradient-to-br", a.bg
                )}
              >
                <div className="mb-4 flex items-center justify-between">
                  <Link to={`/apps/${app.slug}`} className="flex items-center gap-3">
                    <div className={cn("grid h-11 w-11 place-items-center rounded-2xl text-white shadow", a.chip)}>
                      <Icon name={app.icon} className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold leading-tight">{app.name}</h3>
                      <p className="text-xs text-muted-foreground">{appTools.length} tools</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggle("app", app.id)}
                    aria-label="Favoriet"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                  >
                    <Star className={cn("h-4 w-4", isFavorite("app", app.id) && "fill-foreground text-foreground")} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {appTools.map((t) => (
                    <Link
                      key={t.id}
                      to={t.route}
                      className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-xs font-medium backdrop-blur transition-all duration-200 ease-spring hover:scale-105 hover:bg-foreground hover:text-background"
                    >
                      <Icon name={t.icon} className="h-3 w-3" />
                      {t.name}
                    </Link>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </AppLayout>
  );
}
