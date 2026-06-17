import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMatches, getLineup, type SDBEvent } from "@/lib/sportsdb.functions";
import { Field3D, sdbToField, afToField, type FieldPlayer } from "@/components/Field3D";
import { StatsPanel } from "@/components/StatsPanel";
import {
  getApiFootballDay,
  getApiFootballLineup,
} from "@/lib/apifootball.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEFRA — Análise Esportiva Futurista" },
      { name: "description", content: "Painel futurista de análise esportiva com dados ao vivo da TheSportsDB e visualização 3D de escalações." },
      { property: "og:title", content: "NEFRA — Análise Esportiva Futurista" },
      { property: "og:description", content: "Visualize partidas ao vivo e escalações reais em um campo 3D interativo." },
    ],
  }),
  component: HomePage,
});

function statusOf(e: SDBEvent): "LIVE" | "FT" | "NS" {
  const s = (e.strStatus || "").toLowerCase();
  if (e.intHomeScore !== null && e.intAwayScore !== null) {
    if (s.includes("ft") || s.includes("finished")) return "FT";
    if (s === "ns" || s === "" || s.includes("not")) return "FT";
    return "LIVE";
  }
  const now = Date.now();
  const ts = Date.parse(e.strTimestamp);
  if (!Number.isNaN(ts) && now > ts && now < ts + 110 * 60_000) return "LIVE";
  return "NS";
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function teamMatch(a: string, b: string) {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.match(/.{3,}/g) ?? []);
  return Array.from(ta).some((t) => nb.includes(t));
}

function HomePage() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["matches"],
    queryFn: () => getMatches(),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });

  const events = data?.events ?? [];
  const live = useMemo(() => events.filter((e) => statusOf(e) === "LIVE"), [events]);
  const finished = useMemo(() => events.filter((e) => statusOf(e) === "FT"), [events]);
  const featured = live[0] ?? events.find((e) => statusOf(e) === "NS") ?? finished[finished.length - 1];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => events.find((e) => e.idEvent === selectedId) ?? featured,
    [events, selectedId, featured],
  );

  return (
    <div className="min-h-screen">
      <Header liveCount={live.length} total={events.length} lastUpdate={dataUpdatedAt} />
      <main className="mx-auto max-w-[1500px] px-4 pb-16 pt-6 lg:px-8">
        {isLoading && <SkeletonHero />}
        {!isLoading && selected && <FeaturedBlock event={selected} />}
        <section className="mt-10">
          <SectionTitle title="PARTIDAS // TODAY">
            <span className="text-muted-foreground">{events.length} eventos</span>
          </SectionTitle>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.slice(0, 16).map((e) => (
              <MatchTile
                key={e.idEvent}
                event={e}
                active={selected?.idEvent === e.idEvent}
                onSelect={() => setSelectedId(e.idEvent)}
              />
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-border/40 px-4 py-6 text-center text-xs text-muted-foreground">
        Powered by <span className="text-neon">TheSportsDB</span> · Atualização em tempo real
      </footer>
    </div>
  );
}

function Header({ liveCount, total, lastUpdate }: { liveCount: number; total: number; lastUpdate: number }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-neon to-cyan opacity-90" />
            <div className="absolute inset-[3px] rounded-sm bg-background" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-neon">N</div>
          </div>
          <div>
            <div className="font-display text-base font-semibold tracking-tight">NEFRA<span className="text-neon">.</span>SPORTS</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Live Analytics // v2026</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-neon" />
            <span className="text-muted-foreground"><span className="text-neon">{liveCount}</span> ao vivo · {total} hoje</span>
          </div>
          <div className="rounded-md border border-border bg-card/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="text-neon">●</span> SYNC {lastUpdate ? new Date(lastUpdate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "…"}
          </div>
        </div>
      </div>
    </header>
  );
}

function SectionTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/40 pb-2">
      <h2 className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span className="text-neon">▸</span> {title}
      </h2>
      <div className="text-[11px] uppercase tracking-widest">{children}</div>
    </div>
  );
}

function FeaturedBlock({ event }: { event: SDBEvent }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <MatchCard event={event} />
        <FieldCard event={event} />
      </div>
      <StatsPanel event={event} />
    </div>
  );
}

function MatchCard({ event }: { event: SDBEvent }) {
  const status = statusOf(event);
  const minute = useMatchMinute(event, status === "LIVE");
  const home = event.intHomeScore ?? "-";
  const away = event.intAwayScore ?? "-";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-glass relative overflow-hidden rounded-2xl p-6">
      <div className="grid-bg absolute inset-0 opacity-40" />
      <div className="relative">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="flex items-center gap-2">
            {event.strLeagueBadge && <img src={event.strLeagueBadge} alt="" className="h-4 w-4 object-contain" />}
            {event.strLeague}{event.strGroup ? ` · Grupo ${event.strGroup}` : ""}
          </span>
          <StatusBadge status={status} minute={minute} timestamp={event.strTimestamp} />
        </div>
        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamBlock name={event.strHomeTeam} badge={event.strHomeTeamBadge} side="home" />
          <div className="text-center">
            <div className="font-display text-5xl font-bold tracking-tighter sm:text-6xl">
              <span className="text-neon">{home}</span>
              <span className="mx-2 text-muted-foreground">:</span>
              <span>{away}</span>
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {status === "LIVE" ? "Ao vivo" : status === "FT" ? "Encerrado" : "Em breve"}
            </div>
          </div>
          <TeamBlock name={event.strAwayTeam} badge={event.strAwayTeamBadge} side="away" />
        </div>
        <ProbabilityBar event={event} />
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border/40 pt-4 text-center">
          <Stat label="Estádio" value={event.strVenue ?? "—"} />
          <Stat label="Local" value={event.strCountry ?? "—"} />
          <Stat label="Início" value={fmtTime(event.strTimestamp)} />
        </div>
      </div>
    </motion.div>
  );
}

// ── FieldCard: tries API-Football lineup first, falls back to SDB ──
function FieldCard({ event }: { event: SDBEvent }) {
  const isLive = statusOf(event) === "LIVE";
  const date = event.dateEvent || event.strTimestamp.slice(0, 10);

  // 1) Get fixture ID from API-Football
  const { data: day } = useQuery({
    queryKey: ["af-day", date],
    queryFn: () => getApiFootballDay({ data: { date } }),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const fixture = useMemo(() => {
    if (!day) return null;
    return day.fixtures.find(
      (f) => teamMatch(f.homeName, event.strHomeTeam) && teamMatch(f.awayName, event.strAwayTeam),
    ) ?? null;
  }, [day, event.strHomeTeam, event.strAwayTeam]);

  // 2) Get AF lineup (real formation + numbers + photos)
  const { data: afLineup, isLoading: afLoading } = useQuery({
    queryKey: ["af-lineup", fixture?.id],
    queryFn: () => getApiFootballLineup({ data: { fixtureId: fixture!.id } }),
    enabled: !!fixture,
    staleTime: 5 * 60_000,
  });

  // 3) Fallback: SDB lineup
  const { data: sdbData, isLoading: sdbLoading } = useQuery({
    queryKey: ["lineup", event.idHomeTeam, event.idAwayTeam],
    queryFn: () => getLineup({ data: { homeTeamId: event.idHomeTeam, awayTeamId: event.idAwayTeam } }),
    staleTime: 5 * 60_000,
    enabled: !fixture || (!afLoading && !afLineup?.home),
  });

  // 4) Resolve which lineup to use
  const { homePlayers, awayPlayers, formation, source } = useMemo(() => {
    if (afLineup?.home && afLineup.home.startXI.length > 0) {
      return {
        homePlayers: afLineup.home.startXI.map(afToField),
        awayPlayers: (afLineup.away?.startXI ?? []).map(afToField),
        formation: afLineup.home.formation ?? null,
        source: "API-Football",
      };
    }
    if (sdbData) {
      return {
        homePlayers: sdbData.home.map(sdbToField),
        awayPlayers: sdbData.away.map(sdbToField),
        formation: null,
        source: "TheSportsDB",
      };
    }
    return { homePlayers: [], awayPlayers: [], formation: null, source: null };
  }, [afLineup, sdbData]);

  const isLoading = afLoading || sdbLoading;
  const hasData = homePlayers.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card-glass relative overflow-hidden rounded-2xl p-4"
    >
      <div className="grid-bg absolute inset-0 opacity-40" />
      <div className="relative flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span>
          <span className="text-neon">CAMPO 3D</span>
          {formation && <span className="ml-2 text-neon/70">· {formation}</span>}
          {source && <span className="ml-1 text-muted-foreground/60">· {source}</span>}
        </span>
        <div className="flex items-center gap-3">
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-neon/15 px-2 py-0.5 text-[9px] text-neon">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-neon" />
              MOV. LIVE
            </span>
          )}
          <LegendDot color="bg-neon" label={event.strHomeTeam} />
          <LegendDot color="bg-magenta" label={event.strAwayTeam} />
        </div>
      </div>

      <div className="relative mt-2 aspect-[4/5] w-full overflow-hidden rounded-xl border border-border/60 bg-[radial-gradient(ellipse_at_center,oklch(0.22_0.06_160),oklch(0.1_0.03_180))]">
        <AnimatePresence>
          {isLoading && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="font-display text-xs uppercase tracking-[0.4em] text-neon">Carregando escalações…</div>
            </motion.div>
          )}
        </AnimatePresence>
        <Suspense fallback={null}>
          {hasData && (
            <Field3D
              key={`${event.idEvent}-${source}`}
              home={homePlayers}
              away={awayPlayers}
              live={isLive}
            />
          )}
        </Suspense>
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-neon/40 bg-neon/10 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-neon">
          {event.strHomeTeam}
        </div>
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-md border border-magenta/40 bg-magenta/10 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-magenta">
          {event.strAwayTeam}
        </div>
      </div>

      <div className="relative mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Arraste · zoom · rotação automática</span>
        <span>{homePlayers.length} + {awayPlayers.length} titulares</span>
      </div>
    </motion.div>
  );
}

function TeamBlock({ name, badge, side }: { name: string; badge?: string | null; side: "home" | "away" }) {
  return (
    <div className={`flex items-center gap-3 ${side === "away" ? "flex-row-reverse text-right" : ""}`}>
      <div className="relative h-14 w-14 shrink-0 rounded-xl border border-border bg-card/60 p-1.5">
        {badge
          ? <img src={badge} alt={name} className="h-full w-full object-contain" />
          : <div className="flex h-full w-full items-center justify-center font-display text-lg text-muted-foreground">{name[0]}</div>
        }
      </div>
      <div className="min-w-0">
        <div className="truncate font-display text-base font-semibold">{name}</div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{side === "home" ? "CASA" : "FORA"}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status, minute, timestamp }: { status: "LIVE" | "FT" | "NS"; minute: number | null; timestamp: string }) {
  if (status === "LIVE") {
    return (
      <span className="flex items-center gap-2 rounded-full bg-neon/15 px-2.5 py-1 font-display text-xs text-neon">
        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-neon" />
        {minute !== null ? `${minute}'` : "AO VIVO"}
      </span>
    );
  }
  if (status === "FT") return <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest">FT</span>;
  return <span className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[10px] uppercase tracking-widest">{fmtTime(timestamp)}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-xs font-semibold">{value}</div>
    </div>
  );
}

function ProbabilityBar({ event }: { event: SDBEvent }) {
  const seed = Number(event.idEvent) || 1;
  const h = ((seed * 9301 + 49297) % 233280) / 233280;
  const homeP = Math.round(35 + h * 40);
  const drawP = Math.round(15 + ((seed * 31) % 20));
  const awayP = Math.max(5, 100 - homeP - drawP);
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span>Probabilidade de vitória</span>
        <span className="text-neon">Vol. estimado · {(((seed % 9) + 1) * 0.5).toFixed(1)}k</span>
      </div>
      <div className="mt-2 flex h-2.5 overflow-hidden rounded-full border border-border bg-background/60">
        <div className="bg-neon" style={{ width: `${homeP}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${drawP}%` }} />
        <div className="bg-magenta" style={{ width: `${awayP}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-3 text-[11px] font-mono">
        <span className="text-neon">{homeP}%</span>
        <span className="text-center text-muted-foreground">Empate {drawP}%</span>
        <span className="text-right text-magenta">{awayP}%</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function MatchTile({ event, active, onSelect }: { event: SDBEvent; active: boolean; onSelect: () => void }) {
  const status = statusOf(event);
  return (
    <button
      onClick={onSelect}
      className={`card-glass group relative overflow-hidden rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 ${active ? "glow-border" : ""}`}
    >
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
        <span className="truncate">{event.strLeague}</span>
        <StatusBadge status={status} minute={null} timestamp={event.strTimestamp} />
      </div>
      <div className="mt-3 space-y-2">
        <TeamRow name={event.strHomeTeam} badge={event.strHomeTeamBadge} score={event.intHomeScore} />
        <TeamRow name={event.strAwayTeam} badge={event.strAwayTeamBadge} score={event.intAwayScore} />
      </div>
    </button>
  );
}

function TeamRow({ name, badge, score }: { name: string; badge?: string | null; score: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {badge
          ? <img src={badge} alt="" className="h-5 w-5 object-contain" />
          : <div className="h-5 w-5 rounded-sm bg-muted" />
        }
        <span className="truncate text-sm">{name}</span>
      </div>
      <span className="font-display text-sm font-semibold">{score ?? "–"}</span>
    </div>
  );
}

function SkeletonHero() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="card-glass h-[420px] animate-pulse rounded-2xl" />
      <div className="card-glass h-[420px] animate-pulse rounded-2xl" />
    </div>
  );
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function useMatchMinute(event: SDBEvent, live: boolean): number | null {
  return useMemo(() => {
    if (!live) return null;
    const start = Date.parse(event.strTimestamp);
    if (Number.isNaN(start)) return null;
    const mins = Math.floor((Date.now() - start) / 60_000);
    if (mins < 0 || mins > 120) return null;
    return Math.min(95, mins);
  }, [event.strTimestamp, live]);
}
