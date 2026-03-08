import { db } from "./db";
import { eq, and, ilike, or, isNull, desc, asc, sql, gte, lte } from "drizzle-orm";
import {
  users,
  clients,
  clientContacts,
  sellers,
  sellerBankAccounts,
  clientSellerLinks,
  crmInteractions,
  crmTasks,
  crmTags,
  activityTimeline,
  companyLookupLogs,
  automationJobs,
  paymentTerms,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Contact,
  type InsertContact,
  type Seller,
  type InsertSeller,
  type SellerBankAccount,
  type InsertSellerBankAccount,
  type ClientSellerLink,
  type InsertClientSellerLink,
  type Interaction,
  type InsertInteraction,
  type Task,
  type InsertTask,
  type Tag,
  type InsertTag,
  type Timeline,
  type InsertTimeline,
  type DashboardStats,
  type PaymentTerm,
  type InsertPaymentTerm,
} from "@shared/schema";
import { addDays } from "date-fns";

// ─── INTERFACE ────────────────────────────────────────────────────────────────

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clients
  getClients(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDir?: string;
  }): Promise<{ data: Client[]; total: number }>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  softDeleteClient(id: string): Promise<void>;

  // Contacts
  getContacts(clientId: string): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, data: Partial<InsertContact>): Promise<Contact | undefined>;
  softDeleteContact(id: string): Promise<void>;

  // Sellers
  getSellers(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Seller[]; total: number }>;
  getSeller(id: string): Promise<Seller | undefined>;
  createSeller(seller: InsertSeller): Promise<Seller>;
  updateSeller(id: string, data: Partial<InsertSeller>): Promise<Seller | undefined>;
  softDeleteSeller(id: string): Promise<void>;

  // Seller Bank Accounts
  getSellerBankAccounts(sellerId: string): Promise<SellerBankAccount[]>;
  createSellerBankAccount(account: InsertSellerBankAccount): Promise<SellerBankAccount>;
  updateSellerBankAccount(id: string, data: Partial<InsertSellerBankAccount>): Promise<SellerBankAccount | undefined>;
  deleteSellerBankAccount(id: string): Promise<void>;

  // Client-Seller links
  getClientSellers(clientId: string): Promise<(ClientSellerLink & { seller: Seller })[]>;
  linkClientSeller(link: InsertClientSellerLink): Promise<ClientSellerLink>;
  unlinkClientSeller(clientId: string, sellerId: string): Promise<void>;

  // CRM Interactions
  getInteractions(clientId: string): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  deleteInteraction(id: string): Promise<void>;

  // CRM Tasks
  getTasks(params?: {
    clientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Task[]; total: number }>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;

  // Tags
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;

  // Timeline
  getTimeline(clientId: string, limit?: number): Promise<Timeline[]>;
  addTimelineEvent(event: InsertTimeline): Promise<Timeline>;

  // CNPJ lookup log
  logCnpjLookup(data: {
    cnpj: string;
    clientId?: string;
    provider: string;
    sucesso: boolean;
    rawResponse?: unknown;
    errorMessage?: string;
  }): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Payment Terms
  getPaymentTerms(): Promise<PaymentTerm[]>;
  createPaymentTerm(term: InsertPaymentTerm): Promise<PaymentTerm>;
  updatePaymentTerm(id: string, data: Partial<InsertPaymentTerm>): Promise<PaymentTerm | undefined>;
  deletePaymentTerm(id: string): Promise<void>;
}

// ─── DATABASE STORAGE ─────────────────────────────────────────────────────────

export class DatabaseStorage implements IStorage {
  // ─── USERS ─────────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ─── CLIENTS ───────────────────────────────────────────────────────────────

  async getClients(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    orderBy?: string;
    orderDir?: string;
  } = {}): Promise<{ data: Client[]; total: number }> {
    const { search, status, page = 1, limit = 25 } = params;
    const offset = (page - 1) * limit;

    const conditions = [isNull(clients.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(clients.razaoSocial, `%${search}%`),
          ilike(clients.nomeFantasia, `%${search}%`),
          ilike(clients.cnpj, `%${search}%`),
          ilike(clients.telefone, `%${search}%`),
          ilike(clients.cidade, `%${search}%`),
          ilike(clients.email, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(clients.status, status as any));
    }

    const where = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(where);

    const data = await db
      .select()
      .from(clients)
      .where(where)
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(countResult.count) };
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), isNull(clients.deletedAt)));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [result] = await db.insert(clients).values(client).returning();
    return result;
  }

  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [result] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return result;
  }

  async softDeleteClient(id: string): Promise<void> {
    await db
      .update(clients)
      .set({ deletedAt: new Date() })
      .where(eq(clients.id, id));
  }

  // ─── CONTACTS ──────────────────────────────────────────────────────────────

  async getContacts(clientId: string): Promise<Contact[]> {
    return db
      .select()
      .from(clientContacts)
      .where(
        and(
          eq(clientContacts.clientId, clientId),
          isNull(clientContacts.deletedAt)
        )
      )
      .orderBy(desc(clientContacts.contatoPrincipal), asc(clientContacts.nomeCompleto));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db
      .select()
      .from(clientContacts)
      .where(eq(clientContacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [result] = await db.insert(clientContacts).values(contact).returning();
    return result;
  }

  async updateContact(id: string, data: Partial<InsertContact>): Promise<Contact | undefined> {
    const [result] = await db
      .update(clientContacts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clientContacts.id, id))
      .returning();
    return result;
  }

  async softDeleteContact(id: string): Promise<void> {
    await db
      .update(clientContacts)
      .set({ deletedAt: new Date() })
      .where(eq(clientContacts.id, id));
  }

  // ─── SELLERS ───────────────────────────────────────────────────────────────

  async getSellers(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Seller[]; total: number }> {
    const { search, status, page = 1, limit = 25 } = params;
    const offset = (page - 1) * limit;
    const conditions = [isNull(sellers.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(sellers.nomeCompleto, `%${search}%`),
          ilike(sellers.email, `%${search}%`),
          ilike(sellers.cpf, `%${search}%`)
        )!
      );
    }

    if (status) {
      conditions.push(eq(sellers.status, status as any));
    }

    const where = and(...conditions);
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sellers)
      .where(where);

    const data = await db
      .select()
      .from(sellers)
      .where(where)
      .orderBy(asc(sellers.nomeCompleto))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(countResult.count) };
  }

  async getSeller(id: string): Promise<Seller | undefined> {
    const [seller] = await db
      .select()
      .from(sellers)
      .where(and(eq(sellers.id, id), isNull(sellers.deletedAt)));
    return seller;
  }

  async createSeller(seller: InsertSeller): Promise<Seller> {
    const [result] = await db.insert(sellers).values(seller).returning();
    return result;
  }

  async updateSeller(id: string, data: Partial<InsertSeller>): Promise<Seller | undefined> {
    const [result] = await db
      .update(sellers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sellers.id, id))
      .returning();
    return result;
  }

  async softDeleteSeller(id: string): Promise<void> {
    await db
      .update(sellers)
      .set({ deletedAt: new Date() })
      .where(eq(sellers.id, id));
  }

  // ─── SELLER BANK ACCOUNTS ──────────────────────────────────────────────────

  async getSellerBankAccounts(sellerId: string): Promise<SellerBankAccount[]> {
    return db
      .select()
      .from(sellerBankAccounts)
      .where(eq(sellerBankAccounts.sellerId, sellerId));
  }

  async createSellerBankAccount(account: InsertSellerBankAccount): Promise<SellerBankAccount> {
    const [result] = await db.insert(sellerBankAccounts).values(account).returning();
    return result;
  }

  async updateSellerBankAccount(id: string, data: Partial<InsertSellerBankAccount>): Promise<SellerBankAccount | undefined> {
    const [result] = await db
      .update(sellerBankAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sellerBankAccounts.id, id))
      .returning();
    return result;
  }

  async deleteSellerBankAccount(id: string): Promise<void> {
    await db.delete(sellerBankAccounts).where(eq(sellerBankAccounts.id, id));
  }

  // ─── CLIENT-SELLER LINKS ───────────────────────────────────────────────────

  async getClientSellers(clientId: string): Promise<(ClientSellerLink & { seller: Seller })[]> {
    const result = await db
      .select()
      .from(clientSellerLinks)
      .innerJoin(sellers, eq(clientSellerLinks.sellerId, sellers.id))
      .where(eq(clientSellerLinks.clientId, clientId));

    return result.map((r) => ({ ...r.client_seller_links, seller: r.sellers }));
  }

  async linkClientSeller(link: InsertClientSellerLink): Promise<ClientSellerLink> {
    const [result] = await db.insert(clientSellerLinks).values(link).returning();
    return result;
  }

  async unlinkClientSeller(clientId: string, sellerId: string): Promise<void> {
    await db
      .delete(clientSellerLinks)
      .where(
        and(
          eq(clientSellerLinks.clientId, clientId),
          eq(clientSellerLinks.sellerId, sellerId)
        )
      );
  }

  // ─── CRM INTERACTIONS ──────────────────────────────────────────────────────

  async getInteractions(clientId: string): Promise<Interaction[]> {
    return db
      .select()
      .from(crmInteractions)
      .where(eq(crmInteractions.clientId, clientId))
      .orderBy(desc(crmInteractions.dataInteracao));
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [result] = await db.insert(crmInteractions).values(interaction).returning();
    return result;
  }

  async deleteInteraction(id: string): Promise<void> {
    await db.delete(crmInteractions).where(eq(crmInteractions.id, id));
  }

  // ─── CRM TASKS ─────────────────────────────────────────────────────────────

  async getTasks(params: {
    clientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Task[]; total: number }> {
    const { clientId, status, page = 1, limit = 25 } = params;
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (clientId) conditions.push(eq(crmTasks.clientId, clientId));
    if (status) conditions.push(eq(crmTasks.status, status as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(crmTasks)
      .where(where);

    const data = await db
      .select()
      .from(crmTasks)
      .where(where)
      .orderBy(asc(crmTasks.dataVencimento), desc(crmTasks.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(countResult.count) };
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(crmTasks).where(eq(crmTasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [result] = await db.insert(crmTasks).values(task).returning();
    return result;
  }

  async updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [result] = await db
      .update(crmTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crmTasks.id, id))
      .returning();
    return result;
  }

  // ─── TAGS ──────────────────────────────────────────────────────────────────

  async getTags(): Promise<Tag[]> {
    return db.select().from(crmTags).orderBy(asc(crmTags.nome));
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [result] = await db.insert(crmTags).values(tag).returning();
    return result;
  }

  // ─── TIMELINE ──────────────────────────────────────────────────────────────

  async getTimeline(clientId: string, limit = 50): Promise<Timeline[]> {
    return db
      .select()
      .from(activityTimeline)
      .where(eq(activityTimeline.clientId, clientId))
      .orderBy(desc(activityTimeline.createdAt))
      .limit(limit);
  }

  async addTimelineEvent(event: InsertTimeline): Promise<Timeline> {
    const [result] = await db.insert(activityTimeline).values(event).returning();
    return result;
  }

  // ─── CNPJ LOG ──────────────────────────────────────────────────────────────

  async logCnpjLookup(data: {
    cnpj: string;
    clientId?: string;
    provider: string;
    sucesso: boolean;
    rawResponse?: unknown;
    errorMessage?: string;
  }): Promise<void> {
    await db.insert(companyLookupLogs).values({
      cnpj: data.cnpj,
      clientId: data.clientId,
      provider: data.provider,
      sucesso: data.sucesso,
      rawResponse: data.rawResponse as any,
      errorMessage: data.errorMessage,
    });
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const [totalClientesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(and(isNull(clients.deletedAt), eq(clients.status, "ativo")));

    const [totalProspectsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(and(isNull(clients.deletedAt), eq(clients.status, "prospect")));

    const [totalContatosResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clientContacts)
      .where(isNull(clientContacts.deletedAt));

    const [totalVendedoresResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sellers)
      .where(and(isNull(sellers.deletedAt), eq(sellers.status, "ativo")));

    const [tarefasPendentesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(crmTasks)
      .where(eq(crmTasks.status, "pendente"));

    // Aniversários próximos (30 dias)
    const hoje = new Date();
    const em30dias = addDays(hoje, 30);
    const mesHoje = hoje.getMonth() + 1;
    const diaHoje = hoje.getDate();
    const mes30 = em30dias.getMonth() + 1;
    const dia30 = em30dias.getDate();

    const todosContatos = await db
      .select()
      .from(clientContacts)
      .where(
        and(
          isNull(clientContacts.deletedAt),
          sql`${clientContacts.dataNascimento} IS NOT NULL`
        )
      );

    const aniversariosProximos = todosContatos
      .filter((c) => {
        if (!c.dataNascimento) return false;
        const dt = new Date(c.dataNascimento);
        const mes = dt.getMonth() + 1;
        const dia = dt.getDate();
        if (mes > mesHoje || (mes === mesHoje && dia >= diaHoje)) {
          return mes < mes30 || (mes === mes30 && dia <= dia30);
        }
        return false;
      })
      .slice(0, 10);

    const ultimasAtividades = await db
      .select()
      .from(activityTimeline)
      .orderBy(desc(activityTimeline.createdAt))
      .limit(10);

    return {
      totalClientes: Number(totalClientesResult.count),
      totalProspects: Number(totalProspectsResult.count),
      totalContatos: Number(totalContatosResult.count),
      totalVendedores: Number(totalVendedoresResult.count),
      tarefasPendentes: Number(tarefasPendentesResult.count),
      aniversariosProximos,
      ultimasAtividades,
    };
  }

  // ─── PAYMENT TERMS ─────────────────────────────────────────────────────────

  async getPaymentTerms(): Promise<PaymentTerm[]> {
    return db.select().from(paymentTerms).orderBy(asc(paymentTerms.nome));
  }

  async createPaymentTerm(term: InsertPaymentTerm): Promise<PaymentTerm> {
    const [result] = await db.insert(paymentTerms).values(term).returning();
    return result;
  }

  async updatePaymentTerm(id: string, data: Partial<InsertPaymentTerm>): Promise<PaymentTerm | undefined> {
    const [result] = await db
      .update(paymentTerms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentTerms.id, id))
      .returning();
    return result;
  }

  async deletePaymentTerm(id: string): Promise<void> {
    await db.delete(paymentTerms).where(eq(paymentTerms.id, id));
  }
}

export const storage = new DatabaseStorage();
