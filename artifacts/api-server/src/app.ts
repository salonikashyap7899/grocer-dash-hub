import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve the built React frontend in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "public");

if (existsSync(publicDir)) {
  // Serve static assets (JS, CSS, images) but NOT index.html via express.static
  // so we can inject runtime config into index.html ourselves
  app.use(express.static(publicDir, { index: false }));

  // Build the runtime config injection script from server-side env vars.
  // This lets us avoid VITE_ build-time vars — the browser reads window.__ENV instead.
  function buildConfigScript(): string {
    const supabaseUrl =
      process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
    const supabaseKey =
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
      process.env["SUPABASE_PUBLISHABLE_KEY"] ??
      process.env["SUPABASE_ANON_KEY"] ??
      "";

    if (!supabaseUrl || !supabaseKey) {
      logger.warn(
        "SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY env vars are not set — frontend Supabase calls will fail",
      );
    }

    return `<script>window.__ENV = ${JSON.stringify({ SUPABASE_URL: supabaseUrl, SUPABASE_PUBLISHABLE_KEY: supabaseKey })};</script>`;
  }

  const indexPath = path.join(publicDir, "index.html");

  // SPA catch-all: inject runtime config and serve index.html
  app.get("/{*path}", (_req, res) => {
    try {
      const html = readFileSync(indexPath, "utf8");
      const injected = html.replace("</head>", `${buildConfigScript()}</head>`);
      res.setHeader("Content-Type", "text/html");
      res.send(injected);
    } catch {
      res.status(500).send("Internal server error: could not read index.html");
    }
  });
} else {
  logger.warn(
    { publicDir },
    "Frontend build not found — run `pnpm run build` to generate it",
  );
}

export default app;
