import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
function triageExplainDevApi(): Plugin {
  return {
    name: "dev-api-triage-explain",
    configureServer(server) {
      server.middlewares.use("/api/triage-explain", async (req, res, next) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Allow", "POST");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const { generateTriageExplanation } = await import("./src/server/triageExplain");
          if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Server not configured: Azure OpenAI environment variables missing" }));
            return;
          }

          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            req.on("end", () => resolve());
            req.on("error", (e) => reject(e));
          });
          const raw = Buffer.concat(chunks).toString("utf8");
          const body = raw ? JSON.parse(raw) : {};
          const explanation = await generateTriageExplanation(body, process.env.AZURE_OPENAI_API_KEY ?? "");

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ explanation }));
        } catch (e) {
          const status = typeof (e as { status?: unknown }).status === "number" ? (e as any).status : 500;
          const msg = e instanceof Error ? e.message : String(e);
          const detail = typeof (e as { detail?: unknown }).detail === "string" ? (e as any).detail : msg;
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: status >= 500 ? "Server error" : "Request failed", detail }));
        }
      });
    },
  };
}

function chatbotDevApi(): Plugin {
  return {
    name: "dev-api-chatbot",
    configureServer(server) {
      server.middlewares.use("/api/chatbot", async (req, res, next) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Allow", "POST");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const { getChatbotReply } = await import("./src/server/chatbot");
          if (!process.env.OPENAI_API_KEY) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Server not configured: OPENAI_API_KEY missing" }));
            return;
          }

          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            req.on("end", () => resolve());
            req.on("error", (e) => reject(e));
          });
          const raw = Buffer.concat(chunks).toString("utf8");
          const body = raw ? JSON.parse(raw) : {};
          const reply = await getChatbotReply(body);

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(reply));
        } catch (e) {
          const status = typeof (e as { status?: unknown }).status === "number" ? (e as any).status : 500;
          const msg = e instanceof Error ? e.message : String(e);
          const detail = typeof (e as { detail?: unknown }).detail === "string" ? (e as any).detail : msg;
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: status >= 500 ? "Server error" : "Request failed", detail }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env = { ...process.env, ...env };

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), triageExplainDevApi(), chatbotDevApi()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
