import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { lookupCnpj, validateCnpj } from "./cnpj";
import { z } from "zod";
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
} from "@shared/schema";
import { generateProductSuggestion, suggestQuoteItem } from "./ai";

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

  return httpServer;
}
