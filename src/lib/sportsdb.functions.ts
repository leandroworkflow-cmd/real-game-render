import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://www.thesportsdb.com/api/v1/json/3";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TheSportsDB ${res.status}`);
  return (await res.json()) as T;
}

export type SDBEvent = {
  idEvent: string;
  strEvent: string;
  strLeague: string;
  strLeagueBadge?: string | null;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  dateEvent: string;
  strTime: string;
  strStatus: string | null;
  strVenue?: string | null;
  strCountry?: string | null;
  strThumb?: string | null;
  strTimestamp: string;
  strGroup?: string | null;
};

export type SDBPlayer = {
  idPlayer: string;
  strPlayer: string;
  strPosition?: string | null;
  strThumb?: string | null;
  strCutout?: string | null;
  strNumber?: string | null;
  strNationality?: string | null;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Busca todos os jogos: 2 dias atrás + hoje + 5 dias à frente
export const getMatches = createServerFn({ method: "GET" }).handler(async () => {
  const today = new Date();
  const todayStr = isoDate(today);

  // -2 dias até +5 dias
  const deltas = [-2, -1, 0, 1, 2, 3, 4, 5];
  const days = deltas.map((delta) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + delta);
    return isoDate(d);
  });

  const results = await Promise.all(
    days.map((d) =>
      fetchJson<{ events: SDBEvent[] | null }>(
        `${BASE}/eventsday.php?d=${d}&s=Soccer`,
      ).catch(() => ({ events: null })),
    ),
  );

  const all = results.flatMap((r) => r.events ?? []);

  // Deduplicate
  const map = new Map<string, SDBEvent>();
  for (const e of all) map.set(e.idEvent, e);
  const allEvents = Array.from(map.values()).sort((a, b) =>
    a.strTimestamp.localeCompare(b.strTimestamp),
  );

  // Separar por categoria
  const todayEvents = allEvents.filter((e) => e.dateEvent === todayStr);
  const pastEvents = allEvents.filter((e) => e.dateEvent < todayStr);
  const upcomingEvents = allEvents.filter((e) => e.dateEvent > todayStr);

  // Jogos de hoje: se vazio, usa os mais próximos disponíveis
  const events = todayEvents.length > 0 ? todayEvents : allEvents;

  return { events, todayEvents, pastEvents, upcomingEvents, todayStr };
});

const POS_ORDER: Record<string, number> = {
  Goalkeeper: 0, Defender: 1, Midfielder: 2, Forward: 3, Attacker: 3,
};

function posRank(pos?: string | null): number {
  if (!pos) return 99;
  for (const [key, rank] of Object.entries(POS_ORDER)) {
    if (pos.toLowerCase().includes(key.toLowerCase())) return rank;
  }
  return 5;
}

function pick11(players: SDBPlayer[] | null): SDBPlayer[] {
  if (!players || players.length === 0) return [];
  const sorted = [...players].sort((a, b) => {
    const pa = posRank(a.strPosition);
    const pb = posRank(b.strPosition);
    if (pa !== pb) return pa - pb;
    const aHasPhoto = !!(a.strCutout || a.strThumb);
    const bHasPhoto = !!(b.strCutout || b.strThumb);
    if (aHasPhoto !== bHasPhoto) return aHasPhoto ? -1 : 1;
    return 0;
  });
  const gk = sorted.filter((p) => posRank(p.strPosition) === 0).slice(0, 1);
  const def = sorted.filter((p) => posRank(p.strPosition) === 1).slice(0, 4);
  const mid = sorted.filter((p) => posRank(p.strPosition) === 2).slice(0, 3);
  const fwd = sorted.filter((p) => posRank(p.strPosition) === 3).slice(0, 3);
  const lineup = [...gk, ...def, ...mid, ...fwd];
  if (lineup.length < 11) {
    const used = new Set(lineup.map((p) => p.idPlayer));
    const rest = sorted.filter((p) => !used.has(p.idPlayer));
    lineup.push(...rest.slice(0, 11 - lineup.length));
  }
  return lineup.slice(0, 11);
}

export const getLineup = createServerFn({ method: "GET" })
  .inputValidator(z.object({ homeTeamId: z.string(), awayTeamId: z.string() }))
  .handler(async ({ data }) => {
    const [homeRes, awayRes] = await Promise.all([
      fetchJson<{ player: SDBPlayer[] | null }>(
        `${BASE}/lookup_all_players.php?id=${data.homeTeamId}`,
      ).catch(() => ({ player: null })),
      fetchJson<{ player: SDBPlayer[] | null }>(
        `${BASE}/lookup_all_players.php?id=${data.awayTeamId}`,
      ).catch(() => ({ player: null })),
    ]);
    return { home: pick11(homeRes.player), away: pick11(awayRes.player) };
  });
