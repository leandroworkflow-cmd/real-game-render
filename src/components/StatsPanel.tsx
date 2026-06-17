// ============================================================
// COLE ESTE CONTEÚDO EM: src/components/StatsPanel.tsx
// (arquivo NOVO — crie na pasta src/components/)
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getApiFootballDay, getApiFootballDetails } from "@/lib/apifootball.functions";
import type { SDBEvent } from "@/lib/sportsdb.functions";

// ── helpers ──────────────────────────────────────────────────
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function teamMatch(a: string, b: string) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.match(/.{3,}/g) ?? []);
  return Array.from(ta).some((t) => nb.includes(t));
}

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

// ── label map ────────────────────────────────────────────────
const STAT_LABELS: Record<string, string> = {
  "Shots on Goal": "Chutes ao gol",
  "Shots off Goal": "Chutes pra fora",
  "Total Shots": "Chutes totais",
  "Blocked Shots": "Chutes bloqueados",
  "Shots insidebox": "Chutes na área",
  "Shots outsidebox": "Chutes de fora",
  Fouls: "Faltas",
  "Corner Kicks": "Escanteios",
  Offsides: "Impedimentos",
  "Ball Possession": "Posse de bola",
  "Yellow Cards": "Cartões amarelos",
  "Red Cards": "Cartões vermelhos",
  "Goalkeeper Saves": "Defesas do goleiro",
  "Total passes": "Passes totais",
  "Passes accurate": "Passes certos",
  "Passes %": "Precisão de passes",
  expected_goals: "xG (esperados)",
};

const PRIORITY_STATS = [
  "Ball Possession",
  "Shots on Goal",
  "Total Shots",
  "Corner Kicks",
  "Fouls",
  "Yellow Cards",
  "Red Cards",
  "Offsides",
  "Goalkeeper Saves",
];

// ── tabs ─────────────────────────────────────────────────────
type Tab = "stats" | "cards" | "scorers" | "heatmap" | "timeline";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "stats", label: "Estatísticas", icon: "📊" },
  { id: "cards", label: "Cartões", icon: "🟨" },
  { id: "scorers", label: "Artilheiros", icon: "⚽" },
  { id: "heatmap", label: "Mapa de Calor", icon: "🗺️" },
  { id: "timeline", label: "Timeline", icon: "⏱️" },
];

// ── main export ───────────────────────────────────────────────
export function StatsPanel({ event }: { event: SDBEvent }) {
  const [tab, setTab] = useState<Tab>("stats");
  const date = event.dateEvent || event.strTimestamp.slice(0, 10);

  const { data: day, isLoading: dayLoading, error: dayError } = useQuery({
    queryKey: ["af-day", date],
    queryFn: () => getApiFootballDay({ data: { date } }),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const fixture = useMemo(() => {
    if (!day) return null;
    return (
      day.fixtures.find(
        (f) =>
          teamMatch(f.homeName, event.strHomeTeam) &&
          teamMatch(f.awayName, event.strAwayTeam),
      ) ?? null
    );
  }, [day, event.strHomeTeam, event.strAwayTeam]);

  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ["af-details", fixture?.id],
    queryFn: () => getApiFootballDetails({ data: { fixtureId: fixture!.id } }),
    enabled: !!fixture,
    staleTime: 60_000,
    refetchInterval: statusOf(event) === "LIVE" ? 30_000 : false,
  });

  const cardEvents = useMemo(
    () => details?.events.filter((e) => e.type === "Card") ?? [],
    [details],
  );
  const goalEvents = useMemo(
    () => details?.events.filter((e) => e.type === "Goal") ?? [],
    [details],
  );

  // scorers: aggregate goals per player
  const scorers = useMemo(() => {
    const map = new Map<string, { name: string; team: "home" | "away"; goals: number; minutes: number[] }>();
    for (const e of goalEvents) {
      if (!e.player) continue;
      const existing = map.get(e.player);
      if (existing) {
        existing.goals++;
        existing.minutes.push(e.minute);
      } else {
        map.set(e.player, { name: e.player, team: e.team, goals: 1, minutes: [e.minute] });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.goals - a.goals);
  }, [goalEvents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card-glass relative overflow-hidden rounded-2xl"
    >
      <div className="grid-bg absolute inset-0 opacity-30" />

      {/* header */}
      <div className="relative border-b border-border/40 px-5 pt-4 pb-0">
        <div className="flex items-center justify-between pb-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span>
            <span className="text-neon">ANÁLISE PROFUNDA</span> · API-Football
          </span>
          {(dayLoading || detailsLoading) && (
            <span className="animate-pulse text-neon">carregando…</span>
          )}
        </div>

        {/* tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2 text-[11px] font-medium uppercase tracking-widest transition-colors ${
                tab === t.id
                  ? "border-border/60 bg-card/80 text-neon"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <div className="relative p-5">
        {dayError && (
          <div className="text-xs text-magenta">
            Falha ao consultar API-Football. Verifique se sua chave é válida.
          </div>
        )}

        {!dayError && !dayLoading && !fixture && (
          <div className="text-xs text-muted-foreground">
            Esta partida ainda não está disponível na API-Football (cobertura por liga). Outros jogos
            podem ter dados completos — clique em um dos cards abaixo.
          </div>
        )}

        <AnimatePresence mode="wait">
          {details && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {tab === "stats" && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <StatsGrid stats={details.stats} />
                  <MotmCard motm={details.motm} />
                </div>
              )}

              {tab === "cards" && (
                <CardsPanel
                  events={cardEvents}
                  homeName={event.strHomeTeam}
                  awayName={event.strAwayTeam}
                  homeBadge={event.strHomeTeamBadge}
                  awayBadge={event.strAwayTeamBadge}
                />
              )}

              {tab === "scorers" && (
                <ScorersPanel
                  scorers={scorers}
                  homeName={event.strHomeTeam}
                  awayName={event.strAwayTeam}
                  homeBadge={event.strHomeTeamBadge}
                  awayBadge={event.strAwayTeamBadge}
                  homeScore={event.intHomeScore}
                  awayScore={event.intAwayScore}
                />
              )}

              {tab === "heatmap" && (
                <HeatmapPanel
                  events={details.events}
                  homeName={event.strHomeTeam}
                  awayName={event.strAwayTeam}
                />
              )}

              {tab === "timeline" && (
                <EventsTimeline
                  events={details.events}
                  homeName={event.strHomeTeam}
                  awayName={event.strAwayTeam}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── StatsGrid ─────────────────────────────────────────────────
function StatsGrid({ stats }: { stats: { type: string; home: any; away: any }[] }) {
  const ordered = [
    ...PRIORITY_STATS.map((t) => stats.find((s) => s.type === t)).filter(
      Boolean,
    ) as typeof stats,
    ...stats.filter((s) => !PRIORITY_STATS.includes(s.type)),
  ];

  return (
    <div className="space-y-2">
      {ordered.map((s) => {
        const label = STAT_LABELS[s.type] ?? s.type;
        const rawH = String(s.home ?? "0").replace("%", "");
        const rawA = String(s.away ?? "0").replace("%", "");
        const h = parseFloat(rawH) || 0;
        const a = parseFloat(rawA) || 0;
        const isPct = String(s.home ?? "").includes("%");
        const hPct = isPct ? h : (h / (h + a || 1)) * 100;
        return (
          <div key={s.type} className="rounded-lg border border-border/40 bg-card/40 px-3 py-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="w-10 font-mono font-semibold text-neon">{s.home ?? "—"}</span>
              <span className="text-center uppercase tracking-widest text-muted-foreground">
                {label}
              </span>
              <span className="w-10 text-right font-mono font-semibold text-magenta">
                {s.away ?? "—"}
              </span>
            </div>
            <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-background/60">
              <div className="bg-neon transition-all duration-500" style={{ width: `${hPct}%` }} />
              <div
                className="bg-magenta transition-all duration-500"
                style={{ width: `${100 - hPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MotmCard ──────────────────────────────────────────────────
function MotmCard({ motm }: { motm: any }) {
  if (!motm) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-xs text-muted-foreground">
        Melhor jogador será revelado após o início da partida.
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-xl border border-neon/30 bg-gradient-to-br from-neon/10 to-transparent p-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-neon">★ Melhor da partida</div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-neon/60 bg-card">
          <img
            src={motm.photo}
            alt={motm.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-semibold">{motm.name}</div>
          <div className="mt-0.5 font-mono text-2xl font-bold text-neon">
            {motm.rating?.toFixed(1) ?? "—"}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider">
        <Pill label="Gols" value={motm.goals} />
        <Pill label="Assists" value={motm.assists} />
        <Pill label="Chutes no gol" value={motm.shotsOnGoal} />
        <Pill label="Amarelos" value={motm.yellowCards} />
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ── CardsPanel ────────────────────────────────────────────────
function CardsPanel({
  events,
  homeName,
  awayName,
  homeBadge,
  awayBadge,
}: {
  events: { minute: number; team: "home" | "away"; type: string; detail: string; player: string | null }[];
  homeName: string;
  awayName: string;
  homeBadge?: string | null;
  awayBadge?: string | null;
}) {
  const yellow = events.filter((e) => e.detail.toLowerCase().includes("yellow"));
  const red = events.filter(
    (e) => e.detail.toLowerCase().includes("red") || e.detail.toLowerCase().includes("second yellow"),
  );

  const homeYellow = yellow.filter((e) => e.team === "home").length;
  const awayYellow = yellow.filter((e) => e.team === "away").length;
  const homeRed = red.filter((e) => e.team === "home").length;
  const awayRed = red.filter((e) => e.team === "away").length;

  return (
    <div className="space-y-6">
      {/* summary */}
      <div className="grid grid-cols-2 gap-4">
        <TeamCardSummary
          name={homeName}
          badge={homeBadge}
          yellow={homeYellow}
          red={homeRed}
          side="home"
        />
        <TeamCardSummary
          name={awayName}
          badge={awayBadge}
          yellow={awayYellow}
          red={awayRed}
          side="away"
        />
      </div>

      {/* detail list */}
      {events.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">Nenhum cartão registrado.</p>
      )}

      {events.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="text-neon">▸</span> Detalhes
          </div>
          {events.map((e, i) => {
            const isYellow =
              e.detail.toLowerCase().includes("yellow") &&
              !e.detail.toLowerCase().includes("second");
            const isRed =
              e.detail.toLowerCase().includes("red") ||
              e.detail.toLowerCase().includes("second yellow");
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                  e.team === "home"
                    ? "border-neon/20 bg-neon/5"
                    : "border-magenta/20 bg-magenta/5"
                }`}
              >
                <span className="font-mono text-xs text-muted-foreground w-8">{e.minute}'</span>
                <span className="text-base">{isYellow ? "🟨" : isRed ? "🟥" : "🃏"}</span>
                <span className="flex-1 font-medium">{e.player ?? "—"}</span>
                <span
                  className={`text-[10px] uppercase tracking-widest ${
                    e.team === "home" ? "text-neon" : "text-magenta"
                  }`}
                >
                  {e.team === "home" ? homeName : awayName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamCardSummary({
  name,
  badge,
  yellow,
  red,
  side,
}: {
  name: string;
  badge?: string | null;
  yellow: number;
  red: number;
  side: "home" | "away";
}) {
  return (
    <div
      className={`rounded-xl border bg-card/40 p-4 ${
        side === "home" ? "border-neon/30" : "border-magenta/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {badge && <img src={badge} alt={name} className="h-6 w-6 object-contain" />}
        <span
          className={`text-xs font-semibold truncate ${
            side === "home" ? "text-neon" : "text-magenta"
          }`}
        >
          {name}
        </span>
      </div>
      <div className="flex gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono">{yellow}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
            🟨 Amarelos
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-red-400">{red}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
            🟥 Vermelhos
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ScorersPanel ──────────────────────────────────────────────
function ScorersPanel({
  scorers,
  homeName,
  awayName,
  homeBadge,
  awayBadge,
  homeScore,
  awayScore,
}: {
  scorers: { name: string; team: "home" | "away"; goals: number; minutes: number[] }[];
  homeName: string;
  awayName: string;
  homeBadge?: string | null;
  awayBadge?: string | null;
  homeScore: string | null;
  awayScore: string | null;
}) {
  if (scorers.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-muted-foreground">
        {homeScore === null
          ? "A partida ainda não começou."
          : "Nenhum gol registrado até o momento."}
      </div>
    );
  }

  const homeScorers = scorers.filter((s) => s.team === "home");
  const awayScorers = scorers.filter((s) => s.team === "away");

  return (
    <div className="space-y-4">
      {/* scoreboard header */}
      <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 px-4 py-3">
        <TeamScoreHeader name={homeName} badge={homeBadge} score={homeScore} side="home" />
        <div className="text-2xl font-display font-bold text-muted-foreground">×</div>
        <TeamScoreHeader name={awayName} badge={awayBadge} score={awayScore} side="away" />
      </div>

      {/* scorers columns */}
      <div className="grid grid-cols-2 gap-3">
        <ScorerColumn scorers={homeScorers} side="home" />
        <ScorerColumn scorers={awayScorers} side="away" />
      </div>
    </div>
  );
}

function TeamScoreHeader({
  name,
  badge,
  score,
  side,
}: {
  name: string;
  badge?: string | null;
  score: string | null;
  side: "home" | "away";
}) {
  return (
    <div className={`flex items-center gap-2 ${side === "away" ? "flex-row-reverse" : ""}`}>
      {badge && <img src={badge} alt={name} className="h-8 w-8 object-contain" />}
      <div className={side === "away" ? "text-right" : ""}>
        <div className="text-xs text-muted-foreground truncate max-w-[80px]">{name}</div>
        <div
          className={`text-3xl font-bold font-mono ${
            side === "home" ? "text-neon" : "text-magenta"
          }`}
        >
          {score ?? "—"}
        </div>
      </div>
    </div>
  );
}

function ScorerColumn({
  scorers,
  side,
}: {
  scorers: { name: string; goals: number; minutes: number[] }[];
  side: "home" | "away";
}) {
  return (
    <div className="space-y-2">
      <div
        className={`text-[10px] uppercase tracking-[0.3em] ${
          side === "home" ? "text-neon" : "text-magenta"
        }`}
      >
        {side === "home" ? "Casa" : "Visitante"}
      </div>
      {scorers.length === 0 && (
        <div className="text-xs text-muted-foreground italic">Sem gols</div>
      )}
      {scorers.map((s, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
            side === "home"
              ? "border-neon/20 bg-neon/5"
              : "border-magenta/20 bg-magenta/5"
          }`}
        >
          <span className="text-base">⚽</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{s.name}</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {s.minutes.map((m) => `${m}'`).join(", ")}
            </div>
          </div>
          {s.goals > 1 && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                side === "home" ? "bg-neon/20 text-neon" : "bg-magenta/20 text-magenta"
              }`}
            >
              ×{s.goals}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── HeatmapPanel ──────────────────────────────────────────────
function HeatmapPanel({
  events,
  homeName,
  awayName,
}: {
  events: { minute: number; team: "home" | "away"; type: string; detail: string; player: string | null }[];
  homeName: string;
  awayName: string;
}) {
  // Build activity zones (5-min buckets → field thirds)
  // We map events to field zones: attack/mid/defense for each team
  const homeEvents = events.filter((e) => e.team === "home");
  const awayEvents = events.filter((e) => e.team === "away");

  // Zone weights: goals/shots → attack, fouls/cards → defense, rest → mid
  const zoneWeight = (e: typeof events[0]) => {
    if (e.type === "Goal" || e.type === "subst") return "attack";
    if (e.type === "Card" || e.detail.toLowerCase().includes("foul")) return "defense";
    return "mid";
  };

  const countZones = (evs: typeof events) => ({
    attack: evs.filter((e) => zoneWeight(e) === "attack").length,
    mid: evs.filter((e) => zoneWeight(e) === "mid").length,
    defense: evs.filter((e) => zoneWeight(e) === "defense").length,
    total: evs.length,
  });

  const homeZones = countZones(homeEvents);
  const awayZones = countZones(awayEvents);

  // Timeline buckets (every 15 min)
  const buckets = [0, 15, 30, 45, 60, 75, 90];
  const homeBuckets = buckets.map((b) =>
    homeEvents.filter((e) => e.minute >= b && e.minute < b + 15).length,
  );
  const awayBuckets = buckets.map((b) =>
    awayEvents.filter((e) => e.minute >= b && e.minute < b + 15).length,
  );
  const maxBucket = Math.max(...homeBuckets, ...awayBuckets, 1);

  return (
    <div className="space-y-6">
      {/* field heatmap */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="text-neon">▸</span> Zonas de Atividade · Campo
        </div>
        <div className="relative rounded-xl border border-border/40 bg-[radial-gradient(ellipse_at_center,oklch(0.18_0.05_160),oklch(0.08_0.02_180))] overflow-hidden">
          {/* field lines */}
          <svg
            viewBox="0 0 400 260"
            className="w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* field border */}
            <rect x="10" y="10" width="380" height="240" rx="4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            {/* center line */}
            <line x1="200" y1="10" x2="200" y2="250" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            {/* center circle */}
            <circle cx="200" cy="130" r="36" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
            <circle cx="200" cy="130" r="2" fill="rgba(255,255,255,0.2)" />
            {/* home penalty area */}
            <rect x="10" y="75" width="65" height="110" rx="2" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
            <rect x="10" y="100" width="28" height="60" rx="1" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            {/* away penalty area */}
            <rect x="325" y="75" width="65" height="110" rx="2" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
            <rect x="362" y="100" width="28" height="60" rx="1" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* zone thirds */}
            <line x1="133" y1="10" x2="133" y2="250" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="267" y1="10" x2="267" y2="250" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4" />

            {/* HOME heatmap zones (left side) */}
            <HeatZone x={10} y={10} w={123} h={240} intensity={homeZones.attack / Math.max(homeZones.total, 1)} color="neon" label={`Ataque\n${homeZones.attack}`} />
            <HeatZone x={133} y={10} w={134} h={240} intensity={homeZones.mid / Math.max(homeZones.total, 1)} color="neon" label={`Meio\n${homeZones.mid}`} />
            <HeatZone x={267} y={10} w={123} h={240} intensity={homeZones.defense / Math.max(homeZones.total, 1)} color="neon" label={`Def.\n${homeZones.defense}`} />

            {/* AWAY heatmap zones (right side — mirrored, layered below) */}
            <HeatZone x={267} y={10} w={123} h={240} intensity={awayZones.attack / Math.max(awayZones.total, 1)} color="magenta" label="" />
            <HeatZone x={133} y={10} w={134} h={240} intensity={awayZones.mid / Math.max(awayZones.total, 1)} color="magenta" label="" />
            <HeatZone x={10} y={10} w={123} h={240} intensity={awayZones.defense / Math.max(awayZones.total, 1)} color="magenta" label="" />

            {/* team labels */}
            <text x="70" y="268" textAnchor="middle" fontSize="9" fill="oklch(0.85 0.2 160)" fontFamily="monospace" letterSpacing="1">{homeName.slice(0, 10).toUpperCase()}</text>
            <text x="330" y="268" textAnchor="middle" fontSize="9" fill="oklch(0.75 0.25 330)" fontFamily="monospace" letterSpacing="1">{awayName.slice(0, 10).toUpperCase()}</text>
          </svg>
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm bg-neon/50" /> {homeName}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm bg-magenta/50" /> {awayName}
          </span>
        </div>
      </div>

      {/* activity timeline chart */}
      <div>
        <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="text-neon">▸</span> Intensidade por período (eventos)
        </div>
        <div className="flex items-end gap-1 h-20 rounded-xl border border-border/40 bg-card/30 px-4 py-3">
          {buckets.map((b, i) => (
            <div key={b} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative w-full flex gap-0.5 items-end" style={{ height: "52px" }}>
                <div
                  className="flex-1 rounded-t bg-neon/60 transition-all duration-500 min-h-[2px]"
                  style={{ height: `${(homeBuckets[i] / maxBucket) * 52}px` }}
                />
                <div
                  className="flex-1 rounded-t bg-magenta/60 transition-all duration-500 min-h-[2px]"
                  style={{ height: `${(awayBuckets[i] / maxBucket) * 52}px` }}
                />
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">{b}'</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// SVG heat zone helper
function HeatZone({
  x, y, w, h, intensity, color, label,
}: {
  x: number; y: number; w: number; h: number;
  intensity: number; color: "neon" | "magenta"; label: string;
}) {
  const fill =
    color === "neon"
      ? `rgba(0,255,180,${intensity * 0.35})`
      : `rgba(255,0,180,${intensity * 0.25})`;
  const lines = label.split("\n");
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} />
      {lines.map((line, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={y + h / 2 + (i - (lines.length - 1) / 2) * 14}
          textAnchor="middle"
          fontSize="10"
          fill={color === "neon" ? "oklch(0.85 0.2 160)" : "oklch(0.75 0.25 330)"}
          fontFamily="monospace"
          opacity={0.9}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// ── EventsTimeline ────────────────────────────────────────────
function EventsTimeline({
  events,
  homeName,
  awayName,
}: {
  events: { minute: number; team: "home" | "away"; type: string; detail: string; player: string | null }[];
  homeName: string;
  awayName: string;
}) {
  const icon = (type: string, detail: string) => {
    if (type === "Goal") return "⚽";
    if (type === "Card") {
      if (detail.toLowerCase().includes("second yellow") || detail.toLowerCase().includes("red"))
        return "🟥";
      return "🟨";
    }
    if (type === "subst") return "🔄";
    if (type === "Var") return "📺";
    return "•";
  };

  if (events.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-8">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  // group by half
  const firstHalf = events.filter((e) => e.minute <= 45);
  const secondHalf = events.filter((e) => e.minute > 45);

  const renderEvents = (evs: typeof events) =>
    evs.map((e, i) => (
      <div
        key={i}
        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
          e.team === "home"
            ? "border-neon/20 bg-neon/5"
            : "border-magenta/20 bg-magenta/5"
        }`}
      >
        <span className="w-8 font-mono text-xs text-muted-foreground">{e.minute}'</span>
        <span className="text-base">{icon(e.type, e.detail)}</span>
        <span className="flex-1 font-medium truncate">{e.player ?? e.detail}</span>
        <span
          className={`shrink-0 text-[10px] uppercase tracking-widest ${
            e.team === "home" ? "text-neon" : "text-magenta"
          }`}
        >
          {e.team === "home" ? homeName : awayName}
        </span>
      </div>
    ));

  return (
    <div className="space-y-4">
      {firstHalf.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="text-neon">▸</span> 1° Tempo
          </div>
          <div className="space-y-1.5">{renderEvents(firstHalf)}</div>
        </div>
      )}
      {secondHalf.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <span className="text-neon">▸</span> 2° Tempo
          </div>
          <div className="space-y-1.5">{renderEvents(secondHalf)}</div>
        </div>
      )}
    </div>
  );
}
