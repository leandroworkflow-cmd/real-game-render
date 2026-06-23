import { useQuery } from "@tanstack/react-query";
import type { SDBEvent } from "@/lib/sportsdb.functions";
import { getLineup } from "@/lib/sportsdb.functions";
import { getApiFootballDay, getApiFootballLineup } from "@/lib/apifootball.functions";

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

function statusToSchema(e: SDBEvent): string {
  const s = (e.strStatus || "").toLowerCase();
  if (s.includes("postponed")) return "https://schema.org/EventPostponed";
  if (s.includes("cancel")) return "https://schema.org/EventCancelled";
  if (e.intHomeScore !== null && e.intAwayScore !== null) return "https://schema.org/EventScheduled";
  return "https://schema.org/EventScheduled";
}

/**
 * Renders SportsEvent JSON-LD for the currently featured/selected match,
 * including SportsTeam competitors with their starting XI (Person entries
 * with jersey number and position). Pulls lineup data from already-cached
 * queries, so no extra network requests.
 */
export function SportsEventJsonLd({ event }: { event: SDBEvent }) {
  const date = event.dateEvent || event.strTimestamp.slice(0, 10);

  const { data: day } = useQuery({
    queryKey: ["af-day", date],
    queryFn: () => getApiFootballDay({ data: { date } }),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const fixture = day?.fixtures.find(
    (f) => teamMatch(f.homeName, event.strHomeTeam) && teamMatch(f.awayName, event.strAwayTeam),
  ) ?? null;

  const { data: afLineup } = useQuery({
    queryKey: ["af-lineup", fixture?.id],
    queryFn: () => getApiFootballLineup({ data: { fixtureId: fixture!.id } }),
    enabled: !!fixture,
    staleTime: 5 * 60_000,
  });

  const { data: sdbData } = useQuery({
    queryKey: ["lineup", event.idHomeTeam, event.idAwayTeam],
    queryFn: () => getLineup({ data: { homeTeamId: event.idHomeTeam, awayTeamId: event.idAwayTeam } }),
    staleTime: 5 * 60_000,
    enabled: !afLineup?.home,
  });

  const homeAthletes =
    afLineup?.home?.startXI.map((p) => ({
      "@type": "Person",
      name: p.name,
      ...(p.number !== null ? { jerseyNumber: String(p.number) } : {}),
      ...(p.pos ? { jobTitle: p.pos } : {}),
    })) ??
    sdbData?.home.slice(0, 11).map((p) => ({
      "@type": "Person",
      name: p.strPlayer,
      ...(p.strNumber ? { jerseyNumber: p.strNumber } : {}),
      ...(p.strPosition ? { jobTitle: p.strPosition } : {}),
    })) ??
    [];

  const awayAthletes =
    afLineup?.away?.startXI.map((p) => ({
      "@type": "Person",
      name: p.name,
      ...(p.number !== null ? { jerseyNumber: String(p.number) } : {}),
      ...(p.pos ? { jobTitle: p.pos } : {}),
    })) ??
    sdbData?.away.slice(0, 11).map((p) => ({
      "@type": "Person",
      name: p.strPlayer,
      ...(p.strNumber ? { jerseyNumber: p.strNumber } : {}),
      ...(p.strPosition ? { jobTitle: p.strPosition } : {}),
    })) ??
    [];

  const homeTeam: Record<string, unknown> = {
    "@type": "SportsTeam",
    name: event.strHomeTeam,
    ...(event.strHomeTeamBadge ? { logo: event.strHomeTeamBadge } : {}),
    ...(homeAthletes.length ? { athlete: homeAthletes } : {}),
  };
  const awayTeam: Record<string, unknown> = {
    "@type": "SportsTeam",
    name: event.strAwayTeam,
    ...(event.strAwayTeamBadge ? { logo: event.strAwayTeamBadge } : {}),
    ...(awayAthletes.length ? { athlete: awayAthletes } : {}),
  };

  const hasScore = event.intHomeScore !== null && event.intAwayScore !== null;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${event.strHomeTeam} vs ${event.strAwayTeam}`,
    sport: "Soccer",
    startDate: event.strTimestamp,
    eventStatus: statusToSchema(event),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    homeTeam,
    awayTeam,
    competitor: [homeTeam, awayTeam],
    ...(event.strLeague
      ? {
          superEvent: {
            "@type": "SportsEvent",
            name: event.strLeague,
          },
        }
      : {}),
    ...(event.strVenue
      ? {
          location: {
            "@type": "Place",
            name: event.strVenue,
            ...(event.strCountry
              ? { address: { "@type": "PostalAddress", addressCountry: event.strCountry } }
              : {}),
          },
        }
      : {}),
    ...(hasScore
      ? {
          description: `${event.strHomeTeam} ${event.intHomeScore} x ${event.intAwayScore} ${event.strAwayTeam}`,
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
