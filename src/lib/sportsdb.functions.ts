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
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const getMatches = createServerFn({ method: "GET" }).handler(async () => {
  // Today + yesterday + tomorrow (soccer) to ensure we always have matches.
  const today = new Date();
  const days = [-1, 0, 1].map((delta) => {
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
  // Deduplicate by id and sort by timestamp.
  const map = new Map<string, SDBEvent>();
  for (const e of all) map.set(e.idEvent, e);
  const events = Array.from(map.values()).sort((a, b) =>
    a.strTimestamp.localeCompare(b.strTimestamp),
  );
  return { events };
});

export const getLineup = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      homeTeamId: z.string(),
      awayTeamId: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const [home, away] = await Promise.all([
      fetchJson<{ player: SDBPlayer[] | null }>(
        `${BASE}/lookup_all_players.php?id=${data.homeTeamId}`,
      ).catch(() => ({ player: null })),
      fetchJson<{ player: SDBPlayer[] | null }>(
        `${BASE}/lookup_all_players.php?id=${data.awayTeamId}`,
      ).catch(() => ({ player: null })),
    ]);

    // Prefer players with photos; pick up to 11. Try to balance positions.
    const pick = (players: SDBPlayer[] | null): SDBPlayer[] => {
      if (!players) return [];
      const withPhoto = players.filter((p) => p.strCutout || p.strThumb);
      const pool = withPhoto.length >= 11 ? withPhoto : players;
      return pool.slice(0, 11);
    };

    return {
      home: pick(home.player),
      away: pick(away.player),
    };
  });
