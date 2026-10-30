import { createFileRoute } from "@tanstack/react-router";
import { requestSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => new Response(
        [
          "User-agent: *",
          "Allow: /",
          `Sitemap: ${requestSiteUrl(request.url)}/sitemap.xml`,
          "",
        ].join("\n"),
        { headers: { "Content-Type": "text/plain; charset=utf-8" } },
      ),
    },
  },
  component: () => null,
});
