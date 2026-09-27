import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

// Without these the bundle builds fine and the deployed site is a blank page:
// a production build must fail instead.
function requireEnv(env: Record<string, string>): Plugin {
  return {
    name: "korev-require-env",
    apply: "build",
    configResolved() {
      const missing = REQUIRED_ENV.filter((key) => !env[key]?.trim() || env[key].includes("<"));
      if (missing.length > 0) {
        throw new Error(`Variables d'environnement manquantes pour le build : ${missing.join(", ")} (voir .env.example)`);
      }
      for (const key of ["VITE_SITE_URL", "VITE_SENTRY_DSN"]) {
        if (!env[key]?.trim()) console.warn(`\u26a0 ${key} absent : ${key === "VITE_SITE_URL" ? "cartes de partage en chemins relatifs" : "aucune erreur de production remontée"}.`);
      }
    },
  };
}

// Social previews need absolute URLs: VITE_SITE_URL (e.g. https://korev.app)
// is injected into index.html; without it the tags fall back to relative paths.
function siteUrlInHtml(env: Record<string, string>): Plugin {
  const siteUrl = (env.VITE_SITE_URL ?? "").trim().replace(/\/+$/, "");
  return {
    name: "korev-site-url",
    transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", siteUrl),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    server: { host: "127.0.0.1", port: 8080 },
    plugins: [react(), requireEnv(env), siteUrlInHtml(env)],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    build: {
      rollupOptions: {
        output: {
          // Libraries change less often than the app: separate files stay cached across deploys.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            query: ["@tanstack/react-query"],
          },
        },
      },
    },
  };
});
