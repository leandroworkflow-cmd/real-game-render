import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | NEFRA.SPORTS" },
      {
        name: "description",
        content:
          "Política de privacidade do NEFRA.SPORTS: quais dados coletamos, como são utilizados e seus direitos como usuário.",
      },
      { property: "og:title", content: "Política de Privacidade | NEFRA.SPORTS" },
      {
        property: "og:description",
        content: "Transparência sobre dados, cookies e direitos do usuário.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://real-game-render.lovable.app/privacidade" },
    ],
    links: [
      { rel: "canonical", href: "https://real-game-render.lovable.app/privacidade" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageShell kicker="Legal" title="Política de Privacidade">
      <p>
        Última atualização: {new Date().toLocaleDateString("pt-BR")}.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        Dados que coletamos
      </h2>
      <p>
        O NEFRA.SPORTS é uma plataforma pública de visualização esportiva. Não
        exigimos cadastro nem coletamos dados pessoais identificáveis. Logs
        básicos de acesso (endereço IP, user-agent) podem ser registrados por
        nossa infraestrutura para fins de segurança e desempenho.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        Cookies
      </h2>
      <p>
        Utilizamos apenas cookies técnicos essenciais ao funcionamento do
        site. Não usamos cookies de rastreamento ou publicidade de terceiros.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        Dados de terceiros
      </h2>
      <p>
        As informações de partidas são fornecidas por TheSportsDB e
        API-Football. Não temos controle sobre a precisão ou disponibilidade
        desses dados.
      </p>
      <h2 className="font-display text-xl font-semibold text-foreground">
        Contato
      </h2>
      <p>
        Dúvidas sobre privacidade? Entre em contato pelo e-mail
        suporte@nefra.sports.
      </p>
    </PageShell>
  );
}
