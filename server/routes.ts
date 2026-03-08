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
} from "@shared/schema";

function handleError(res: Response, err: unknown) {
  console.error("[API Error]", err);
  const message =
    err instanceof Error ? err.message : "Erro interno do servidor";
  res.status(500).json({ error: message });
}

function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { data: T } | { error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
    };
  }
  return { data: result.data };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── CNPJ LOOKUP ───────────────────────────────────────────────────────────

  app.get("/api/cnpj/:cnpj", async (req: Request, res: Response) => {
    try {
      const { cnpj } = req.params;
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
      const { search, status, page, limit, orderBy, orderDir } = req.query;
      const result = await storage.getClients({
        search: search as string,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
        orderBy: orderBy as string,
        orderDir: orderDir as string,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const client = await storage.getClient(req.params.id);
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

      const client = await storage.createClient(validated.data);

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

      const client = await storage.updateClient(req.params.id, validated.data);
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
      await storage.softDeleteClient(req.params.id);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── CONTACTS ──────────────────────────────────────────────────────────────

  app.get("/api/clients/:clientId/contacts", async (req: Request, res: Response) => {
    try {
      const contacts = await storage.getContacts(req.params.clientId);
      res.json(contacts);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/clients/:clientId/contacts", async (req: Request, res: Response) => {
    try {
      const body = { ...req.body, clientId: req.params.clientId };
      const validated = validateBody(insertContactSchema, body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const contact = await storage.createContact(validated.data);

      await storage.addTimelineEvent({
        clientId: req.params.clientId,
        eventType: "contato_adicionado",
        titulo: "Contato adicionado",
        descricao: `${contact.nomeCompleto} foi adicionado como contato`,
        metadata: { cargo: contact.cargo },
      });

      if (contact.instagramHandle && contact.followDesired) {
        // Queue automation job
      }

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

      const contact = await storage.updateContact(req.params.id, validated.data);
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
      const contact = await storage.getContact(req.params.id);
      if (contact?.clientId) {
        await storage.addTimelineEvent({
          clientId: contact.clientId,
          eventType: "contato_removido",
          titulo: "Contato removido",
          descricao: `${contact.nomeCompleto} foi removido`,
        });
      }
      await storage.softDeleteContact(req.params.id);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── SELLERS ───────────────────────────────────────────────────────────────

  app.get("/api/sellers", async (req: Request, res: Response) => {
    try {
      const { search, status, page, limit } = req.query;
      const result = await storage.getSellers({
        search: search as string,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
      });
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/sellers/:id", async (req: Request, res: Response) => {
    try {
      const seller = await storage.getSeller(req.params.id);
      if (!seller) return res.status(404).json({ error: "Vendedor não encontrado" });
      const bankAccounts = await storage.getSellerBankAccounts(req.params.id);
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

      const seller = await storage.updateSeller(req.params.id, validated.data);
      if (!seller) return res.status(404).json({ error: "Vendedor não encontrado" });
      res.json(seller);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/sellers/:id", async (req: Request, res: Response) => {
    try {
      await storage.softDeleteSeller(req.params.id);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── SELLER BANK ACCOUNTS ──────────────────────────────────────────────────

  app.post("/api/sellers/:sellerId/bank-accounts", async (req: Request, res: Response) => {
    try {
      const body = { ...req.body, sellerId: req.params.sellerId };
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

      const account = await storage.updateSellerBankAccount(req.params.id, validated.data);
      res.json(account);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/bank-accounts/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteSellerBankAccount(req.params.id);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── CLIENT-SELLER LINKS ───────────────────────────────────────────────────

  app.get("/api/clients/:clientId/sellers", async (req: Request, res: Response) => {
    try {
      const sellers = await storage.getClientSellers(req.params.clientId);
      res.json(sellers);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/clients/:clientId/sellers", async (req: Request, res: Response) => {
    try {
      const body = { ...req.body, clientId: req.params.clientId };
      const validated = validateBody(insertClientSellerLinkSchema, body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const link = await storage.linkClientSeller(validated.data);

      await storage.addTimelineEvent({
        clientId: req.params.clientId,
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
      await storage.unlinkClientSeller(req.params.clientId, req.params.sellerId);
      await storage.addTimelineEvent({
        clientId: req.params.clientId,
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
      const interactions = await storage.getInteractions(req.params.clientId);
      res.json(interactions);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/clients/:clientId/interactions", async (req: Request, res: Response) => {
    try {
      const body = { ...req.body, clientId: req.params.clientId };
      const validated = validateBody(insertInteractionSchema, body);
      if ("error" in validated)
        return res.status(400).json({ error: validated.error });

      const interaction = await storage.createInteraction(validated.data);

      await storage.updateClient(req.params.clientId, {
        dataUltimoContato: new Date(),
      });

      await storage.addTimelineEvent({
        clientId: req.params.clientId,
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
      await storage.deleteInteraction(req.params.id);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── CRM TASKS ─────────────────────────────────────────────────────────────

  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const { clientId, status, page, limit } = req.query;
      const result = await storage.getTasks({
        clientId: clientId as string,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 25,
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

      const task = await storage.createTask(validated.data);

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
        validated.data = { ...validated.data, dataConclusao: new Date() };
      }

      const task = await storage.updateTask(req.params.id, validated.data);
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
      const timeline = await storage.getTimeline(req.params.clientId);
      res.json(timeline);
    } catch (err) {
      handleError(res, err);
    }
  });

  return httpServer;
}
