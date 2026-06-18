import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como Funciona — Visualização 3D de Partidas | NEFRA" },
      {
        name: "description",
        content:
          "Entenda como o NEFRA combina TheSportsDB e API-Football para entregar escalações 3D, estatísticas, cartões e mapa de calor ao vivo.",
      },
      { property: "og:title", content: "Como Funciona — NEFRA.SPORTS" },
      {
        property: "og:description",
        content:
          "Dados de TheSportsDB + API-Football renderizados em campo 3D com Three.js e atualizados em tempo real.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://real-game-render.lovable.app/como-funciona" },
    ],
    links: [
      { rel: "canonical", href: "https://real-game-render.lovable.app/como-funciona" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "De onde vêm os dados?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Combinamos TheSportsDB (jogos, placares, escudos) com API-Football (escalações detalhadas, estatísticas, cartões, gols e mapa de calor).",
              },
            },
            {
              "@type": "Question",
              name: "Os dados são em tempo real?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sim. O painel atualiza automaticamente a cada 15 segundos durante partidas ao vivo.",
              },
            },
            {
              "@type": "Question",
              name: "Posso usar no celular?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sim. A plataforma é totalmente responsiva e funciona em smartphones, tablets e desktops.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageShell kicker="Tecnologia" title="Como o NEFRA entrega análise em 3D.">
      <h2 className="font-display text-xl font-semibold text-foreground">
        1. Coleta de dados
      </h2>
      <p>
        Consultamos duas APIs esportivas líderes:
        <strong className="text-neon"> TheSportsDB</strong> para a agenda de
        partidas, placares ao vivo e identidade visual dos clubes, e
        <strong className="text-neon"> API-Football</strong> para escalações,
        estatísticas avançadas, cartões, gols e eventos minuto a minuto.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        2. Renderização 3D
      </h2>
      <p>
        Cada jogador é posicionado em um campo tridimensional renderizado com
        Three.js. Quando disponível, exibimos a foto real do atleta como
        textura sobre o avatar; caso contrário, usamos um badge com o número
        da camisa.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        3. Atualização em tempo real
      </h2>
      <p>
        Durante partidas ao vivo, o painel revalida os dados a cada 15
        segundos. Você vê placares, cartões e gols praticamente no mesmo
        instante em que acontecem no campo.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        4. Análise tática
      </h2>
      <p>
        Além das estatísticas tradicionais, o NEFRA gera um mapa de calor por
        time, lista o artilheiro da partida e organiza todos os eventos em
        uma timeline visual.
      </p>
    </PageShell>
  );
}
