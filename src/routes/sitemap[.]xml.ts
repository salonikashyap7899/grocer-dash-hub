import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap[.]xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", priority: "1.0", changefreq: "daily" },
          { path: "/auth", priority: "0.3" },
          { path: "/cart", priority: "0.5" },
          { path: "/c/fruits-vegetables", priority: "0.9" },
          { path: "/c/dairy-breakfast", priority: "0.9" },
          { path: "/c/bakery", priority: "0.9" },
          { path: "/c/snacks-beverages", priority: "0.9" },
          { path: "/c/household", priority: "0.9" },
          { path: "/c/personal-care", priority: "0.9" },
          { path: "/c/grocery-essentials", priority: "0.9" },
        ];
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) => `  <url><loc>${BASE_URL}${e.path}</loc><priority>${e.priority}</priority>${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}</url>`),
          `</urlset>`,
        ].join("\n");
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
