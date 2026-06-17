import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";

export type SDBEvent = {
  idEvent: string;
  idHomeTeam: string;
  idAwayTeam: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strLeague: string;
  strLeagueBadge: string | null;
  strGroup: string | null;
  strStatus: string | null;
  strVenue: string | null;
  strCountry: string | null;
  strTimestamp: string;
  dateEvent: string;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapEvent(r: any): SDBEvent {
  return {
    idEvent: String(r.idEvent),
    idHomeTeam: String(r.idHomeTeam ?? ""),
    idAwayTeam: String(r.idAwayTeam ?? ""),
    strEvent: r.strEvent ?? "",
    strHomeTeam: r.strHomeTeam ?? "",
    strAwayTeam: r.strAwayTeam ?? "",
    strHomeTeamBadge: r.strHomeTeamBadge ?? null,
    strAwayTeamBadge: r.strAwayTeamBadge ?? null,
    intHomeScore: r.intHomeScore !== null && r.intHomeScore !== undefined && r.intHomeScore !== "" ? String(r.intHomeScore) : null,
    intAwayScore: r.intAwayScore !== null && r.intAwayScore !== undefined && r.intAwayScore !== "" ? String(r.intAwayScore) : null,
    strLeague: r.strLeague ?? "",
    strLeagueBadge: r.strLeagueBadge ?? null,
    strGroup: r.strGroup ?? null,
    strStatus: r.strStatus ?? null,
    strVenue: r.strVenue ?? null,
    strCountry: r.strCountry ?? null,
    strTimestamp: r.strTimestamp ?? `${r.dateEvent ?? todayISO()}T${r.strTime ?? "00:00:00"}+00:00`,
    dateEvent: r.dateEvent ?? todayISO(),
  };
}

export const getMatches = createServerFn({ method: "GET" }).handler(async () => {
  const date = todayISO();
  const res = await fetch(`${SDB_BASE}/eventsday.php?d=${date}&s=Soccer`);
  if (!res.ok) return { events: [] as SDBEvent[] };
  const json = (await res.json()) as { events: any[] | null };
  const events = (json.events ?? []).map(mapEvent);
  return { events };
});

export type SDBPlayer = {
  idPlayer: string;
  strPlayer: string;
  strNumber: string | null;
  strPosition: string | null;
  strCutout: string | null;
  strThumb: string | null;
};

async function fetchTeamPlayers(teamId: string): Promise<SDBPlayer[]> {
  if (!teamId) return [];
  const res = await fetch(`${SDB_BASE}/lookup_all_players.php?id=${teamId}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { player: any[] | null };
  return (json.player ?? []).slice(0, 11).map((p) => ({
    idPlayer: String(p.idPlayer),
    strPlayer: p.strPlayer ?? "",
    strNumber: p.strNumber ?? null,
    strPosition: p.strPosition ?? null,
    strCutout: p.strCutout ?? null,
    strThumb: p.strThumb ?? null,
  }));
}

export const getLineup = createServerFn({ method: "GET" })
  .inputValidator(z.object({ homeTeamId: z.string(), awayTeamId: z.string() }).parse)
  .handler(async ({ data }) => {
    const [home, away] = await Promise.all([
      fetchTeamPlayers(data.homeTeamId),
      fetchTeamPlayers(data.awayTeamId),
    ]);
    return { home, away };
  });
