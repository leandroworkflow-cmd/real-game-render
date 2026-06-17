import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://v3.football.api-sports.io";

function headers() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY missing");
  return { "x-apisports-key": key } as Record<string, string>;
}

async function af<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  return (await res.json()) as T;
}

export type AFFixtureLite = {
  id: number;
  date: string;
  homeName: string;
  awayName: string;
  homeId: number;
  awayId: number;
};

// Returns ALL fixtures for a date (1 request — cache aggressively).
export const getApiFootballDay = createServerFn({ method: "GET" })
  .inputValidator(z.object({ date: z.string() }).parse)
  .handler(async ({ data }) => {
    const json = await af<{ response: any[] }>(`/fixtures?date=${data.date}`);
    const fixtures: AFFixtureLite[] = (json.response ?? []).map((r) => ({
      id: r.fixture.id,
      date: r.fixture.date,
      homeName: r.teams.home.name,
      awayName: r.teams.away.name,
      homeId: r.teams.home.id,
      awayId: r.teams.away.id,
    }));
    return { fixtures };
  });

export type AFLineupPlayer = {
  id: number;
  name: string;
  number: number | null;
  pos: string | null;
  grid: string | null;
  photo: string;
};

export type AFLineup = {
  teamId: number;
  teamName: string;
  teamLogo: string;
  formation: string | null;
  coach: { name: string; photo: string | null } | null;
  startXI: AFLineupPlayer[];
};

export type AFStat = { type: string; home: string | number | null; away: string | number | null };

export type AFEvent = {
  minute: number;
  team: "home" | "away";
  type: string;
  detail: string;
  player: string | null;
  assist: string | null;
};

export type AFPlayerRating = {
  id: number;
  name: string;
  photo: string;
  teamId: number;
  rating: number | null;
  goals: number;
  assists: number;
  shotsOnGoal: number;
  yellowCards: number;
  redCards: number;
};

export type AFLineupResult = { home: AFLineup | null; away: AFLineup | null };

export const getApiFootballLineup = createServerFn({ method: "GET" })
  .inputValidator(z.object({ fixtureId: z.number() }).parse)
  .handler(async ({ data }): Promise<AFLineupResult> => {
    const json = await af<{ response: any[] }>(`/fixtures/lineups?fixture=${data.fixtureId}`);
    const teams = json.response ?? [];
    if (teams.length < 2) return { home: null, away: null };
    const parse = (t: any): AFLineup => ({
      teamId: t.team.id,
      teamName: t.team.name,
      teamLogo: t.team.logo,
      formation: t.formation ?? null,
      coach: t.coach ? { name: t.coach.name, photo: t.coach.photo ?? null } : null,
      startXI: (t.startXI ?? []).map((p: any) => ({
        id: p.player.id,
        name: p.player.name,
        number: p.player.number ?? null,
        pos: p.player.pos ?? null,
        grid: p.player.grid ?? null,
        photo: `/api/public/player-photo/${p.player.id}`,
      })),
    });
    return { home: parse(teams[0]), away: parse(teams[1]) };
  });

export const getApiFootballDetails = createServerFn({ method: "GET" })
  .inputValidator(z.object({ fixtureId: z.number() }).parse)
  .handler(async ({ data }) => {
    const id = data.fixtureId;
    const [lineupsJson, statsJson, eventsJson, playersJson] = await Promise.all([
      af<{ response: any[] }>(`/fixtures/lineups?fixture=${id}`),
      af<{ response: any[] }>(`/fixtures/statistics?fixture=${id}`),
      af<{ response: any[] }>(`/fixtures/events?fixture=${id}`),
      af<{ response: any[] }>(`/fixtures/players?fixture=${id}`),
    ]);

    const lineups: AFLineup[] = (lineupsJson.response ?? []).map((l) => ({
      teamId: l.team.id,
      teamName: l.team.name,
      teamLogo: l.team.logo,
      formation: l.formation ?? null,
      coach: l.coach ? { name: l.coach.name, photo: l.coach.photo ?? null } : null,
      startXI: (l.startXI ?? []).map((p: any) => ({
        id: p.player.id,
        name: p.player.name,
        number: p.player.number ?? null,
        pos: p.player.pos ?? null,
        grid: p.player.grid ?? null,
        photo: `/api/public/player-photo/${p.player.id}`,
      })),
    }));

    // Statistics arrive as two team objects, each with a "statistics" array.
    const teamsStats = statsJson.response ?? [];
    const statTypes = new Set<string>();
    for (const t of teamsStats) for (const s of t.statistics ?? []) statTypes.add(s.type);
    const stats: AFStat[] = Array.from(statTypes).map((type) => {
      const home = teamsStats[0]?.statistics?.find((s: any) => s.type === type)?.value ?? null;
      const away = teamsStats[1]?.statistics?.find((s: any) => s.type === type)?.value ?? null;
      return { type, home, away };
    });

    const events: AFEvent[] = (eventsJson.response ?? []).map((e: any) => ({
      minute: e.time?.elapsed ?? 0,
      team: e.team?.id === teamsStats[0]?.team?.id ? "home" : "away",
      type: e.type,
      detail: e.detail,
      player: e.player?.name ?? null,
      assist: e.assist?.name ?? null,
    }));

    // Flatten player ratings; pick top by rating.
    const allRatings: AFPlayerRating[] = [];
    for (const teamBlock of playersJson.response ?? []) {
      const teamId = teamBlock.team?.id;
      for (const p of teamBlock.players ?? []) {
        const s = p.statistics?.[0] ?? {};
        const rating = s.games?.rating ? parseFloat(s.games.rating) : null;
        allRatings.push({
          id: p.player.id,
          name: p.player.name,
          photo: `/api/public/player-photo/${p.player.id}`,
          teamId,
          rating,
          goals: s.goals?.total ?? 0,
          assists: s.goals?.assists ?? 0,
          shotsOnGoal: s.shots?.on ?? 0,
          yellowCards: s.cards?.yellow ?? 0,
          redCards: s.cards?.red ?? 0,
        });
      }
    }
    const motm = [...allRatings]
      .filter((p) => p.rating !== null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null;

    return {
      lineups,
      stats,
      events,
      motm,
      homeTeamId: teamsStats[0]?.team?.id ?? null,
      awayTeamId: teamsStats[1]?.team?.id ?? null,
    };
  });
