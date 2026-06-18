import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre o NEFRA — Análise Esportiva 3D em Tempo Real" },
      {
        name: "description",
        content:
          "Conheça o NEFRA.SPORTS: plataforma futurista de análise esportiva com visualização 3D de escalações, estatísticas ao vivo e mapas de calor.",
      },
      { property: "og:title", content: "Sobre o NEFRA — Análise Esportiva 3D" },
      {
        property: "og:description",
        content:
          "Plataforma de visualização 3D de partidas com dados ao vivo de TheSportsDB e API-Football.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://real-game-render.lovable.app/sobre" },
    ],
    links: [{ rel: "canonical", href: "https://real-game-render.lovable.app/sobre" }],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <PageShell kicker="Sobre" title="O futuro da análise esportiva está em 3D.">
      <p>
        O <strong className="text-neon">NEFRA.SPORTS</strong> é um painel
        futurista que transforma dados brutos de partidas em uma experiência
        visual imersiva. Em vez de listas e tabelas, mostramos o jogo como ele
        realmente acontece — em um campo tridimensional interativo, com
        escalações reais, fotos dos atletas e estatísticas em tempo real.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        Nossa missão
      </h2>
      <p>
        Democratizar a análise tática profissional. O que antes ficava restrito
        a comissões técnicas, agora está a um clique de qualquer torcedor,
        jornalista esportivo ou apostador estratégico.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        O que oferecemos
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Visualização 3D de escalações com formação tática real.</li>
        <li>Posse de bola, chutes a gol, cartões e passes certos.</li>
        <li>Mapa de calor por time e timeline de eventos minuto a minuto.</li>
        <li>Cobertura de partidas ao vivo, encerradas e futuras.</li>
        <li>Atualização automática a cada 15 segundos.</li>
      </ul>
    </PageShell>
  );
}
