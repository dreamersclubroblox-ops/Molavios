import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { BottomDock } from "@/components/BottomDock";
import { SideNav } from "@/components/SideNav";
import { CommandPalette } from "@/components/CommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageTransition } from "@/components/PageTransition";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <div className="flex">
        <SideNav />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
            <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-6">
              <Link to="/" className="flex items-center gap-2 font-display text-base font-bold tracking-tight sm:text-lg lg:hidden">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-white">M</span>
                <span className="hidden xs:inline">Molavio</span>
              </Link>

              <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
                <CommandPalette />
                <ThemeToggle />
                <ProfileMenu />
                {!user && null}
              </div>
            </div>
          </header>

          <main className="px-3 pb-32 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
            <div className="mx-auto w-full max-w-6xl">
              <AnimatePresence mode="wait">
                <PageTransition key={location.pathname}>{children}</PageTransition>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      <BottomDock />
    </div>
  );
}
