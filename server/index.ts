import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "grafica-secret-fallback",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { seedDatabase } = await import("./seed");
  try {
    await seedDatabase();
  } catch (err) {
    console.error("[Seed] Erro ao popular banco:", err);
  }

  const { seedAdmin } = await import("./seed-admin");
  try {
    await seedAdmin();
  } catch (err) {
    console.error("[Auth] Erro ao criar admin:", err);
  }

  // ── Correção pontual de dados: SGI LTDA ────────────────────────────────────
  // Corrige o número WhatsApp (faltava o 9 do celular) e o nome do template
  try {
    const { db } = await import("./db");
    const { suppliers } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [sgi] = await db
      .select({ id: suppliers.id, whatsapp: suppliers.whatsapp, template: suppliers.templateCotacaoNome })
      .from(suppliers)
      .where(eq(suppliers.id, "555af950-94cf-4483-a916-1a602a14e03d"))
      .limit(1);
    if (sgi) {
      const updates: Record<string, string | null> = {};
      if (sgi.whatsapp === "555186280534" || sgi.whatsapp === "5551986280534") updates["whatsapp"] = "555186280534";
      if (sgi.template === "lucy_cotacao_fornecedor" || !sgi.template) updates["templateCotacaoNome"] = "grafica_cotacao";
      if (Object.keys(updates).length > 0) {
        await db.update(suppliers).set(updates as any).where(eq(suppliers.id, "555af950-94cf-4483-a916-1a602a14e03d"));
        console.log("[Fix] SGI LTDA atualizado:", updates);
      }
    }
  } catch (err) {
    console.error("[Fix] Erro ao corrigir dados da SGI:", err);
  }
  // ──────────────────────────────────────────────────────────────────────────

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      subscribeWabaWebhook();
    },
  );
})();

async function subscribeWabaWebhook() {
  const token = process.env.META_WHATSAPP_TOKEN;
  const wabaId = process.env.META_WABA_ID;
  if (!token || !wabaId) return;
  try {
    const resp = await fetch(`https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json() as any;
    if (data.success) {
      console.log("[WhatsApp] Assinatura WABA renovada com sucesso.");
    } else {
      console.warn("[WhatsApp] Falha ao renovar assinatura WABA:", data);
    }
  } catch (err) {
    console.warn("[WhatsApp] Erro ao renovar assinatura WABA:", err);
  }
}
