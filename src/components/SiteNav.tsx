import { Link } from "@tanstack/react-router";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Ao Vivo" },
  { to: "/sobre", label: "Sobre" },
  { to: "/como-funciona", label: "Como funciona" },
  { to: "/privacidade", label: "Privacidade" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="flex items-center gap-1">
      {/* Desktop */}
      <ul className="hidden items-center gap-1 md:flex">
        {NAV.map((n) => (
          <li key={n.to}>
            <Link
              to={n.to}
              className="rounded-md px-3 py-1.5 text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-card/60 hover:text-neon [&.active]:text-neon"
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          </li>
        ))}
      </ul>
      {/* Mobile burger */}
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card/60 md:hidden"
      >
        <span className="relative block h-3 w-4">
          <span className={`absolute left-0 top-0 h-0.5 w-full bg-neon transition-transform ${open ? "translate-y-[5px] rotate-45" : ""}`} />
          <span className={`absolute left-0 top-1.5 h-0.5 w-full bg-neon transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`absolute left-0 top-3 h-0.5 w-full bg-neon transition-transform ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
        </span>
      </button>
      {open && (
        <ul className="absolute right-3 top-[60px] z-30 flex w-48 flex-col gap-0.5 rounded-lg border border-border bg-background/95 p-2 shadow-xl backdrop-blur-xl md:hidden">
          {NAV.map((n) => (
            <li key={n.to}>
              <Link
                to={n.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:bg-card hover:text-neon [&.active]:text-neon"
                activeOptions={{ exact: true }}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
