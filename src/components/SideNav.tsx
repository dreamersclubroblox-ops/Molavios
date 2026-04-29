import { NavLink, useNavigate } from "react-router-dom";
import { Home, Store as StoreIcon, Star, Shield, LogOut, LogIn, Sparkles, Wrench, MessagesSquare } from "lucide-react";
import { useApps, useTools } from "@/hooks/useCatalog";
import { useAuth } from "@/contexts/AuthContext";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const linkBase =
  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 ease-spring hover:bg-foreground/5 hover:text-foreground";
const linkActive = "bg-foreground/10 text-foreground";

export function SideNav() {
  const { user, isAdmin, signOut } = useAuth();
  const { data: apps = [] } = useApps();
  const { data: tools = [] } = useTools();
  const navigate = useNavigate();

  const aiTools = tools.filter((t) => t.type === "ai").slice(0, 8);
  const gameTools = tools.filter((t) => ["minecraft-maker", "skin-editor", "roblox-studio"].includes(t.slug));

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col gap-2 border-r border-border/60 bg-background/60 px-3 py-5 backdrop-blur-xl">
      <button
        onClick={() => navigate("/")}
        className="mb-2 flex items-center gap-2 px-2 font-display text-lg font-bold tracking-tight"
      >
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">M</span>
        Lemiro
      </button>

      <nav className="flex flex-col gap-0.5">
        <NavLink to="/" end className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
          <Home className="h-4 w-4" /> Home
        </NavLink>
        <NavLink to="/chats" className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
          <MessagesSquare className="h-4 w-4" /> Chats
        </NavLink>
        <NavLink to="/tool-getter" className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
          <Wrench className="h-4 w-4" /> Tool getter
        </NavLink>
        <NavLink to="/store" className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
          <StoreIcon className="h-4 w-4" /> Store
        </NavLink>
        <NavLink to="/favorites" className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
          <Star className="h-4 w-4" /> Favorieten
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
            <Shield className="h-4 w-4" /> Admin
          </NavLink>
        )}
      </nav>

      {aiTools.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI Tools
          </p>
          <nav className="flex flex-col gap-0.5">
            {aiTools.map((t) => (
              <NavLink key={t.id} to={t.route} className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
                <Icon name={t.icon} className="h-4 w-4" />
                <span className="truncate">{t.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {gameTools.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Game Tools</p>
          <nav className="flex flex-col gap-0.5">
            {gameTools.map((t) => (
              <NavLink key={t.id} to={t.route} className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
                <Icon name={t.icon} className="h-4 w-4" />
                <span className="truncate">{t.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {apps.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Apps</p>
          <nav className="flex flex-col gap-0.5">
            {apps.slice(0, 6).map((a) => (
              <NavLink key={a.id} to={`/apps/${a.slug}`} className={({ isActive }) => cn(linkBase, isActive && linkActive)}>
                <Icon name={a.icon} className="h-4 w-4" />
                <span className="truncate">{a.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      <div className="mt-auto pt-4">
        {user ? (
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" /> Uitloggen
          </Button>
        ) : (
          <Button asChild size="sm" className="w-full">
            <NavLink to="/auth"><LogIn className="mr-2 h-4 w-4" /> Inloggen</NavLink>
          </Button>
        )}
      </div>
    </aside>
  );
}
