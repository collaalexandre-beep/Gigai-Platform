import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { lookupCnpj, validateCnpj } from "./cnpj";
import { z } from "zod";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import {
  insertClientSchema,
  insertContactSchema,
  insertSellerSchema,
  insertSellerBankAccountSchema,
  insertClientSellerLinkSchema,
  insertInteractionSchema,
  insertTaskSchema,
  insertTagSchema,
  insertPaymentTermSchema,
  insertRawMaterialSchema,
  insertProductSchema,
  insertProductComponentSchema,
  insertQuoteSchema,
  insertQuoteItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertAiProductGenerationSchema,
  insertPaymentMethodSchema,
  insertCompanySchema,
  type InsertQuote,
  type InsertOrder,
  insertQuoteRuleSchema,
  insertVehicleSchema,
  insertVehicleExitSchema,
  insertVehicleMaintenanceItemSchema,
  insertVehicleMaintenanceHistorySchema,
  insertVehicleIssueReportSchema,
} from "@shared/schema";
import { calcMaintenanceItemStatus } from "./storage";
import { generateProductSuggestion, suggestQuoteItem, generateSpecialQuote, adjustSpecialQuote, extractFromAdjustment } from "./ai";
import { handleVehicleWaFlow, isVehicleExitCommand, isVehicleReturnCommand, VEH_STEP_LABELS } from "./vehicle-wa";
import path from "path";
import fs from "fs";
import multer from "multer";
import express from "express";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "team-docs");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const teamDocUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

function handleError(res: Response, err: unknown) {
  console.error("[API Error]", err);
  const message =
    err instanceof Error ? err.message : "Erro interno do servidor";
  res.status(500).json({ error: message });
}

function nullifyEmpty(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj === "" ? null : obj;
  if (Array.isArray(obj)) return obj.map(nullifyEmpty);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, nullifyEmpty(v)])
    );
  }
  return obj;
}

function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(nullifyEmpty(body));
  if (!result.success) {
    return {
      error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
    };
  }
  return { data: result.data };
}

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  if (Array.isArray(val)) return val[0];
  return val;
}

function getQuery(req: Request, name: string): string | undefined {
  const val = req.query[name];
  if (Array.isArray(val)) return val[0] as string;
  return val as string | undefined;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── STATIC FILE SERVING (vehicle photos) ──────────────────────────────────
  const uploadsDir = path.join(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsDir));

  // ─── CNPJ LOOKUP ───────────────────────────────────────────────────────────

  app.get("/api/cnpj/:cnpj", async (req: Request, res: Response) => {
    try {
      const cnpj = getParam(req, "cnpj");
      const clean = cnpj.replace(/\D/g, "");

      if (!validateCnpj(clean)) {
        return res.status(400).json({ error: "CNPJ inválido" });
      }

      const result = await lookupCnpj(clean);

      await storage.logCnpjLookup({
        cnpj: clean,
        provider: result.provider,
        sucesso: result.success,
        rawResponse: result.rawResponse,
        errorMessage: result.error,
      });

      return res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  app.get("/api/dashboard", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── CLIENTS ───────────────────────────────────────────────────────────────

  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      const result = await storage.getClients({
        search: getQuery(req, "search"),
        status: getQuery(req, "status"),
        page: getQuery(req, "page") ? Number(getQuery(req, "page")) : 1,
        limit: getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 25,
        orderBy: getQuery(req, "orderBy"),
        orderDir: getQuery(req, "orderDir"),
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const client = await storage.getClient(getParam(req, "id"));
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
      res.json(client);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertClientSchema, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const client = await storage.createClient(validated.data as any);

      await storage.addTimelineEvent({
        clientId: client.id,
        eventType: "cadastro_criado",
        titulo: "Cliente cadastrado",
        descricao: `${client.razaoSocial} foi cadastrado no sistema`,
        metadata: { status: client.status },
      });

      if (client.cnpjConsultaBemSucedida) {
        await storage.addTimelineEvent({
          clientId: client.id,
          eventType: "cnpj_consultado",
          titulo: "CNPJ consultado automaticamente",
          descricao: `Dados preenchidos via ${client.cnpjFonteConsulta}`,
        });
      }

      res.status(201).json(client);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertClientSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const client = await storage.updateClient(getParam(req, "id"), validated.data as any);
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });

      if (validated.data.status) {
        await storage.addTimelineEvent({
          clientId: client.id,
          eventType: "status_alterado",
          titulo: "Status alterado",
          descricao: `Status alterado para: ${validated.data.status}`,
          metadata: { novoStatus: validated.data.status },
        });
      }

      res.json(client);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      await storage.softDeleteClient(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── CONTACTS ──────────────────────────────────────────────────────────────

  app.get("/api/clients/:clientId/contacts", async (req: Request, res: Response) => {
    try {
      const contacts = await storage.getContacts(getParam(req, "clientId"));
      res.json(contacts);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/clients/:clientId/contacts", async (req: Request, res: Response) => {
    try {
      const body = { ...req.body, clientId: getParam(req, "clientId") };
      const validated = validateBody(insertContactSchema, body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const contact = await storage.createContact(validated.data as any);

      await storage.addTimelineEvent({
        clientId: getParam(req, "clientId"),
        eventType: "contato_adicionado",
        titulo: "Contato adicionado",
        descricao: `${contact.nomeCompleto} foi adicionado como contato`,
        metadata: { cargo: contact.cargo },
      });

      res.status(201).json(contact);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/contacts/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertContactSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const contact = await storage.updateContact(getParam(req, "id"), validated.data as any);
      if (!contact) return res.status(404).json({ error: "Contato não encontrado" });

      if (contact.clientId) {
        await storage.addTimelineEvent({
          clientId: contact.clientId,
          eventType: "contato_editado",
          titulo: "Contato atualizado",
          descricao: `${contact.nomeCompleto} foi atualizado`,
        });
      }

      res.json(contact);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/contacts/:id", async (req: Request, res: Response) => {
    try {
      const contact = await storage.getContact(getParam(req, "id"));
      if (contact?.clientId) {
        await storage.addTimelineEvent({
          clientId: contact.clientId,
          eventType: "contato_removido",
          titulo: "Contato removido",
          descricao: `${contact.nomeCompleto} foi removido`,
        });
      }
      await storage.softDeleteContact(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── SELLERS ───────────────────────────────────────────────────────────────

  app.get("/api/sellers", async (req: Request, res: Response) => {
    try {
      const result = await storage.getSellers({
        search: getQuery(req, "search"),
        status: getQuery(req, "status"),
        funcao: getQuery(req, "funcao"),
        page: getQuery(req, "page") ? Number(getQuery(req, "page")) : 1,
        limit: getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 25,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/sellers/:id", async (req: Request, res: Response) => {
    try {
      const seller = await storage.getSeller(getParam(req, "id"));
      if (!seller) return res.status(404).json({ error: "Vendedor não encontrado" });
      const bankAccounts = await storage.getSellerBankAccounts(getParam(req, "id"));
      res.json({ ...seller, bankAccounts });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/sellers", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertSellerSchema, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const seller = await storage.createSeller(validated.data);
      res.status(201).json(seller);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/sellers/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertSellerSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const seller = await storage.updateSeller(getParam(req, "id"), validated.data);
      if (!seller) return res.status(404).json({ error: "Vendedor não encontrado" });
      res.json(seller);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/sellers/:id", async (req: Request, res: Response) => {
    try {
      await storage.softDeleteSeller(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── SELLER BANK ACCOUNTS ──────────────────────────────────────────────────

  app.post("/api/sellers/:sellerId/bank-accounts", async (req: Request, res: Response) => {
    try {
      const body = { ...req.body, sellerId: getParam(req, "sellerId") };
      const validated = validateBody(insertSellerBankAccountSchema, body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const account = await storage.createSellerBankAccount(validated.data);
      res.status(201).json(account);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/bank-accounts/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertSellerBankAccountSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const account = await storage.updateSellerBankAccount(getParam(req, "id"), validated.data);
      res.json(account);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/bank-accounts/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteSellerBankAccount(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── SELLER DOCUMENTS ──────────────────────────────────────────────────────

  app.get("/api/sellers/:sellerId/documents", async (req: Request, res: Response) => {
    try {
      const docs = await storage.getSellerDocuments(getParam(req, "sellerId"));
      res.json(docs);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(
    "/api/sellers/:sellerId/documents",
    teamDocUpload.single("arquivo"),
    async (req: Request, res: Response) => {
      try {
        const sellerId = getParam(req, "sellerId");
        const file = req.file;
        if (!file) {
          res.status(400).json({ message: "Nenhum arquivo enviado." });
          return;
        }
        const descricao = typeof req.body.descricao === "string" ? req.body.descricao : "";
        const relativePath = `/uploads/team-docs/${file.filename}`;
        const doc = await storage.createSellerDocument({
          sellerId,
          nomeArquivo: file.originalname,
          descricao: descricao || null,
          mimeType: file.mimetype,
          caminho: relativePath,
          tamanhoBytes: file.size,
        });
        res.status(201).json(doc);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.delete("/api/sellers/:sellerId/documents/:docId", async (req: Request, res: Response) => {
    try {
      const docId = getParam(req, "docId");
      const docs = await storage.getSellerDocuments(getParam(req, "sellerId"));
      const doc = docs.find((d) => d.id === docId);
      if (doc) {
        const fullPath = path.join(process.cwd(), doc.caminho);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
      await storage.deleteSellerDocument(docId);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── CLIENT-SELLER LINKS ───────────────────────────────────────────────────

  app.get("/api/clients/:clientId/sellers", async (req: Request, res: Response) => {
    try {
      const sellers = await storage.getClientSellers(getParam(req, "clientId"));
      res.json(sellers);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/clients/:clientId/sellers", async (req: Request, res: Response) => {
    try {
      const body = { ...req.body, clientId: getParam(req, "clientId") };
      const validated = validateBody(insertClientSellerLinkSchema, body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const link = await storage.linkClientSeller(validated.data);

      await storage.addTimelineEvent({
        clientId: getParam(req, "clientId"),
        eventType: "vendedor_vinculado",
        titulo: "Vendedor vinculado",
        descricao: "Novo vendedor vinculado ao cliente",
        metadata: { sellerId: validated.data.sellerId },
      });

      res.status(201).json(link);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/clients/:clientId/sellers/:sellerId", async (req: Request, res: Response) => {
    try {
      await storage.unlinkClientSeller(getParam(req, "clientId"), getParam(req, "sellerId"));
      await storage.addTimelineEvent({
        clientId: getParam(req, "clientId"),
        eventType: "vendedor_desvinculado",
        titulo: "Vendedor desvinculado",
        descricao: "Vendedor removido do cliente",
      });
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── CRM INTERACTIONS ──────────────────────────────────────────────────────

  app.get("/api/clients/:clientId/interactions", async (req: Request, res: Response) => {
    try {
      const interactions = await storage.getInteractions(getParam(req, "clientId"));
      res.json(interactions);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/clients/:clientId/interactions", async (req: Request, res: Response) => {
    try {
      const body = { ...req.body, clientId: getParam(req, "clientId") };
      const validated = validateBody(insertInteractionSchema, body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const interaction = await storage.createInteraction(validated.data as any);

      await storage.updateClient(getParam(req, "clientId"), {
        dataUltimoContato: new Date(),
      } as any);

      await storage.addTimelineEvent({
        clientId: getParam(req, "clientId"),
        eventType: "interacao_registrada",
        titulo: `Interação: ${interaction.tipo}`,
        descricao: interaction.descricao.slice(0, 120),
        metadata: { tipo: interaction.tipo },
      });

      res.status(201).json(interaction);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/interactions/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteInteraction(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── CRM TASKS ─────────────────────────────────────────────────────────────

  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const result = await storage.getTasks({
        clientId: getQuery(req, "clientId"),
        status: getQuery(req, "status"),
        page: getQuery(req, "page") ? Number(getQuery(req, "page")) : 1,
        limit: getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 25,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertTaskSchema, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const task = await storage.createTask(validated.data as any);

      if (task.clientId) {
        await storage.addTimelineEvent({
          clientId: task.clientId,
          eventType: "tarefa_criada",
          titulo: "Tarefa criada",
          descricao: task.titulo,
          metadata: { prioridade: task.prioridade },
        });
      }

      res.status(201).json(task);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertTaskSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      if (validated.data.status === "concluida") {
        (validated.data as any).dataConclusao = new Date();
      }

      const task = await storage.updateTask(getParam(req, "id"), validated.data as any);
      if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });

      if (task.status === "concluida" && task.clientId) {
        await storage.addTimelineEvent({
          clientId: task.clientId,
          eventType: "tarefa_concluida",
          titulo: "Tarefa concluída",
          descricao: task.titulo,
        });
      }

      res.json(task);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── TAGS ──────────────────────────────────────────────────────────────────

  app.get("/api/tags", async (_req: Request, res: Response) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/tags", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertTagSchema, req.body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const tag = await storage.createTag(validated.data);
      res.status(201).json(tag);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── TIMELINE ──────────────────────────────────────────────────────────────

  app.get("/api/clients/:clientId/timeline", async (req: Request, res: Response) => {
    try {
      const timeline = await storage.getTimeline(getParam(req, "clientId"));
      res.json(timeline);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── PAYMENT TERMS ─────────────────────────────────────────────────────────

  app.get("/api/payment-terms", async (req: Request, res: Response) => {
    try {
      const terms = await storage.getPaymentTerms();
      res.json(terms);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/payment-terms", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertPaymentTermSchema, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const term = await storage.createPaymentTerm(validated.data);
      res.status(201).json(term);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/payment-terms/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertPaymentTermSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const term = await storage.updatePaymentTerm(getParam(req, "id"), validated.data);
      if (!term) return res.status(404).json({ error: "Prazo não encontrado" });
      res.json(term);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/payment-terms/:id", async (req: Request, res: Response) => {
    try {
      await storage.deletePaymentTerm(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── PAYMENT METHODS ──────────────────────────────────────────────────────────

  app.get("/api/payment-methods", async (_req: Request, res: Response) => {
    try {
      const methods = await storage.getPaymentMethods();
      res.json(methods);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/payment-methods", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertPaymentMethodSchema, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const method = await storage.createPaymentMethod(validated.data);
      res.status(201).json(method);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/payment-methods/:id", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertPaymentMethodSchema.partial(), req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const method = await storage.updatePaymentMethod(getParam(req, "id"), validated.data);
      if (!method) return res.status(404).json({ error: "Forma de pagamento não encontrada" });
      res.json(method);
    } catch (err) { handleError(res, err); }
  });

  app.delete("/api/payment-methods/:id", async (req: Request, res: Response) => {
    try {
      await storage.deletePaymentMethod(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) { handleError(res, err); }
  });

  // ─── RAW MATERIALS ──────────────────────────────────────────────────────────

  app.get("/api/raw-materials", async (req: Request, res: Response) => {
    try {
      const result = await storage.getRawMaterials({
        search: getQuery(req, "search"),
        categoria: getQuery(req, "categoria"),
        page: getQuery(req, "page") ? Number(getQuery(req, "page")) : 1,
        limit: getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 25,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/raw-materials", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertRawMaterialSchema, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const material = await storage.createRawMaterial(validated.data);
      res.status(201).json(material);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/raw-materials/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertRawMaterialSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const material = await storage.updateRawMaterial(getParam(req, "id"), validated.data);
      if (!material) return res.status(404).json({ error: "Matéria-prima não encontrada" });
      res.json(material);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/raw-materials/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteRawMaterial(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── PRODUCTS ───────────────────────────────────────────────────────────────

  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const result = await storage.getProducts({
        search: getQuery(req, "search"),
        categoria: getQuery(req, "categoria"),
        tipoCalculo: getQuery(req, "tipoCalculo"),
        page: getQuery(req, "page") ? Number(getQuery(req, "page")) : 1,
        limit: getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 25,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/products", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertProductSchema, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const product = await storage.createProduct(validated.data);
      res.status(201).json(product);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProduct(getParam(req, "id"));
      if (!product) return res.status(404).json({ error: "Produto não encontrado" });
      res.json(product);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertProductSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const product = await storage.updateProduct(getParam(req, "id"), validated.data);
      if (!product) return res.status(404).json({ error: "Produto não encontrado" });
      res.json(product);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/products/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteProduct(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/products/:id/components", async (req: Request, res: Response) => {
    try {
      const components = await storage.getProductComponents(getParam(req, "id"));
      res.json(components);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put("/api/products/:id/components", async (req: Request, res: Response) => {
    try {
      const productId = getParam(req, "id");
      const componentSchemaNoId = insertProductComponentSchema.omit({ productId: true });
      const componentsSchema = z.array(componentSchemaNoId);
      const bodyData = Array.isArray(req.body) ? req.body : (req.body?.components ?? []);
      const validated = validateBody(componentsSchema, bodyData);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const withProductId = validated.data.map(c => ({ ...c, productId }));
      await storage.setProductComponents(productId, withProductId);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── AI GENERATIONS ──────────────────────────────────────────────────────────

  app.get("/api/ai-generations", async (_req: Request, res: Response) => {
    try {
      const generations = await storage.getAiGenerations();
      res.json(generations);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/ai/generate-product", async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "O prompt é obrigatório" });

      const materials = await storage.getRawMaterials({ limit: 1000 });
      const suggestion = await generateProductSuggestion(
        prompt,
        materials.data.map((m) => ({ id: m.id, nome: m.nome, categoria: m.categoria }))
      );

      const generation = await storage.createAiGeneration({
        promptOriginal: prompt,
        respostaRaw: JSON.stringify(suggestion),
        composicaoSugerida: suggestion.componentes,
        duvidas: suggestion.duvidas?.join(", "),
        confianca: suggestion.confianca,
      });

      res.json({ ...suggestion, id: generation.id });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/ai/suggest-quote-item", async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "O prompt é obrigatório" });

      const products = await storage.getProducts({ limit: 1000 });
      const suggestion = await suggestQuoteItem(
        prompt,
        products.data.map((p) => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          tipoCalculo: p.tipoCalculo,
          unidadeVenda: p.unidadeVenda,
        }))
      );

      res.json(suggestion);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/ai-generations", async (req: Request, res: Response) => {
    try {
      const validated = validateBody(insertAiProductGenerationSchema, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const generation = await storage.createAiGeneration(validated.data);
      res.status(201).json(generation);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── QUOTES ────────────────────────────────────────────────────────────────

  app.get("/api/quotes", async (req: Request, res: Response) => {
    try {
      const result = await storage.getQuotes({
        clientId: getQuery(req, "clientId"),
        status: getQuery(req, "status"),
        page: getQuery(req, "page") ? Number(getQuery(req, "page")) : 1,
        limit: getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 25,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/quotes/:id", async (req: Request, res: Response) => {
    try {
      const quote = await storage.getQuote(getParam(req, "id"));
      if (!quote) return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json(quote);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/quotes", async (req: Request, res: Response) => {
    try {
      const quoteCreateSchema = insertQuoteSchema.omit({ numero: true }).extend({
        desconto: z.union([z.string(), z.number()]).optional().nullable().transform(v => v != null ? String(v) : undefined),
        impostos: z.union([z.string(), z.number()]).optional().nullable().transform(v => v != null ? String(v) : undefined),
        valorTotal: z.union([z.string(), z.number()]).optional().nullable().transform(v => v != null ? String(v) : undefined),
      });
      const validated = validateBody(quoteCreateSchema, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const quote = await storage.createQuote(validated.data as InsertQuote);
      res.status(201).json(quote);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/quotes/:id", async (req: Request, res: Response) => {
    try {
      const partial = insertQuoteSchema.partial();
      const validated = validateBody(partial, req.body);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      const quote = await storage.updateQuote(getParam(req, "id"), validated.data);
      if (!quote) return res.status(404).json({ error: "Orçamento não encontrado" });
      res.json(quote);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/quotes/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteQuote(getParam(req, "id"));
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/quotes/:id/items", async (req: Request, res: Response) => {
    try {
      const items = await storage.getQuoteItems(getParam(req, "id"));
      res.json(items);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put("/api/quotes/:id/items", async (req: Request, res: Response) => {
    try {
      const coerceDecimal = z.union([z.string(), z.number()]).optional().nullable().transform(v => v != null ? String(v) : undefined);
      const quoteItemSchemaCoerced = insertQuoteItemSchema.extend({
        largura: coerceDecimal, altura: coerceDecimal, area: coerceDecimal,
        quantidade: coerceDecimal, custoCalculado: coerceDecimal,
        precoUnitario: coerceDecimal, precoTotal: coerceDecimal,
        descricao: z.string().nullable().optional().transform(v => v ?? ""),
      }).omit({ quoteId: true });
      const itemsSchema = z.array(quoteItemSchemaCoerced);
      const bodyData = Array.isArray(req.body) ? req.body : (req.body?.items ?? []);
      const validated = validateBody(itemsSchema, bodyData);
      if ("error" in validated) return res.status(400).json({ error: validated.error });
      await storage.setQuoteItems(getParam(req, "id"), validated.data as any);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/quotes/:id/convert-to-order", async (req: Request, res: Response) => {
    try {
      const order = await storage.convertQuoteToOrder(getParam(req, "id"));
      res.status(201).json(order);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── ORDERS ────────────────────────────────────────────────────────────────

  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      const result = await storage.getOrders({
        clientId: getQuery(req, "clientId"),
        status: getQuery(req, "status"),
        page: getQuery(req, "page") ? Number(getQuery(req, "page")) : 1,
        limit: getQuery(req, "limit") ? Number(getQuery(req, "limit")) : 25,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const order = await storage.getOrder(getParam(req, "id"));
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      res.json(order);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/orders/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Status é obrigatório" });
      const order = await storage.updateOrderStatus(getParam(req, "id"), status);
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      res.json(order);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/orders/:id/items", async (req: Request, res: Response) => {
    try {
      const items = await storage.getOrderItems(getParam(req, "id"));
      res.json(items);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── COMPANIES ────────────────────────────────────────────────────────────────

  app.get("/api/companies", async (req: Request, res: Response) => {
    try {
      const { search, status, page, limit } = req.query as Record<string, string>;
      const result = await storage.getCompanies({
        search, status,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/companies/default", async (req: Request, res: Response) => {
    try {
      const company = await storage.getDefaultCompany();
      if (!company) return res.status(404).json({ error: "Nenhuma empresa padrão definida" });
      res.json(company);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/companies/:id", async (req: Request, res: Response) => {
    try {
      const company = await storage.getCompany(getParam(req, "id"));
      if (!company) return res.status(404).json({ error: "Empresa não encontrada" });
      res.json(company);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/companies", async (req: Request, res: Response) => {
    try {
      const body = nullifyEmpty(req.body) as any;
      const parsed = insertCompanySchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      }
      const { data: allCompanies } = await storage.getCompanies({ limit: 1000 });
      const existing = allCompanies.find(
        (c) => c.cnpj.replace(/\D/g, "") === (parsed.data.cnpj || "").replace(/\D/g, "")
      );
      if (existing) {
        return res.status(400).json({ error: "CNPJ já cadastrado" });
      }
      const company = await storage.createCompany(parsed.data);
      res.status(201).json(company);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/companies/:id", async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const body = nullifyEmpty(req.body) as any;
      if (body.cnpj) {
        const { data: allCompanies } = await storage.getCompanies({ limit: 1000 });
        const existing = allCompanies.find(
          (c) => c.id !== id && c.cnpj.replace(/\D/g, "") === body.cnpj.replace(/\D/g, "")
        );
        if (existing) {
          return res.status(400).json({ error: "CNPJ já cadastrado" });
        }
      }
      const company = await storage.updateCompany(id, body);
      if (!company) return res.status(404).json({ error: "Empresa não encontrada" });
      res.json(company);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/companies/:id/set-default", async (req: Request, res: Response) => {
    try {
      const company = await storage.setDefaultCompany(getParam(req, "id"));
      if (!company) return res.status(404).json({ error: "Empresa não encontrada" });
      res.json(company);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/companies/:id", async (req: Request, res: Response) => {
    try {
      await storage.softDeleteCompany(getParam(req, "id"));
      res.status(204).end();
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── WHATSAPP BOT (Meta WhatsApp Business API) ────────────────────────────────

  const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN ?? "gigai_whatsapp_2026";
  const META_API_URL = "https://graph.facebook.com/v18.0";

  const getMetaToken = () => process.env.META_WHATSAPP_TOKEN ?? "";
  const getMetaPhoneId = () => process.env.META_PHONE_NUMBER_ID ?? "";

  const openaiBot = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  async function sendMetaMessage(phoneNumberId: string, to: string, body: string): Promise<void> {
    const token = getMetaToken();
    if (!token || !phoneNumberId) {
      console.warn("[WhatsApp] META_WHATSAPP_TOKEN ou phone_number_id não configurado — mensagem não enviada.");
      return;
    }
    console.log("[WhatsApp] Enviando mensagem via Meta API:", { phoneNumberId, to, bodyPreview: body.slice(0, 80) });
    const resp = await fetch(`${META_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error("[WhatsApp] Erro ao enviar via Meta API:", { phoneNumberId, to, status: resp.status, err });
    } else {
      let wamid = "(sem wamid)";
      try {
        const result = await resp.json() as { messages?: { id: string }[] };
        wamid = result?.messages?.[0]?.id ?? "(sem wamid)";
      } catch {
        // Meta returned non-JSON on success — not critical
      }
      console.log("[WhatsApp] Mensagem enviada com sucesso:", { phoneNumberId, to, wamid });
    }
  }

  async function sendMetaDocument(phoneNumberId: string, to: string, documentUrl: string, filename: string, caption?: string): Promise<void> {
    const token = getMetaToken();
    if (!token || !phoneNumberId) return;
    const resp = await fetch(`${META_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "document",
        document: { link: documentUrl, filename, ...(caption ? { caption } : {}) },
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error("[WhatsApp] Erro ao enviar documento via Meta API:", err);
    }
  }

  // ── DEFAULT BOT CONFIG ────────────────────────────────────────────────────
  const DEFAULT_SYSTEM_PROMPT = `Você é o assistente virtual da Gráfica+, uma gráfica profissional brasileira. Converse de forma natural, amigável e direta em português brasileiro.

Informações JÁ coletadas para o orçamento: {DADOS_COLETADOS}

Sua tarefa: entender o que o cliente quer e extrair dados para um orçamento de impressão.

Campos a coletar:
- produto: nome do produto (banner, faixa, adesivo vinil, placa PVC, lona, cartão de visita, folder, etc.)
- largura: largura em metros (número decimal, ex: 3.0)
- altura: altura em metros (número decimal, ex: 1.0)
- quantidade: número inteiro de peças
- nomeCliente: nome completo ou razão social
- cidade: cidade de entrega

REGRAS:
1. Se o cliente informar TUDO em uma mensagem (ex: "quero 100 adesivos 5x5cm para Porto Alegre, empresa ABC"), extraia tudo de uma vez e marque complete=true com resumo para confirmação.
2. Se faltar alguma informação, pergunte de forma natural apenas pelo que está faltando.
3. Converta cm para metros automaticamente (ex: 5cm = 0.05m, 50cm = 0.5m).
4. Se o cliente perguntar sobre status de pedido, retorne intent="status".
5. Se pedir atendente humano, retorne intent="atendente".
6. Não altere campos já coletados (mantenha os valores existentes).
7. Quando complete=true, o reply deve ser um resumo amigável pedindo confirmação (SIM/NÃO).

Responda SOMENTE com JSON válido:
{
  "produto": string | null,
  "largura": number | null,
  "altura": number | null,
  "quantidade": number | null,
  "nomeCliente": string | null,
  "cidade": string | null,
  "reply": string,
  "complete": boolean,
  "intent": "orcamento" | "status" | "atendente" | "outro"
}`;

  const DEFAULT_WELCOME_MSG = `Olá! 👋 Sou a assistente virtual da *Gráfica+*.\n\nComo posso te ajudar? Me diga o que você precisa — pode escrever normalmente, como:\n\n_"Quero um banner de 3x1m, 50 unidades"_\n_"Preciso de 100 adesivos 10x10cm para minha empresa"_\n_"Qual o status do meu pedido ORC-2026-0001?"_`;
  const DEFAULT_CANCEL_MSG = `Tudo bem! Recomeçamos do zero. 😊\n\nComo posso ajudar? Me diga o que você precisa!`;
  const DEFAULT_ATTENDANT_MSG = `Entendido! 🙋 Em breve um atendente entrará em contato com você.\n\nSe precisar de algo mais, é só dizer!`;

  interface QuoteData {
    produto?: string | null;
    largura?: number | null;
    altura?: number | null;
    quantidade?: number | null;
    nomeCliente?: string | null;
    cidade?: string | null;
  }

  interface AiExtractResult extends QuoteData {
    reply: string;
    complete: boolean;
    intent?: "orcamento" | "status" | "atendente" | "outro";
  }

  async function extractQuoteInfoWithAI(userMessage: string, collected: QuoteData, systemPromptTemplate: string): Promise<AiExtractResult> {
    const collected_summary = Object.entries(collected)
      .filter(([, v]) => v != null && v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "nenhuma";

    const systemPrompt = systemPromptTemplate.replace("{DADOS_COLETADOS}", collected_summary);

    try {
      const resp = await openaiBot.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500,
      });

      const result = JSON.parse(resp.choices[0].message.content ?? "{}") as AiExtractResult;

      return {
        produto: result.produto ?? collected.produto ?? null,
        largura: result.largura ?? collected.largura ?? null,
        altura: result.altura ?? collected.altura ?? null,
        quantidade: result.quantidade ?? collected.quantidade ?? null,
        nomeCliente: result.nomeCliente ?? collected.nomeCliente ?? null,
        cidade: result.cidade ?? collected.cidade ?? null,
        reply: result.reply ?? "Desculpe, não entendi. Pode repetir?",
        complete: result.complete === true,
        intent: result.intent ?? "orcamento",
      };
    } catch (e) {
      console.error("[WhatsApp] Erro na extração via IA:", e);
      return {
        ...collected,
        reply: "Não entendi bem. Pode me dizer o que você precisa? 😊",
        complete: false,
        intent: "outro",
      };
    }
  }

  // ─── PDF GENERATION ENDPOINT ─────────────────────────────────────────────────
  app.get("/api/quotes/:id/pdf", async (req: Request, res: Response) => {
    try {
      const quoteId = getParam(req, "id");
      const quote = await storage.getQuote(quoteId);
      if (!quote) return res.status(404).json({ error: "Orçamento não encontrado" });

      const items = await storage.getQuoteItems(quoteId);
      let clientName = "Cliente";
      if (quote.clientId) {
        try {
          const client = await storage.getClient(quote.clientId);
          clientName = client?.nomeFantasia || client?.razaoSocial || clientName;
        } catch {}
      }

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${quote.numero}.pdf"`);
      doc.pipe(res);

      const blue = "#1a4fa0";
      const gray = "#666666";
      const lightGray = "#f5f5f5";

      doc.rect(0, 0, doc.page.width, 80).fill(blue);
      doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("GRÁFICA+", 50, 25);
      doc.fontSize(10).font("Helvetica").text("Orçamento Profissional", 50, 50);
      doc.fillColor("white").fontSize(14).font("Helvetica-Bold").text(quote.numero, doc.page.width - 200, 30, { width: 150, align: "right" });
      doc.fillColor("white").fontSize(9).font("Helvetica").text(`Data: ${new Date(quote.data + "T12:00:00").toLocaleDateString("pt-BR")}`, doc.page.width - 200, 50, { width: 150, align: "right" });
      doc.fillColor("white").fontSize(9).text(`Válido até: ${new Date(quote.validade + "T12:00:00").toLocaleDateString("pt-BR")}`, doc.page.width - 200, 62, { width: 150, align: "right" });

      doc.moveDown(3.5);

      doc.fillColor(blue).fontSize(11).font("Helvetica-Bold").text("CLIENTE");
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(blue).lineWidth(1).stroke();
      doc.moveDown(0.3);
      doc.fillColor("#333333").fontSize(10).font("Helvetica").text(clientName);
      if (quote.observacoes) {
        doc.fontSize(9).fillColor(gray).text(quote.observacoes);
      }
      doc.moveDown(1);

      doc.fillColor(blue).fontSize(11).font("Helvetica-Bold").text("ITENS DO ORÇAMENTO");
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(blue).lineWidth(1).stroke();
      doc.moveDown(0.3);

      const tableTop = doc.y;
      const colDesc = 50;
      const colDim = 270;
      const colQtd = 370;
      const colUnit = 420;
      const colTotal = 480;
      const tableWidth = doc.page.width - 100;

      doc.rect(colDesc, tableTop, tableWidth, 20).fill(blue);
      doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
      doc.text("Descrição", colDesc + 5, tableTop + 5, { width: 210 });
      doc.text("Medidas", colDim + 5, tableTop + 5, { width: 90 });
      doc.text("Qtd", colQtd + 5, tableTop + 5, { width: 45 });
      doc.text("Unit.", colUnit + 5, tableTop + 5, { width: 55 });
      doc.text("Total", colTotal + 5, tableTop + 5, { width: 65 });

      let rowY = tableTop + 22;
      doc.font("Helvetica").fontSize(9);

      if (items.length === 0) {
        doc.rect(colDesc, rowY, tableWidth, 20).fill(lightGray);
        doc.fillColor(gray).text("Nenhum item cadastrado", colDesc + 5, rowY + 5, { width: tableWidth - 10 });
        rowY += 22;
      }

      items.forEach((item, i) => {
        const bg = i % 2 === 0 ? "white" : lightGray;
        doc.rect(colDesc, rowY, tableWidth, 22).fill(bg);
        doc.fillColor("#333333");
        const desc = item.descricao || "Item";
        doc.text(desc, colDesc + 5, rowY + 5, { width: 210, ellipsis: true });
        const dim = item.largura && item.altura ? `${item.largura}m × ${item.altura}m` : item.largura ? `${item.largura}m` : "-";
        doc.text(dim, colDim + 5, rowY + 5, { width: 90 });
        doc.text(String(item.quantidade ?? 1), colQtd + 5, rowY + 5, { width: 45 });
        const unit = Number(item.precoUnitario ?? 0).toFixed(2).replace(".", ",");
        doc.text(`R$ ${unit}`, colUnit + 5, rowY + 5, { width: 55 });
        const total = Number(item.precoTotal ?? 0).toFixed(2).replace(".", ",");
        doc.text(`R$ ${total}`, colTotal + 5, rowY + 5, { width: 65 });
        rowY += 24;
      });

      doc.moveDown(0.5);
      const totalVal = Number(quote.valorTotal ?? 0).toFixed(2).replace(".", ",");
      doc.rect(colTotal - 60, rowY + 5, 120 + tableWidth - (colTotal - colDesc) + 10, 24).fill(blue);
      doc.fillColor("white").fontSize(11).font("Helvetica-Bold").text(`TOTAL: R$ ${totalVal}`, colDesc, rowY + 10, { width: tableWidth, align: "right" });

      doc.moveDown(4);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#cccccc").lineWidth(0.5).stroke();
      doc.moveDown(0.5);
      doc.fillColor(gray).fontSize(8).font("Helvetica").text(
        "Este orçamento é válido por 7 dias a partir da data de emissão. Valores sujeitos a alteração após o vencimento.",
        50, doc.y, { align: "center", width: doc.page.width - 100 }
      );

      doc.end();
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── WEBHOOK VERIFICATION ────────────────────────────────────────────────────
  app.get("/api/whatsapp", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;

    if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
      console.log("[WhatsApp] Webhook verificado com sucesso pela Meta");
      return res.status(200).send(challenge);
    }

    if (mode || token) {
      console.warn("[WhatsApp] Falha na verificação — token inválido");
      return res.sendStatus(403);
    }

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
      : `${req.protocol}://${req.get("host")}`;
    res.json({
      status: "active",
      webhook: {
        url: `${baseUrl}/api/whatsapp`,
        verifyToken: META_VERIFY_TOKEN,
        configured: { token: !!getMetaToken(), phoneNumberId: !!getMetaPhoneId() },
      },
      message: "Webhook do WhatsApp (Meta) está ativo.",
    });
  });

  // ─── WEBHOOK MESSAGE HANDLER ─────────────────────────────────────────────────
  app.post("/api/whatsapp", async (req: Request, res: Response) => {
    res.sendStatus(200);
    try {
      const body = req.body;
      if (body.object !== "whatsapp_business_account") return;

      const botCfg = await storage.getWaBotConfig();
      const cfgSystemPrompt = botCfg?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
      const cfgWelcomeMsg = botCfg?.welcomeMessage || DEFAULT_WELCOME_MSG;
      const cfgCancelMsg = botCfg?.cancelMessage || DEFAULT_CANCEL_MSG;
      const cfgAttendantMsg = botCfg?.attendantMessage || DEFAULT_ATTENDANT_MSG;
      const cfgVehMessages = {
        naoCadastrado: botCfg?.vehMsgNaoCadastrado || null,
        naoAutorizado: botCfg?.vehMsgNaoAutorizado || null,
        semVeiculos: botCfg?.vehMsgSemVeiculos || null,
        cancelado: botCfg?.vehMsgCancelado || null,
        saidaSucesso: botCfg?.vehMsgSaidaSucesso || null,
        retornoSucesso: botCfg?.vehMsgRetornoSucesso || null,
      };

      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (!value?.messages?.length) continue;
          const phoneNumberId: string = value.metadata?.phone_number_id ?? getMetaPhoneId();
          const botNumber: string = value.metadata?.display_phone_number ?? "";

          for (const msg of value.messages) {
            const msgType: string = msg.type ?? "text";
            if (msgType !== "text" && msgType !== "image") continue;

            const from: string = msg.from;
            const rawBody: string = msgType === "text" ? (msg.text?.body ?? "").trim() : "";
            const mediaId: string | undefined = msgType === "image" ? msg.image?.id : undefined;
            const msgNorm = rawBody.toLowerCase().replace(/[^a-z0-9çãáéíóúâêîôûàèìòùü ]/g, "").trim();
            console.log("[WhatsApp] Mensagem recebida", { from, type: msgType, body: rawBody || "(image)" });

            console.log("[WhatsApp] Processando mensagem:", { from, phoneNumberId, step: "início" });

            const fromKey = `meta:${from}`;
            let session = await storage.getWhatsappSession(fromKey);
            if (!session) session = await storage.createWhatsappSession(fromKey);
            await storage.addWhatsappMessage(
              session.id,
              "inbound",
              msgType === "image" ? "[📸 Foto enviada]" : rawBody,
              fromKey,
              botNumber
            );

            const reply = async (replyMsg: string, nextStep?: string, extraData?: Record<string, unknown>) => {
              if (nextStep !== undefined || extraData) {
                const newData = { ...(session!.data as Record<string, unknown>), ...extraData };
                await storage.updateWhatsappSession(session!.id, { step: nextStep ?? session!.step, data: newData });
              }
              await storage.addWhatsappMessage(session!.id, "outbound", replyMsg, botNumber, fromKey);
              await sendMetaMessage(phoneNumberId, from, replyMsg);
            };

            const updateSession = async (data: Partial<typeof session>) => {
              await storage.updateWhatsappSession(session!.id, data);
              session = { ...session!, ...data };
            };

            // ── VEHICLE FLOW (internal employees) ─────────────────────────────
            let vehicleHandled = false;
            try {
              vehicleHandled = await handleVehicleWaFlow({
                from,
                rawBody,
                msgNorm,
                msgType,
                mediaId,
                session,
                token: getMetaToken(),
                vehMessages: cfgVehMessages,
                reply,
                updateSession,
              });
            } catch (vehErr) {
              console.error("[WhatsApp] Erro em handleVehicleWaFlow:", { from, msgNorm, err: vehErr });
            }
            if (vehicleHandled) continue;

            if (msgNorm === "cancelar" || msgNorm === "sair") {
              await storage.updateWhatsappSession(session.id, { step: "collecting", data: {} });
              await reply(cfgCancelMsg, "collecting");
              continue;
            }

            if (msgNorm === "menu" || msgNorm === "inicio" || msgNorm === "início" || msgNorm === "oi" || msgNorm === "ola" || msgNorm === "olá") {
              if (session.step === "done" || session.step === "menu") {
                await storage.updateWhatsappSession(session.id, { step: "collecting", data: {} });
              }
              await reply(cfgWelcomeMsg, "collecting");
              continue;
            }

            const step = session.step;
            const data = (session.data ?? {}) as QuoteData;

            // ── STATUS QUERY ──────────────────────────────────────────────────
            if (step === "status_query" || (step === "collecting" && (msgNorm.includes("status") || rawBody.toUpperCase().match(/^(ORC|PED)-\d{4}-\d{4}$/)))) {
              const numUpper = rawBody.trim().toUpperCase();
              if (numUpper.startsWith("ORC-") || numUpper.startsWith("PED-")) {
                const { data: qs } = await storage.getQuotes({ limit: 500 });
                const fq = qs.find((q) => q.numero === numUpper);
                if (fq) {
                  const sm: Record<string, string> = { rascunho: "📝 Em análise", enviado: "📤 Enviado", aprovado: "✅ Aprovado", reprovado: "❌ Reprovado", cancelado: "🚫 Cancelado" };
                  await reply(`*${fq.numero}*\nStatus: ${sm[fq.status] ?? fq.status}\nValor: R$ ${Number(fq.valorTotal || 0).toFixed(2).replace(".", ",")}\n\nPrecisa de mais alguma coisa?`, "collecting", {});
                  continue;
                }
                const { data: os } = await storage.getOrders({ limit: 500 });
                const fo = os.find((o) => o.numero === numUpper);
                if (fo) {
                  const sm: Record<string, string> = { aguardando_producao: "⏳ Aguardando Produção", em_producao: "🏭 Em Produção", finalizado: "✅ Finalizado", entregue: "📦 Entregue", cancelado: "🚫 Cancelado" };
                  await reply(`*${fo.numero}*\nStatus: ${sm[fo.status] ?? fo.status}\nValor: R$ ${Number(fo.valorTotal || 0).toFixed(2).replace(".", ",")}\n\nPrecisa de mais alguma coisa?`, "collecting", {});
                  continue;
                }
                await reply(`Não encontrei o número *${numUpper}*. Verifique e tente novamente.`, "status_query");
                continue;
              }
            }

            // ── CONFIRMAR ORÇAMENTO ───────────────────────────────────────────
            if (step === "confirmar") {
              if (msgNorm === "sim" || msgNorm === "s" || msgNorm === "yes" || msgNorm === "confirmo" || msgNorm === "ok" || msgNorm === "pode") {
                const d = data as QuoteData;
                const phone = from.replace(/\D/g, "");
                try {
                  let clientId: string;
                  const { data: fc } = await storage.getClients({ search: phone, limit: 5 });
                  const existing = fc.find((c) => (c.telefone ?? "").replace(/\D/g, "").includes(phone));
                  if (existing) {
                    clientId = existing.id;
                  } else {
                    const nc = await storage.createClient({
                      tipoPessoa: "fisica",
                      razaoSocial: d.nomeCliente ?? "Cliente WhatsApp",
                      telefone: `+${phone}`,
                      status: "prospect",
                      origemLead: "whatsapp",
                    } as any);
                    clientId = nc.id;
                  }
                  const today = new Date().toISOString().split("T")[0];
                  const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                  const quote = await storage.createQuote({
                    clientId,
                    data: today,
                    validade: validUntil,
                    status: "rascunho",
                    desconto: "0",
                    impostos: "0",
                    observacoes: `Orçamento via WhatsApp - Cidade: ${d.cidade ?? ""}`,
                  } as any);
                  const larg = d.largura ?? 0;
                  const alt = d.altura ?? 0;
                  const qtd = d.quantidade ?? 1;

                  let quoteItemData: Record<string, unknown> = {
                    quoteId: quote.id,
                    descricao: d.produto ?? "Produto",
                    largura: String(larg),
                    altura: String(alt),
                    area: (larg * alt).toFixed(4),
                    quantidade: String(qtd),
                    unidade: larg > 0 && alt > 0 ? "m²" : "un",
                    custoCalculado: "0",
                    precoUnitario: "0",
                    precoTotal: "0",
                    ordem: 0,
                  };

                  try {
                    const { data: prods } = await storage.getProducts({ limit: 100 });
                    const prompt = `${d.produto} ${larg}x${alt}m quantidade ${qtd} cidade ${d.cidade}`;
                    const suggestion = await suggestQuoteItem(prompt, prods.map((p) => ({
                      id: p.id,
                      nome: p.nome,
                      categoria: p.categoria ?? "",
                      tipoCalculo: p.tipoCalculo,
                      unidadeVenda: p.unidadeVenda,
                    })));
                    quoteItemData = {
                      quoteId: quote.id,
                      productId: suggestion.productId ?? null,
                      descricao: suggestion.descricao || d.produto || "Produto",
                      largura: suggestion.largura != null ? String(suggestion.largura) : String(larg),
                      altura: suggestion.altura != null ? String(suggestion.altura) : String(alt),
                      area: suggestion.area != null ? String(suggestion.area) : (larg * alt).toFixed(4),
                      quantidade: String(suggestion.quantidade || qtd),
                      unidade: suggestion.unidade || "un",
                      custoCalculado: "0",
                      precoUnitario: String(suggestion.precoUnitario ?? 0),
                      precoTotal: String(suggestion.precoTotal ?? 0),
                      observacoes: suggestion.observacoes ?? null,
                      ordem: 0,
                    };
                    await storage.updateQuote(quote.id, { valorTotal: String(suggestion.precoTotal ?? 0) });
                  } catch (aiErr) {
                    console.warn("[WhatsApp] Erro ao calcular preço com IA, usando zero:", aiErr);
                  }

                  await storage.setQuoteItems(quote.id, [quoteItemData as any]);
                  await storage.updateWhatsappSession(session!.id, { step: "done", status: "completed", clientId, quoteId: quote.id });

                  const precoTotal = Number(quoteItemData.precoTotal ?? 0);
                  const precoStr = precoTotal > 0
                    ? `\n💰 *Valor estimado: R$ ${precoTotal.toFixed(2).replace(".", ",")}*\n`
                    : "\n_(O valor será calculado pela nossa equipe)_\n";
                  await reply(`✅ *Orçamento ${quote.numero} criado!*\n${precoStr}\nEstamos enviando uma cópia do seu orçamento agora... 👇`);

                  const prodUrl = process.env.REPLIT_DOMAINS
                    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
                    : "https://grafica-core-system.replit.app";
                  const pdfUrl = `${prodUrl}/api/quotes/${quote.id}/pdf`;
                  await sendMetaDocument(phoneNumberId, from, pdfUrl, `${quote.numero}.pdf`, `Orçamento ${quote.numero} - Gráfica+`);

                  await reply(`Obrigado por escolher a *Gráfica+*! 🖨️\n\nPrecisa de mais alguma coisa? É só me dizer!`, "collecting", {});
                } catch (e) {
                  console.error("[WhatsApp] Erro ao criar orçamento:", e);
                  await reply(`Ocorreu um erro. Por favor, tente novamente.`, "collecting");
                }
                continue;
              }

              if (msgNorm === "nao" || msgNorm === "não" || msgNorm === "n" || msgNorm === "no" || msgNorm === "errado" || msgNorm === "incorreto") {
                await storage.updateWhatsappSession(session.id, { step: "collecting", data: {}, status: "abandoned" });
                session = await storage.createWhatsappSession(fromKey);
                await reply(`Tudo bem! Vamos recomeçar. 😊\n\nMe diga o que você precisa:`, "collecting");
                continue;
              }

              await reply(`Por favor, responda *SIM* para confirmar ou *NÃO* para recomeçar.`);
              continue;
            }

            // ── COLLECTING (IA-DRIVEN) ────────────────────────────────────────
            if (step === "done") {
              await storage.updateWhatsappSession(session.id, { step: "collecting", data: {} });
              session = await storage.createWhatsappSession(fromKey);
            }

            const aiResult = await extractQuoteInfoWithAI(rawBody, data, cfgSystemPrompt);

            if (aiResult.intent === "atendente") {
              await reply(cfgAttendantMsg, "collecting", {});
              continue;
            }

            if (aiResult.intent === "status") {
              await reply(`Me informe o número do orçamento ou pedido:\n_(ex: ORC-2026-0001 ou PED-2026-0001)_`, "status_query");
              continue;
            }

            const newData: QuoteData = {
              produto: aiResult.produto,
              largura: aiResult.largura,
              altura: aiResult.altura,
              quantidade: aiResult.quantidade,
              nomeCliente: aiResult.nomeCliente,
              cidade: aiResult.cidade,
            };

            if (aiResult.complete) {
              await reply(aiResult.reply, "confirmar", newData as Record<string, unknown>);
            } else {
              await reply(aiResult.reply, "collecting", newData as Record<string, unknown>);
            }
          }
        }
      }
    } catch (err) {
      console.error("[WhatsApp Webhook]", err);
    }
  });

  app.get("/api/whatsapp/sessions", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const status = req.query.status as string | undefined;
      const result = await storage.getWhatsappSessions({ status, page, limit });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/whatsapp/sessions/:id", async (req: Request, res: Response) => {
    try {
      const session = await storage.getWhatsappSessionById(getParam(req, "id"));
      if (!session) return res.status(404).json({ error: "Sessão não encontrada" });
      const messages = await storage.getWhatsappMessages(session.id);
      res.json({ ...session, messages });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/whatsapp/config", async (_req: Request, res: Response) => {
    try {
      const cfg = await storage.getWaBotConfig();
      res.json(cfg ?? {
        id: "default",
        nomeBot: "Assistente Gráfica+",
        nomeEmpresa: "Gráfica+",
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        welcomeMessage: DEFAULT_WELCOME_MSG,
        cancelMessage: DEFAULT_CANCEL_MSG,
        attendantMessage: DEFAULT_ATTENDANT_MSG,
      });
    } catch (err) { handleError(res, err); }
  });

  app.put("/api/whatsapp/config", async (req: Request, res: Response) => {
    try {
      const {
        nomeBot, nomeEmpresa, systemPrompt, welcomeMessage, cancelMessage, attendantMessage,
        vehMsgNaoCadastrado, vehMsgNaoAutorizado, vehMsgSemVeiculos,
        vehMsgCancelado, vehMsgSaidaSucesso, vehMsgRetornoSucesso,
      } = req.body;
      const cfg = await storage.upsertWaBotConfig({
        nomeBot, nomeEmpresa, systemPrompt, welcomeMessage, cancelMessage, attendantMessage,
        vehMsgNaoCadastrado: vehMsgNaoCadastrado || null,
        vehMsgNaoAutorizado: vehMsgNaoAutorizado || null,
        vehMsgSemVeiculos: vehMsgSemVeiculos || null,
        vehMsgCancelado: vehMsgCancelado || null,
        vehMsgSaidaSucesso: vehMsgSaidaSucesso || null,
        vehMsgRetornoSucesso: vehMsgRetornoSucesso || null,
      });
      res.json(cfg);
    } catch (err) { handleError(res, err); }
  });

  // ─── QUOTE RULES ──────────────────────────────────────────────────────────

  app.get("/api/quote-rules", async (_req: Request, res: Response) => {
    try {
      const rules = await storage.listQuoteRules();
      res.json(rules);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/quote-rules", async (req: Request, res: Response) => {
    try {
      const body = insertQuoteRuleSchema.parse(req.body);
      const rule = await storage.createQuoteRule(body);
      res.status(201).json(rule);
    } catch (err) { handleError(res, err); }
  });

  app.put("/api/quote-rules/:id", async (req: Request, res: Response) => {
    try {
      const rule = await storage.updateQuoteRule(getParam(req, "id"), req.body);
      if (!rule) return res.status(404).json({ error: "Regra não encontrada" });
      res.json(rule);
    } catch (err) { handleError(res, err); }
  });

  app.delete("/api/quote-rules/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteQuoteRule(getParam(req, "id"));
      res.status(204).end();
    } catch (err) { handleError(res, err); }
  });

  // ─── SPECIAL QUOTES (AI-powered) ──────────────────────────────────────────

  app.post("/api/special-quotes/generate", async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt é obrigatório" });

      const [mats, prods, rules] = await Promise.all([
        storage.getRawMaterials({ limit: 200 }),
        storage.getProducts({ limit: 200 }),
        storage.listQuoteRules(),
      ]);

      const result = await generateSpecialQuote(
        prompt,
        mats.data.map((m) => ({ id: m.id, nome: m.nome, categoria: m.categoria, custoUnitario: m.custoUnitario, unidadeCompra: m.unidadeCompra })),
        prods.data.map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria, tipoCalculo: p.tipoCalculo, unidadeVenda: p.unidadeVenda })),
        rules.filter((r) => r.ativa).map((r) => ({ nome: r.nome, regra: r.regra }))
      );

      res.json(result);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/special-quotes/adjust", async (req: Request, res: Response) => {
    try {
      const { originalPrompt, previousResult, adjustment } = req.body;
      if (!adjustment) return res.status(400).json({ error: "Ajuste é obrigatório" });

      const [mats, prods, rules] = await Promise.all([
        storage.getRawMaterials({ limit: 200 }),
        storage.getProducts({ limit: 200 }),
        storage.listQuoteRules(),
      ]);

      // Run adjustment and extraction in parallel for speed
      const [result, extracted] = await Promise.all([
        adjustSpecialQuote(
          originalPrompt || "",
          previousResult,
          adjustment,
          mats.data.map((m) => ({ id: m.id, nome: m.nome, categoria: m.categoria, custoUnitario: m.custoUnitario, unidadeCompra: m.unidadeCompra })),
          prods.data.map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria, tipoCalculo: p.tipoCalculo, unidadeVenda: p.unidadeVenda })),
          rules.filter((r) => r.ativa).map((r) => ({ nome: r.nome, regra: r.regra }))
        ),
        extractFromAdjustment(adjustment),
      ]);

      type MatCat = "chapas" | "impressao" | "estruturas" | "iluminacao" | "fixacao" | "adesivos" | "tintas" | "acabamento" | "instalacao" | "servicos_terceirizados" | "outros";
      const validCats: MatCat[] = ["chapas","impressao","estruturas","iluminacao","fixacao","adesivos","tintas","acabamento","instalacao","servicos_terceirizados","outros"];

      // Merge: prefer dedicated extraction, fall back to whatever the adjust AI returned
      const materiaisParaCriar = extracted.materiais.length > 0 ? extracted.materiais : (result.novosMateriais || []);
      const regrasParaCriar = extracted.regras.length > 0 ? extracted.regras : (result.novasRegras || []);

      // Normalize a name for fuzzy matching: lowercase, strip punctuation, split into meaningful words
      const normalizeWords = (name: string) =>
        name.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2); // ignore short words like "de", "do", "e"

      const namesSimilar = (a: string, b: string): boolean => {
        const wa = normalizeWords(a);
        const wb = normalizeWords(b);
        if (wa.length === 0 || wb.length === 0) return false;
        const common = wa.filter((w) => wb.includes(w));
        // Similar if: ≥2 words in common, OR one is a subset of the other (≥60% overlap)
        if (common.length >= 2) return true;
        const overlapA = common.length / wa.length;
        const overlapB = common.length / wb.length;
        return overlapA >= 0.6 || overlapB >= 0.6;
      };

      // UPSERT raw materials: update price if name is similar to existing, else create
      const createdMaterials: string[] = [];
      for (const nm of materiaisParaCriar) {
        if (!nm?.nome || !nm?.custoUnitario) continue;
        try {
          const existing = mats.data.find((m) => namesSimilar(m.nome, nm.nome));
          if (existing) {
            await storage.updateRawMaterial(existing.id, {
              custoUnitario: String(nm.custoUnitario),
              ...(nm.descricao ? { descricao: nm.descricao } : {}),
            });
            createdMaterials.push(`${existing.nome} (preço atualizado → R$${nm.custoUnitario})`);
            console.log(`[Special Quote] Material atualizado: ${existing.nome} → R$${nm.custoUnitario}`);
          } else {
            await storage.createRawMaterial({
              nome: nm.nome,
              categoria: validCats.includes(nm.categoria as MatCat) ? (nm.categoria as MatCat) : "outros",
              unidadeCompra: (nm as { unidade?: string; unidadeCompra?: string }).unidade || (nm as { unidade?: string; unidadeCompra?: string }).unidadeCompra || "un",
              custoUnitario: String(nm.custoUnitario),
              descricao: nm.descricao || null,
              ativo: true,
            });
            createdMaterials.push(`${nm.nome} (novo cadastro)`);
            console.log(`[Special Quote] Material cadastrado: ${nm.nome} @ R$${nm.custoUnitario}`);
          }
        } catch (e) {
          console.error("[Special Quote] Failed to upsert raw material:", nm.nome, e);
        }
      }

      // UPSERT quote rules: update if similar name exists, else create
      const createdRules: string[] = [];
      for (const nr of regrasParaCriar) {
        if (!nr?.nome || !nr?.regra) continue;
        try {
          const existingRule = rules.find((r) => namesSimilar(r.nome, nr.nome));
          if (existingRule) {
            await storage.updateQuoteRule(existingRule.id, {
              regra: nr.regra,
              ...(nr.descricao ? { descricao: nr.descricao } : {}),
            });
            createdRules.push(`${existingRule.nome} (regra atualizada)`);
            console.log(`[Special Quote] Regra atualizada: ${existingRule.nome}`);
          } else {
            await storage.createQuoteRule({
              nome: nr.nome,
              regra: nr.regra,
              descricao: nr.descricao || null,
              ativa: true,
            });
            createdRules.push(nr.nome);
            console.log(`[Special Quote] Regra cadastrada: ${nr.nome}`);
          }
        } catch (e) {
          console.error("[Special Quote] Failed to upsert quote rule:", nr.nome, e);
        }
      }

      res.json({ ...result, _createdMaterials: createdMaterials, _createdRules: createdRules });
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/special-quotes/pdf", async (req: Request, res: Response) => {
    try {
      const { titulo, nomeCliente, pedido, itens, total, observacoes, materiaisNaoEncontrados } = req.body;

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="orcamento-especial.pdf"`);
      doc.pipe(res);

      // Header
      doc.fontSize(18).font("Helvetica-Bold").text("ORÇAMENTO ESPECIAL", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(13).font("Helvetica-Bold").text(titulo || "Orçamento", { align: "center" });
      doc.moveDown(1);

      // Client info
      if (nomeCliente) {
        doc.fontSize(11).font("Helvetica").text(`Cliente: ${nomeCliente}`);
      }
      doc.fontSize(10).font("Helvetica").text(`Data: ${new Date().toLocaleDateString("pt-BR")}`);
      doc.moveDown(1);

      // Client request
      if (pedido) {
        doc.fontSize(10).font("Helvetica-Bold").text("Pedido do cliente:");
        doc.fontSize(10).font("Helvetica").text(pedido, { color: "#555" });
        doc.moveDown(1);
      }

      // Items table header
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);
      const tableY = doc.y;
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Descrição", 50, tableY, { width: 230 });
      doc.text("Qtd", 285, tableY, { width: 50, align: "right" });
      doc.text("Un", 340, tableY, { width: 40 });
      doc.text("Unit. (R$)", 385, tableY, { width: 70, align: "right" });
      doc.text("Total (R$)", 460, tableY, { width: 85, align: "right" });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      // Items
      doc.font("Helvetica").fontSize(9);
      for (const item of (itens || [])) {
        const y = doc.y;
        const notFound = item.encontrado === false;
        if (notFound) doc.fillColor("#cc4444"); else doc.fillColor("#111111");
        doc.text(item.descricao + (notFound ? " ⚠" : ""), 50, y, { width: 230 });
        doc.text(String(Number(item.quantidade).toFixed(2)), 285, y, { width: 50, align: "right" });
        doc.text(item.unidade || "", 340, y, { width: 40 });
        doc.text(`${Number(item.precoUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 385, y, { width: 70, align: "right" });
        doc.text(`${Number(item.precoTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 460, y, { width: 85, align: "right" });
        doc.fillColor("#111111");
        doc.moveDown(0.4);
      }

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Total
      doc.font("Helvetica-Bold").fontSize(12);
      doc.text(`VALOR TOTAL: R$ ${Number(total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, { align: "right" });
      doc.moveDown(1);

      // Observations
      if (observacoes) {
        doc.font("Helvetica-Bold").fontSize(9).text("Observações:");
        doc.font("Helvetica").fontSize(9).fillColor("#8B6914").text(observacoes);
        doc.fillColor("#111111");
        doc.moveDown(0.5);
      }

      // Materials not found
      if (materiaisNaoEncontrados && materiaisNaoEncontrados.length > 0) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#cc4444").text("Materiais não encontrados no cadastro:");
        doc.font("Helvetica").fontSize(9);
        for (const m of materiaisNaoEncontrados) {
          doc.text(`• ${m}`);
        }
        doc.fillColor("#111111");
      }

      doc.end();
    } catch (err) { handleError(res, err); }
  });

  // ─── VEHICLES ──────────────────────────────────────────────────────────────

  app.get("/api/vehicles", async (req: Request, res: Response) => {
    try {
      const { search, status } = req.query as Record<string, string>;
      const data = await storage.getVehicles({ search, status });
      res.json(data);
    } catch (err) { handleError(res, err); }
  });

  /** Dashboard de frota — deve ficar ANTES de /api/vehicles/:id para não colidir */
  app.get("/api/vehicles/dashboard", async (_req: Request, res: Response) => {
    try {
      const [allVehicles, openIssues] = await Promise.all([
        storage.getVehicles(),
        storage.getIssueReports({ status: "aberto" }),
      ]);

      const vehiclesWithStatus = await Promise.all(
        allVehicles.map(async (v) => {
          const items = await storage.getMaintenanceItems(v.id);
          const kmAtual = v.kmAtual ? Number(v.kmAtual) : null;
          const statuses = items.map((i) => calcMaintenanceItemStatus(i, kmAtual));
          const hasVermelho = statuses.includes("vermelho");
          const hasAmarelo = statuses.includes("amarelo");
          const hasOcorrencia = v.ocorrenciaAberta || openIssues.some((o) => o.vehicleId === v.id);
          return {
            ...v,
            manutencaoStatus: hasVermelho ? "vermelho" : hasAmarelo ? "amarelo" : "verde",
            hasOcorrencia,
            countItens: items.length,
            countVermelho: statuses.filter((s) => s === "vermelho").length,
            countAmarelo: statuses.filter((s) => s === "amarelo").length,
          };
        })
      );

      res.json({
        total: allVehicles.length,
        ativos: allVehicles.filter((v) => v.status === "ativo").length,
        comManutencaoVencida: vehiclesWithStatus.filter((v) => v.manutencaoStatus === "vermelho").length,
        comManutencaoProxima: vehiclesWithStatus.filter((v) => v.manutencaoStatus === "amarelo").length,
        comOcorrencia: vehiclesWithStatus.filter((v) => v.hasOcorrencia).length,
        veiculos: vehiclesWithStatus.sort((a, b) => {
          const order = { vermelho: 0, amarelo: 1, verde: 2 };
          return order[a.manutencaoStatus as keyof typeof order] - order[b.manutencaoStatus as keyof typeof order];
        }),
      });
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const vehicle = await storage.getVehicle(getParam(req, "id"));
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });
      res.json(vehicle);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/vehicles", async (req: Request, res: Response) => {
    try {
      const body = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(body);
      res.status(201).json(vehicle);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/vehicles/:id", async (req: Request, res: Response) => {
    try {
      const vehicle = await storage.updateVehicle(getParam(req, "id"), req.body);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });
      res.json(vehicle);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/vehicles/:id/resolver-ocorrencia", async (req: Request, res: Response) => {
    try {
      const vehicle = await storage.updateVehicle(getParam(req, "id"), { ocorrenciaAberta: false } as any);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });
      res.json(vehicle);
    } catch (err) { handleError(res, err); }
  });

  // ─── VEHICLE EXITS ──────────────────────────────────────────────────────────

  app.get("/api/vehicle-exits", async (req: Request, res: Response) => {
    try {
      const { vehicleId, driverId, status } = req.query as Record<string, string>;
      const data = await storage.getVehicleExits({ vehicleId, driverId, status });
      res.json(data);
    } catch (err) { handleError(res, err); }
  });

  app.get("/api/vehicle-exits/:id", async (req: Request, res: Response) => {
    try {
      const exit = await storage.getVehicleExit(getParam(req, "id"));
      if (!exit) return res.status(404).json({ message: "Saída não encontrada" });
      res.json(exit);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/vehicle-exits", async (req: Request, res: Response) => {
    try {
      const body = insertVehicleExitSchema.parse(req.body);

      // Business rules
      const vehicle = await storage.getVehicle(body.vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });
      if (vehicle.status === "inativo") return res.status(400).json({ message: "Veículo inativo não pode sair" });

      const driver = await storage.getSeller(body.driverId);
      if (driver && !driver.autorizadoDirigir) {
        // Return a warning but still allow (with flag)
        const exit = await storage.createVehicleExit(body as any);
        return res.status(201).json({ ...exit, _aviso: "Motorista não está marcado como autorizado a dirigir" });
      }

      // Require motivo if no orderId
      if (!body.orderId && !body.motivoSaida) {
        return res.status(400).json({ message: "Informe o motivo da saída ou vincule uma Ordem de Serviço" });
      }

      const exit = await storage.createVehicleExit(body as any);
      res.status(201).json(exit);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/vehicle-exits/:id", async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      let data = { ...req.body };

      // Convert timestamp strings to Date objects for Drizzle
      if (data.dataHoraRetorno && typeof data.dataHoraRetorno === "string") {
        data.dataHoraRetorno = new Date(data.dataHoraRetorno);
      }
      if (data.dataHoraSaida && typeof data.dataHoraSaida === "string") {
        data.dataHoraSaida = new Date(data.dataHoraSaida);
      }

      // Auto-calculate km percorridos on return
      if (data.kmFinal != null && data.kmInicial != null) {
        data.kmPercorridos = String(Number(data.kmFinal) - Number(data.kmInicial));
      } else if (data.kmFinal != null) {
        const existing = await storage.getVehicleExit(id);
        if (existing) {
          data.kmPercorridos = String(Number(data.kmFinal) - Number(existing.kmInicial));
        }
      }

      // Mark as finalizada when returning
      if (data.dataHoraRetorno && !data.status) data.status = "finalizada";

      // Update vehicle km and occurrence flag when finalizing
      if (data.kmFinal && data.status === "finalizada") {
        const existing = await storage.getVehicleExit(id);
        if (existing) {
          const vehicleUpdate: Record<string, unknown> = { kmAtual: String(data.kmFinal) };
          if (data.observacoesRetorno && String(data.observacoesRetorno).trim()) {
            vehicleUpdate.ocorrenciaAberta = true;
          }
          await storage.updateVehicle(existing.vehicleId, vehicleUpdate as any);
        }
      }

      const exit = await storage.updateVehicleExit(id, data);
      if (!exit) return res.status(404).json({ message: "Saída não encontrada" });
      res.json(exit);
    } catch (err) { handleError(res, err); }
  });

  // ─── VEHICLE MAINTENANCE ITEMS ──────────────────────────────────────────────

  /** GET /api/vehicles/:id/maintenance-items — lista itens com status calculado */
  app.get("/api/vehicles/:id/maintenance-items", async (req: Request, res: Response) => {
    try {
      const vehicleId = getParam(req, "id");
      const vehicle = await storage.getVehicle(vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });
      const items = await storage.getMaintenanceItems(vehicleId);
      const kmAtual = vehicle.kmAtual ? Number(vehicle.kmAtual) : null;
      const itemsWithStatus = items.map((item) => ({
        ...item,
        statusCalculado: calcMaintenanceItemStatus(item, kmAtual),
      }));
      res.json(itemsWithStatus);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/vehicles/:id/maintenance-items", async (req: Request, res: Response) => {
    try {
      const vehicleId = getParam(req, "id");
      const vehicle = await storage.getVehicle(vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });
      const body = insertVehicleMaintenanceItemSchema.parse({ ...req.body, vehicleId });
      const item = await storage.createMaintenanceItem(body);
      res.status(201).json(item);
    } catch (err) { handleError(res, err); }
  });

  /** Importar plano base (cria itens padrão para o veículo) */
  app.post("/api/vehicles/:id/maintenance-items/import-base", async (req: Request, res: Response) => {
    try {
      const vehicleId = getParam(req, "id");
      const vehicle = await storage.getVehicle(vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });

      const basePlan = [
        { nome: "Troca de óleo do motor",     periodicidadeKm: "10000", periodicidadeMeses: 12 },
        { nome: "Filtro de óleo",             periodicidadeKm: "10000", periodicidadeMeses: 12 },
        { nome: "Filtro de ar",               periodicidadeKm: "20000", periodicidadeMeses: 24 },
        { nome: "Filtro de combustível",      periodicidadeKm: "30000", periodicidadeMeses: 24 },
        { nome: "Pastilhas de freio",         periodicidadeKm: "30000", periodicidadeMeses: null },
        { nome: "Discos de freio",            periodicidadeKm: "60000", periodicidadeMeses: null },
        { nome: "Correia dentada",            periodicidadeKm: "60000", periodicidadeMeses: 48 },
        { nome: "Pneus",                      periodicidadeKm: "40000", periodicidadeMeses: 48 },
        { nome: "Alinhamento e balanceamento",periodicidadeKm: "10000", periodicidadeMeses: 12 },
        { nome: "Bateria",                    periodicidadeKm: null,    periodicidadeMeses: 36 },
        { nome: "Fluido de freio",            periodicidadeKm: "40000", periodicidadeMeses: 24 },
        { nome: "Fluido de arrefecimento",    periodicidadeKm: "40000", periodicidadeMeses: 24 },
        { nome: "Suspensão",                  periodicidadeKm: "50000", periodicidadeMeses: null },
        { nome: "Revisão geral",              periodicidadeKm: "20000", periodicidadeMeses: 12 },
      ];

      const existing = await storage.getMaintenanceItems(vehicleId);
      const existingNames = new Set(existing.map((i) => i.nome.toLowerCase()));
      const toCreate = basePlan.filter((p) => !existingNames.has(p.nome.toLowerCase()));

      const created = await Promise.all(
        toCreate.map((p) =>
          storage.createMaintenanceItem({
            vehicleId,
            nome: p.nome,
            periodicidadeKm: p.periodicidadeKm ?? null,
            periodicidadeMeses: p.periodicidadeMeses ?? null,
            alertaAmareloKm: "1000",
            alertaAmareloDias: 30,
            fonteTabela: "Plano base interno",
          } as any)
        )
      );
      res.status(201).json({ created: created.length, skipped: toCreate.length - created.length });
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/maintenance-items/:id", async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const body = req.body;
      // Convert date strings to Date objects
      if (body.ultimaManutencaoData && typeof body.ultimaManutencaoData === "string")
        body.ultimaManutencaoData = new Date(body.ultimaManutencaoData);
      if (body.proximaManutencaoData && typeof body.proximaManutencaoData === "string")
        body.proximaManutencaoData = new Date(body.proximaManutencaoData);
      const item = await storage.updateMaintenanceItem(id, body);
      if (!item) return res.status(404).json({ message: "Item não encontrado" });
      res.json(item);
    } catch (err) { handleError(res, err); }
  });

  app.delete("/api/maintenance-items/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteMaintenanceItem(getParam(req, "id"));
      res.status(204).send();
    } catch (err) { handleError(res, err); }
  });

  // ─── VEHICLE MAINTENANCE HISTORY ────────────────────────────────────────────

  app.get("/api/vehicles/:id/maintenance-history", async (req: Request, res: Response) => {
    try {
      const vehicleId = getParam(req, "id");
      const { itemId } = req.query as Record<string, string>;
      const history = await storage.getMaintenanceHistory({ vehicleId, itemId });
      res.json(history);
    } catch (err) { handleError(res, err); }
  });

  /** Registrar manutenção realizada — atualiza o item pai automaticamente */
  app.post("/api/vehicles/:id/maintenance-history", async (req: Request, res: Response) => {
    try {
      const vehicleId = getParam(req, "id");
      const vehicle = await storage.getVehicle(vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });

      const body = insertVehicleMaintenanceHistorySchema.parse({ ...req.body, vehicleId });
      const entry = await storage.createMaintenanceHistory(body);

      // Atualizar o item de manutenção pai se fornecido
      if (body.itemId) {
        const item = await storage.getMaintenanceItem(body.itemId);
        if (item) {
          const dataRealizada = new Date(body.data);
          const kmRealizado = body.kmNoMomento ? Number(body.kmNoMomento) : null;

          const updates: Record<string, unknown> = {
            ultimaManutencaoData: dataRealizada,
          };
          if (kmRealizado !== null) updates.ultimaManutencaoKm = String(kmRealizado);

          // Recalcular próxima manutenção por data
          if (item.periodicidadeMeses) {
            const proxData = new Date(dataRealizada);
            proxData.setMonth(proxData.getMonth() + item.periodicidadeMeses);
            updates.proximaManutencaoData = proxData;
          }
          // Recalcular próxima manutenção por KM
          if (item.periodicidadeKm && kmRealizado !== null) {
            updates.proximaManutencaoKm = String(kmRealizado + Number(item.periodicidadeKm));
          }

          await storage.updateMaintenanceItem(body.itemId, updates as any);
        }
      }

      // Atualizar KM atual do veículo se informado
      if (body.kmNoMomento) {
        await storage.updateVehicle(vehicleId, { kmAtual: String(body.kmNoMomento) } as any);
      }

      res.status(201).json(entry);
    } catch (err) { handleError(res, err); }
  });

  // ─── VEHICLE ISSUE REPORTS ──────────────────────────────────────────────────

  app.get("/api/vehicles/:id/issue-reports", async (req: Request, res: Response) => {
    try {
      const vehicleId = getParam(req, "id");
      const { status } = req.query as Record<string, string>;
      const reports = await storage.getIssueReports({ vehicleId, status });
      res.json(reports);
    } catch (err) { handleError(res, err); }
  });

  app.post("/api/vehicles/:id/issue-reports", async (req: Request, res: Response) => {
    try {
      const vehicleId = getParam(req, "id");
      const vehicle = await storage.getVehicle(vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });
      const body = insertVehicleIssueReportSchema.parse({ ...req.body, vehicleId });
      const report = await storage.createIssueReport(body);
      // Marca ocorrência aberta no veículo
      await storage.updateVehicle(vehicleId, { ocorrenciaAberta: true } as any);
      res.status(201).json(report);
    } catch (err) { handleError(res, err); }
  });

  app.patch("/api/issue-reports/:id", async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const data = { ...req.body };
      if (data.dataResolucao && typeof data.dataResolucao === "string")
        data.dataResolucao = new Date(data.dataResolucao);

      const report = await storage.updateIssueReport(id, data);
      if (!report) return res.status(404).json({ message: "Ocorrência não encontrada" });

      // Se resolvido, verificar se há outras ocorrências abertas no veículo
      if (data.status === "resolvido") {
        const openOnes = await storage.getIssueReports({ vehicleId: report.vehicleId, status: "aberto" });
        const inAnalysis = await storage.getIssueReports({ vehicleId: report.vehicleId, status: "em_analise" });
        if (openOnes.length === 0 && inAnalysis.length === 0) {
          await storage.updateVehicle(report.vehicleId, { ocorrenciaAberta: false } as any);
        }
      }

      res.json(report);
    } catch (err) { handleError(res, err); }
  });

  // ─── MAINTENANCE SUMMARY (status lights) ───────────────────────────────────

  app.get("/api/maintenance/summary", async (_req: Request, res: Response) => {
    try {
      const summary = await storage.getMaintenanceSummary();
      // Also check open occurrences
      const openIssues = await storage.getIssueReports({ status: "aberto" });
      const analysisIssues = await storage.getIssueReports({ status: "em_analise" });
      res.json({
        ...summary,
        hasOpenIssues: openIssues.length > 0 || analysisIssues.length > 0,
        countOpenIssues: openIssues.length + analysisIssues.length,
      });
    } catch (err) { handleError(res, err); }
  });

  // ─── MAINTENANCE TEMPLATE RESOLVER ──────────────────────────────────────────

  // Importar o resolver (lazy para não atrasar startup)
  const {
    resolveMaintenancePlan,
    applyTemplateToVehicle,
    importTemplateFromManualText,
    createDraftTemplate,
  } = await import("./maintenance-resolver");

  /** Buscar / gerar plano de manutenção para um veículo via IA */
  app.post("/api/vehicles/:id/search-maintenance-plan", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });

      const result = await resolveMaintenancePlan(vehicle);
      return res.json(result);
    } catch (err) { handleError(res, err); }
  });

  /** Gerar plano a partir de texto colado manualmente */
  app.post("/api/vehicles/:id/search-maintenance-plan/manual", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: "text é obrigatório" });

      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });

      const { items, rawResult } = await importTemplateFromManualText(vehicle, text);

      const template = await createDraftTemplate({
        vehicle,
        items,
        sourceType: "manual",
        sourceTitle: `Plano manual — ${vehicle.marca} ${vehicle.modelo}`,
        sourceNotes: "Criado a partir de texto colado pelo usuário",
        rawResult,
      });

      return res.json({
        found: true,
        template,
        items,
        sourceType: "manual",
        sourceTitle: template.sourceTitle,
        searchQuery: `${vehicle.marca} ${vehicle.modelo}`,
      });
    } catch (err) { handleError(res, err); }
  });

  /** Listar todos os templates (opcionalmente filtrados) */
  app.get("/api/maintenance-templates", async (req, res) => {
    try {
      const { status } = req.query;
      const templates = await storage.getMaintenanceTemplates(
        status ? { approvalStatus: String(status) } : undefined
      );
      return res.json(templates);
    } catch (err) { handleError(res, err); }
  });

  /** Obter um template específico */
  app.get("/api/maintenance-templates/:id", async (req, res) => {
    try {
      const tmpl = await storage.getMaintenanceTemplate(req.params.id);
      if (!tmpl) return res.status(404).json({ message: "Template não encontrado" });
      return res.json(tmpl);
    } catch (err) { handleError(res, err); }
  });

  /** Atualizar template (editar itens, aprovar, rejeitar) */
  app.patch("/api/maintenance-templates/:id", async (req, res) => {
    try {
      const data = req.body;
      // Se approvingStatus='aprovado', registrar quando
      if (data.approvalStatus === "aprovado" && !data.approvedAt) {
        data.approvedAt = new Date();
      }
      // items pode vir como array ou string
      if (Array.isArray(data.items)) {
        data.items = JSON.stringify(data.items);
      }
      const tmpl = await storage.updateMaintenanceTemplate(req.params.id, data);
      if (!tmpl) return res.status(404).json({ message: "Template não encontrado" });
      return res.json(tmpl);
    } catch (err) { handleError(res, err); }
  });

  /** Aplicar template aprovado ao veículo — copia itens para vehicle_maintenance_items */
  app.post("/api/vehicles/:vehicleId/apply-template/:templateId", async (req, res) => {
    try {
      const { vehicleId, templateId } = req.params;
      const vehicle = await storage.getVehicle(vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Veículo não encontrado" });

      const template = await storage.getMaintenanceTemplate(templateId);
      if (!template) return res.status(404).json({ message: "Template não encontrado" });

      if (template.approvalStatus !== "aprovado") {
        return res.status(400).json({ message: "Apenas templates aprovados podem ser aplicados" });
      }

      const result = await applyTemplateToVehicle(template, vehicleId);
      return res.json({ success: true, ...result });
    } catch (err) { handleError(res, err); }
  });

  /** Histórico de buscas/importações de um veículo */
  app.get("/api/vehicles/:id/maintenance-import-logs", async (req, res) => {
    try {
      const logs = await storage.getImportLogs(req.params.id);
      return res.json(logs);
    } catch (err) { handleError(res, err); }
  });

  return httpServer;
}
