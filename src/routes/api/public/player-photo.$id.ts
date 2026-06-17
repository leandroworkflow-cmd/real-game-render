import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/player-photo/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = (params as { id: string }).id.replace(/[^0-9]/g, "");
        if (!id) return new Response("Bad id", { status: 400 });

        const upstream = await fetch(
          `https://media.api-sports.io/football/players/${id}.png`,
        );
        if (!upstream.ok) {
          return new Response("Not found", { status: 404 });
        }

        const buf = await upstream.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "content-type": upstream.headers.get("content-type") ?? "image/png",
            "cache-control": "public, max-age=86400, immutable",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
