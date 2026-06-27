import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  preset: "vercel-server",
  entry: "./src/server.ts",
});
