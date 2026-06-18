import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav";

export function PageShell({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="relative h-9 w-9 shrink-0">
              <div className="absolute inset-0 rounded-md bg-gradient-to-br from-neon to-cyan opacity-90" />
              <div className="absolute inset-[3px] rounded-sm bg-background" />
              <div className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-neon">N</div>
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-base font-semibold tracking-tight">
                NEFRA<span className="text-neon">.</span>SPORTS
              </div>
              <div className="hidden text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:block">
                Live Analytics // v2026
              </div>
            </div>
          </Link>
          <SiteNav />
        </div>
      </header>
      <main className="mx-auto max-w-[900px] px-4 pb-20 pt-10 lg:px-8">
        {kicker && (
          <div className="mb-3 text-[10px] uppercase tracking-[0.4em] text-neon">
            ▸ {kicker}
          </div>
        )}
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <div className="prose-nefra mt-8 space-y-6 text-sm leading-relaxed text-foreground/85 sm:text-base">
          {children}
        </div>
      </main>
      <footer className="border-t border-border/40 px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NEFRA.SPORTS · Powered by{" "}
        <span className="text-neon">TheSportsDB</span> &{" "}
        <span className="text-neon">API-Football</span>
      </footer>
    </div>
  );
}
