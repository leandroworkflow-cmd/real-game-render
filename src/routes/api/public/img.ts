import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = new Set([
  "r2.thesportsdb.com",
  "www.thesportsdb.com",
  "thesportsdb.com",
  "media.api-sports.io",
  "media-4.api-sports.io",
  "media-3.api-sports.io",
  "media-2.api-sports.io",
  "media-1.api-sports.io",
]);

export const Route = createFileRoute("/api/public/img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("u");
        if (!target) return new Response("missing u", { status: 400 });

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("bad url", { status: 400 });
        }
        if (!ALLOWED_HOSTS.has(parsed.hostname)) {
          return new Response("host not allowed", { status: 403 });
        }

        const upstream = await fetch(parsed.toString());
        if (!upstream.ok) {
          return new Response("upstream " + upstream.status, {
            status: upstream.status,
            headers: { "access-control-allow-origin": "*" },
          });
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
