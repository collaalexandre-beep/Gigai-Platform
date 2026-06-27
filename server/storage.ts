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
  paymentMethods,
  rawMaterials,
  products,
  productComponents,
  aiProductGenerations,
  companies,
  quotes,
  quoteItems,
  orders,
  orderItems,
  type Company,
  type InsertCompany,
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
  type PaymentMethod,
  type InsertPaymentMethod,
  type RawMaterial,
  type InsertRawMaterial,
  type Product,
  type InsertProduct,
  type ProductComponent,
  type InsertProductComponent,
  type AiProductGeneration,
  type InsertAiProductGeneration,
  type Quote,
  type InsertQuote,
  type QuoteItem,
  type InsertQuoteItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  whatsappSessions,
  whatsappMessages,
  type WhatsappSession,
  type WhatsappMessage,
  quoteRules,
  type QuoteRule,
  type InsertQuoteRule,
  vehicles,
  vehicleExits,
  type Vehicle,
  type InsertVehicle,
  type VehicleExit,
  type InsertVehicleExit,
  sellerDocuments,
  type SellerDocument,
  type InsertSellerDocument,
  waBotConfig,
  type WaBotConfig,
  type InsertWaBotConfig,
  purchaseRequests,
  type PurchaseRequest,
  type InsertPurchaseRequest,
  suppliers,
  type Supplier,
  type InsertSupplier,
  vehicleMaintenanceItems,
  vehicleMaintenanceHistory,
  vehicleIssueReports,
  vehicleMaintenanceTemplates,
  vehicleMaintenanceImportLogs,
  type VehicleMaintenanceItem,
  type InsertVehicleMaintenanceItem,
  type VehicleMaintenanceHistory,
  type InsertVehicleMaintenanceHistory,
  type VehicleIssueReport,
  type InsertVehicleIssueReport,
  type VehicleMaintenanceTemplate,
  type InsertVehicleMaintenanceTemplate,
  type VehicleMaintenanceImportLog,
  aiAgentConfig,
  aiAgentKnowledgeFiles,
  type AiAgentConfig,
  type InsertAiAgentConfig,
  type AiAgentKnowledgeFile,
  type InsertAiAgentKnowledgeFile,
} from "@shared/schema";
import { addDays } from "date-fns";

// ─── INTERFACE ────────────────────────────────────────────────────────────────

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

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
    funcao?: string;
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

  // Seller Documents
  getSellerDocuments(sellerId: string): Promise<SellerDocument[]>;
  createSellerDocument(doc: InsertSellerDocument): Promise<SellerDocument>;
  deleteSellerDocument(id: string): Promise<void>;

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

  // Payment Methods
  getPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;

  // Raw Materials
  getRawMaterials(params?: {
    search?: string;
    categoria?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: RawMaterial[]; total: number }>;
  getRawMaterial(id: string): Promise<RawMaterial | undefined>;
  createRawMaterial(data: InsertRawMaterial): Promise<RawMaterial>;
  updateRawMaterial(id: string, data: Partial<InsertRawMaterial>): Promise<RawMaterial | undefined>;
  deleteRawMaterial(id: string): Promise<void>;

  // Products
  getProducts(params?: {
    search?: string;
    categoria?: string;
    tipoCalculo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Product[]; total: number }>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Product Components
  getProductComponents(productId: string): Promise<ProductComponent[]>;
  setProductComponents(productId: string, components: InsertProductComponent[]): Promise<void>;

  // AI Product Generations
  createAiGeneration(data: InsertAiProductGeneration): Promise<AiProductGeneration>;
  getAiGenerations(): Promise<AiProductGeneration[]>;

  // Quotes
  getQuotes(params?: {
    clientId?: string;
    sellerId?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: (Quote & {
      client: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
      seller: { id: string; nomeCompleto: string } | null;
    })[];
    total: number;
  }>;
  getQuote(id: string): Promise<Quote | undefined>;
  createQuote(data: InsertQuote): Promise<Quote>;
  updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;
  getQuoteItems(quoteId: string): Promise<QuoteItem[]>;
  setQuoteItems(quoteId: string, items: InsertQuoteItem[]): Promise<void>;
  convertQuoteToOrder(quoteId: string): Promise<Order>;

  // Orders
  getOrders(params?: {
    clientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Order[]; total: number }>;
  getOrder(id: string): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // Companies
  getCompanies(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Company[]; total: number }>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(data: InsertCompany): Promise<Company>;
  updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined>;
  softDeleteCompany(id: string): Promise<void>;
  setDefaultCompany(id: string): Promise<Company | undefined>;
  getDefaultCompany(): Promise<Company | undefined>;

  // WhatsApp
  getWhatsappSession(from: string): Promise<WhatsappSession | undefined>;
  getWhatsappSessionById(id: string): Promise<WhatsappSession | undefined>;
  getWhatsappSessions(params?: { status?: string; page?: number; limit?: number }): Promise<{ data: WhatsappSession[]; total: number }>;
  createWhatsappSession(from: string): Promise<WhatsappSession>;
  updateWhatsappSession(id: string, data: Partial<WhatsappSession>): Promise<WhatsappSession | undefined>;
  getWhatsappMessages(sessionId: string): Promise<WhatsappMessage[]>;
  addWhatsappMessage(sessionId: string, direction: string, body: string, from?: string, to?: string): Promise<WhatsappMessage>;

  // Quote Rules
  listQuoteRules(): Promise<QuoteRule[]>;
  createQuoteRule(data: InsertQuoteRule): Promise<QuoteRule>;
  updateQuoteRule(id: string, data: Partial<InsertQuoteRule>): Promise<QuoteRule | undefined>;
  deleteQuoteRule(id: string): Promise<void>;

  // AI Agent Config
  getAiAgentConfig(): Promise<AiAgentConfig | undefined>;
  upsertAiAgentConfig(instrucoes: string): Promise<AiAgentConfig>;

  // AI Agent Knowledge Files
  listAiAgentKnowledgeFiles(): Promise<AiAgentKnowledgeFile[]>;
  createAiAgentKnowledgeFile(data: InsertAiAgentKnowledgeFile): Promise<AiAgentKnowledgeFile>;
  updateAiAgentKnowledgeFile(id: string, data: Partial<InsertAiAgentKnowledgeFile>): Promise<AiAgentKnowledgeFile | undefined>;
  deleteAiAgentKnowledgeFile(id: string): Promise<void>;

  // Vehicles
  getVehicles(params?: { search?: string; status?: string }): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  createVehicle(data: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  getSellerByWhatsappNumber(phone: string): Promise<Seller | undefined>;

  // Vehicle Exits
  getVehicleExits(params?: { vehicleId?: string; driverId?: string; status?: string }): Promise<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } })[]>;
  getVehicleExit(id: string): Promise<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } }) | undefined>;
  createVehicleExit(data: InsertVehicleExit): Promise<VehicleExit>;
  updateVehicleExit(id: string, data: Partial<InsertVehicleExit>): Promise<VehicleExit | undefined>;
  getOpenVehicleExitByDriver(driverId: string): Promise<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } }) | undefined>;
  getOpenVehicleExitByVehicle(vehicleId: string): Promise<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } }) | undefined>;

  // Maintenance Items
  getMaintenanceItems(vehicleId: string): Promise<VehicleMaintenanceItem[]>;
  getMaintenanceItem(id: string): Promise<VehicleMaintenanceItem | undefined>;
  createMaintenanceItem(data: InsertVehicleMaintenanceItem): Promise<VehicleMaintenanceItem>;
  updateMaintenanceItem(id: string, data: Partial<InsertVehicleMaintenanceItem>): Promise<VehicleMaintenanceItem | undefined>;
  deleteMaintenanceItem(id: string): Promise<void>;

  // Maintenance History
  getMaintenanceHistory(params: { vehicleId?: string; itemId?: string }): Promise<VehicleMaintenanceHistory[]>;
  createMaintenanceHistory(data: InsertVehicleMaintenanceHistory): Promise<VehicleMaintenanceHistory>;

  // Issue Reports
  getIssueReports(params?: { vehicleId?: string; status?: string }): Promise<(VehicleIssueReport & { reporterName?: string | null })[]>;
  getIssueReport(id: string): Promise<VehicleIssueReport | undefined>;
  createIssueReport(data: InsertVehicleIssueReport): Promise<VehicleIssueReport>;
  updateIssueReport(id: string, data: Partial<InsertVehicleIssueReport>): Promise<VehicleIssueReport | undefined>;

  // Maintenance Summary (for status lights)
  getMaintenanceSummary(): Promise<{ hasVermelho: boolean; hasAmarelo: boolean; countVermelho: number; countAmarelo: number }>;

  // Maintenance Templates
  getMaintenanceTemplates(params?: { approvalStatus?: string }): Promise<VehicleMaintenanceTemplate[]>;
  getMaintenanceTemplate(id: string): Promise<VehicleMaintenanceTemplate | undefined>;
  createMaintenanceTemplate(data: InsertVehicleMaintenanceTemplate): Promise<VehicleMaintenanceTemplate>;
  updateMaintenanceTemplate(id: string, data: Partial<InsertVehicleMaintenanceTemplate>): Promise<VehicleMaintenanceTemplate | undefined>;

  // Import Logs
  getImportLogs(vehicleId: string): Promise<VehicleMaintenanceImportLog[]>;

  // WaBotConfig
  getWaBotConfig(): Promise<WaBotConfig | undefined>;
  upsertWaBotConfig(data: Partial<InsertWaBotConfig>): Promise<WaBotConfig>;

  // Purchase Requests
  createPurchaseRequest(data: InsertPurchaseRequest): Promise<PurchaseRequest>;
  getPurchaseRequest(id: string): Promise<PurchaseRequest | undefined>;
  getPurchaseRequests(params?: {
    status?: string;
    tipoCompra?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PurchaseRequest[]; total: number }>;
  updatePurchaseRequest(id: string, data: Partial<PurchaseRequest>): Promise<PurchaseRequest>;

  // Suppliers
  getSuppliers(params?: {
    search?: string;
    ativo?: boolean;
    material?: string;
    aceitaCotacaoWhatsapp?: boolean;
    whatsappAutorizado?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Supplier[]; total: number }>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(data: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  toggleSupplierActive(id: string): Promise<Supplier | undefined>;
}

// ─── MAINTENANCE STATUS UTILITY ───────────────────────────────────────────────

/**
 * Calcula o status de cor de um item de manutenção com base nos campos de
 * próxima manutenção e no KM atual do veículo.
 * Vermelho = vencido | Amarelo = próximo do vencimento | Verde = OK
 */
export function calcMaintenanceItemStatus(
  item: VehicleMaintenanceItem,
  kmAtual: number | null
): "verde" | "amarelo" | "vermelho" {
  const now = Date.now();
  let worst: "verde" | "amarelo" | "vermelho" = "verde";

  // Verificação por KM
  if (item.proximaManutencaoKm !== null && item.proximaManutencaoKm !== undefined && kmAtual !== null) {
    const kmRestante = Number(item.proximaManutencaoKm) - kmAtual;
    const alerta = Number(item.alertaAmareloKm ?? 1000);
    if (kmRestante <= 0) return "vermelho";
    if (kmRestante <= alerta) worst = "amarelo";
  }

  // Verificação por data
  if (item.proximaManutencaoData) {
    const ms = new Date(item.proximaManutencaoData).getTime() - now;
    const dias = Math.floor(ms / 86400000);
    const alerta = item.alertaAmareloDias ?? 30;
    if (dias <= 0) return "vermelho";
    if (dias <= alerta) worst = "amarelo";
  }

  return worst;
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

  async listUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.createdAt));
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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
    funcao?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Seller[]; total: number }> {
    const { search, status, funcao, page = 1, limit = 25 } = params;
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

    if (funcao) {
      conditions.push(eq(sellers.funcao, funcao as any));
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

  // ─── SELLER DOCUMENTS ──────────────────────────────────────────────────────

  async getSellerDocuments(sellerId: string): Promise<SellerDocument[]> {
    return db
      .select()
      .from(sellerDocuments)
      .where(eq(sellerDocuments.sellerId, sellerId))
      .orderBy(desc(sellerDocuments.createdAt));
  }

  async createSellerDocument(doc: InsertSellerDocument): Promise<SellerDocument> {
    const [result] = await db.insert(sellerDocuments).values(doc).returning();
    return result;
  }

  async deleteSellerDocument(id: string): Promise<void> {
    await db.delete(sellerDocuments).where(eq(sellerDocuments.id, id));
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

  // ─── PAYMENT METHODS ─────────────────────────────────────────────────────────

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods).orderBy(asc(paymentMethods.nome));
  }

  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    const [result] = await db.insert(paymentMethods).values(method).returning();
    return result;
  }

  async updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const [result] = await db
      .update(paymentMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    return result;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  // ─── RAW MATERIALS ──────────────────────────────────────────────────────────

  async getRawMaterials(params: {
    search?: string;
    categoria?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: RawMaterial[]; total: number }> {
    const { search, categoria, page = 1, limit = 25 } = params;
    const offset = (page - 1) * limit;

    const conditions = [isNull(rawMaterials.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(rawMaterials.nome, `%${search}%`),
          ilike(rawMaterials.codigoInterno, `%${search}%`),
          ilike(rawMaterials.descricao, `%${search}%`)
        )!
      );
    }

    if (categoria) {
      conditions.push(eq(rawMaterials.categoria, categoria as any));
    }

    const where = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rawMaterials)
      .where(where);

    const data = await db
      .select()
      .from(rawMaterials)
      .where(where)
      .orderBy(asc(rawMaterials.nome))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(countResult.count) };
  }

  async getRawMaterial(id: string): Promise<RawMaterial | undefined> {
    const [result] = await db
      .select()
      .from(rawMaterials)
      .where(and(eq(rawMaterials.id, id), isNull(rawMaterials.deletedAt)));
    return result;
  }

  async createRawMaterial(data: InsertRawMaterial): Promise<RawMaterial> {
    const [result] = await db.insert(rawMaterials).values(data).returning();
    return result;
  }

  async updateRawMaterial(id: string, data: Partial<InsertRawMaterial>): Promise<RawMaterial | undefined> {
    const [result] = await db
      .update(rawMaterials)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rawMaterials.id, id))
      .returning();
    return result;
  }

  async deleteRawMaterial(id: string): Promise<void> {
    await db
      .update(rawMaterials)
      .set({ deletedAt: new Date() })
      .where(eq(rawMaterials.id, id));
  }

  // ─── PRODUCTS ───────────────────────────────────────────────────────────────

  async getProducts(params: {
    search?: string;
    categoria?: string;
    tipoCalculo?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Product[]; total: number }> {
    const { search, categoria, tipoCalculo, page = 1, limit = 25 } = params;
    const offset = (page - 1) * limit;

    const conditions = [isNull(products.deletedAt)];

    if (search) {
      conditions.push(ilike(products.nome, `%${search}%`));
    }

    if (categoria) {
      conditions.push(eq(products.categoria, categoria));
    }

    if (tipoCalculo) {
      conditions.push(eq(products.tipoCalculo, tipoCalculo as any));
    }

    const where = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(where);

    const data = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(asc(products.nome))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(countResult.count) };
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [result] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)));
    return result;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [result] = await db.insert(products).values(data).returning();
    return result;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [result] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result;
  }

  async deleteProduct(id: string): Promise<void> {
    await db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(eq(products.id, id));
  }

  // ─── PRODUCT COMPONENTS ──────────────────────────────────────────────────────

  async getProductComponents(productId: string): Promise<ProductComponent[]> {
    return db
      .select()
      .from(productComponents)
      .where(eq(productComponents.productId, productId))
      .orderBy(asc(productComponents.ordem));
  }

  async setProductComponents(productId: string, components: InsertProductComponent[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(productComponents).where(eq(productComponents.productId, productId));
      if (components.length > 0) {
        await tx.insert(productComponents).values(
          components.map((c) => ({ ...c, productId }))
        );
      }
    });
  }

  // ─── AI PRODUCT GENERATIONS ───────────────────────────────────────────────────

  async createAiGeneration(data: InsertAiProductGeneration): Promise<AiProductGeneration> {
    const [result] = await db.insert(aiProductGenerations).values(data).returning();
    return result;
  }

  async getAiGenerations(): Promise<AiProductGeneration[]> {
    return db
      .select()
      .from(aiProductGenerations)
      .orderBy(desc(aiProductGenerations.createdAt))
      .limit(50);
  }

  // ─── QUOTES ────────────────────────────────────────────────────────────────

  async getQuotes(params: {
    clientId?: string;
    sellerId?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    data: (Quote & {
      client: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
      seller: { id: string; nomeCompleto: string } | null;
    })[];
    total: number;
  }> {
    const { clientId, sellerId, search, status, page = 1, limit = 25 } = params;
    const offset = (page - 1) * limit;
    const conditions = [isNull(quotes.deletedAt)];

    if (clientId) conditions.push(eq(quotes.clientId, clientId));
    if (sellerId) conditions.push(eq(quotes.sellerId, sellerId));
    if (status) conditions.push(eq(quotes.status, status as any));
    if (search) {
      conditions.push(
        or(
          ilike(quotes.numero, `%${search}%`),
          ilike(clients.razaoSocial, `%${search}%`),
          ilike(clients.nomeFantasia, `%${search}%`),
        )!
      );
    }

    const where = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(where);

    const rows = await db
      .select({
        id: quotes.id,
        numero: quotes.numero,
        clientId: quotes.clientId,
        contactId: quotes.contactId,
        sellerId: quotes.sellerId,
        companyId: quotes.companyId,
        data: quotes.data,
        validade: quotes.validade,
        status: quotes.status,
        desconto: quotes.desconto,
        impostos: quotes.impostos,
        prazoProd: quotes.prazoProd,
        prazosPagamentoId: quotes.prazosPagamentoId,
        formaPagamento: quotes.formaPagamento,
        observacoes: quotes.observacoes,
        valorTotal: quotes.valorTotal,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        deletedAt: quotes.deletedAt,
        clientDbId: clients.id,
        clientRazaoSocial: clients.razaoSocial,
        clientNomeFantasia: clients.nomeFantasia,
        sellerDbId: sellers.id,
        sellerNomeCompleto: sellers.nomeCompleto,
      })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .leftJoin(sellers, eq(quotes.sellerId, sellers.id))
      .where(where)
      .orderBy(desc(quotes.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map(({ clientDbId, clientRazaoSocial, clientNomeFantasia, sellerDbId, sellerNomeCompleto, ...quote }) => ({
      ...quote,
      client: clientDbId ? { id: clientDbId, razaoSocial: clientRazaoSocial!, nomeFantasia: clientNomeFantasia } : null,
      seller: sellerDbId ? { id: sellerDbId, nomeCompleto: sellerNomeCompleto! } : null,
    }));

    return { data, total: Number(countResult.count) };
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.id, id), isNull(quotes.deletedAt)));
    return quote;
  }

  async createQuote(data: InsertQuote): Promise<Quote> {
    const year = new Date().getFullYear();
    const [lastQuote] = await db
      .select()
      .from(quotes)
      .where(sql`extract(year from ${quotes.createdAt}) = ${year}`)
      .orderBy(desc(quotes.createdAt))
      .limit(1);

    let nextNumber = 1;
    if (lastQuote && lastQuote.numero) {
      const parts = lastQuote.numero.split("-");
      if (parts.length === 3) {
        nextNumber = parseInt(parts[2]) + 1;
      }
    }
    const numero = `ORC-${year}-${nextNumber.toString().padStart(4, "0")}`;

    const [result] = await db.insert(quotes).values({ ...data, numero }).returning();
    return result;
  }

  async updateQuote(id: string, data: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [result] = await db
      .update(quotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return result;
  }

  async deleteQuote(id: string): Promise<void> {
    await db.update(quotes).set({ deletedAt: new Date() }).where(eq(quotes.id, id));
  }

  async getQuoteItems(quoteId: string): Promise<QuoteItem[]> {
    return db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId))
      .orderBy(asc(quoteItems.ordem));
  }

  async setQuoteItems(quoteId: string, items: InsertQuoteItem[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
      if (items.length > 0) {
        await tx.insert(quoteItems).values(
          items.map((item, index) => ({ ...item, quoteId, ordem: item.ordem ?? index }))
        );
      }
    });
  }

  async convertQuoteToOrder(quoteId: string): Promise<Order> {
    return await db.transaction(async (tx) => {
      const [quote] = await tx
        .select()
        .from(quotes)
        .where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)));
      if (!quote) throw new Error("Orçamento não encontrado");

      const year = new Date().getFullYear();
      const [lastOrder] = await tx
        .select()
        .from(orders)
        .where(sql`extract(year from ${orders.createdAt}) = ${year}`)
        .orderBy(desc(orders.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (lastOrder && lastOrder.numero) {
        const parts = lastOrder.numero.split("-");
        if (parts.length === 3) {
          nextNumber = parseInt(parts[2]) + 1;
        }
      }
      const numero = `PED-${year}-${nextNumber.toString().padStart(4, "0")}`;

      const [order] = await tx
        .insert(orders)
        .values({
          numero,
          quoteId,
          clientId: quote.clientId!,
          data: new Date().toISOString().split("T")[0],
          status: "aguardando_producao",
          valorTotal: quote.valorTotal,
          prazosPagamentoId: quote.prazosPagamentoId,
          formaPagamento: quote.formaPagamento,
          observacoes: quote.observacoes,
        })
        .returning();

      const items = await tx
        .select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quoteId))
        .orderBy(asc(quoteItems.ordem));

      if (items.length > 0) {
        await tx.insert(orderItems).values(
          items.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            descricao: item.descricao,
            largura: item.largura,
            altura: item.altura,
            area: item.area,
            quantidade: item.quantidade,
            unidade: item.unidade,
            precoUnitario: item.precoUnitario,
            precoTotal: item.precoTotal,
            observacoes: item.observacoes,
            ordem: item.ordem,
          }))
        );
      }

      await tx.update(quotes).set({ status: "aprovado" }).where(eq(quotes.id, quoteId));

      return order;
    });
  }

  // ─── ORDERS ────────────────────────────────────────────────────────────────

  async getOrders(params: {
    clientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Order[]; total: number }> {
    const { clientId, status, page = 1, limit = 25 } = params;
    const offset = (page - 1) * limit;
    const conditions = [isNull(orders.deletedAt)];

    if (clientId) conditions.push(eq(orders.clientId, clientId));
    if (status) conditions.push(eq(orders.status, status as any));

    const where = and(...conditions);
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(where);

    const data = await db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(countResult.count) };
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), isNull(orders.deletedAt)));
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [result] = await db
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return result;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.ordem));
  }

  // ─── COMPANIES ─────────────────────────────────────────────────────────────

  async getCompanies(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ data: Company[]; total: number }> {
    const { search, status, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;
    const conditions = [isNull(companies.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(companies.razaoSocial, `%${search}%`),
          ilike(companies.nomeFantasia, `%${search}%`),
          ilike(companies.cnpj, `%${search}%`)
        )!
      );
    }
    if (status) conditions.push(eq(companies.status, status));

    const where = and(...conditions);
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(companies)
      .where(where);

    const data = await db
      .select()
      .from(companies)
      .where(where)
      .orderBy(desc(companies.isPadrao), asc(companies.razaoSocial))
      .limit(limit)
      .offset(offset);

    return { data, total: Number(countResult.count) };
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)));
    return company;
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    if (data.isPadrao) {
      await db.update(companies).set({ isPadrao: false }).where(isNull(companies.deletedAt));
    }
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  async updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined> {
    if (data.isPadrao) {
      await db
        .update(companies)
        .set({ isPadrao: false })
        .where(and(isNull(companies.deletedAt)));
    }
    const [company] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)))
      .returning();
    return company;
  }

  async softDeleteCompany(id: string): Promise<void> {
    await db
      .update(companies)
      .set({ deletedAt: new Date(), isPadrao: false, updatedAt: new Date() })
      .where(eq(companies.id, id));
  }

  async setDefaultCompany(id: string): Promise<Company | undefined> {
    await db
      .update(companies)
      .set({ isPadrao: false })
      .where(isNull(companies.deletedAt));
    const [company] = await db
      .update(companies)
      .set({ isPadrao: true, updatedAt: new Date() })
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)))
      .returning();
    return company;
  }

  async getDefaultCompany(): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.isPadrao, true), isNull(companies.deletedAt)));
    return company;
  }

  // ─── WHATSAPP ────────────────────────────────────────────────────────────────

  async getWhatsappSession(from: string): Promise<WhatsappSession | undefined> {
    const [session] = await db
      .select()
      .from(whatsappSessions)
      .where(and(eq(whatsappSessions.from, from), eq(whatsappSessions.status, "active")))
      .orderBy(desc(whatsappSessions.updatedAt))
      .limit(1);
    return session;
  }

  async getWhatsappSessionById(id: string): Promise<WhatsappSession | undefined> {
    const [session] = await db.select().from(whatsappSessions).where(eq(whatsappSessions.id, id));
    return session;
  }

  async getWhatsappSessions(params?: { status?: string; page?: number; limit?: number }): Promise<{ data: WhatsappSession[]; total: number }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 30;
    const offset = (page - 1) * limit;
    const conditions: ReturnType<typeof eq>[] = [];
    if (params?.status) conditions.push(eq(whatsappSessions.status, params.status));
    const where = conditions.length ? and(...conditions) : undefined;
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(whatsappSessions).where(where);
    const data = await db.select().from(whatsappSessions).where(where).orderBy(desc(whatsappSessions.updatedAt)).limit(limit).offset(offset);
    return { data, total: Number(countResult.count) };
  }

  async createWhatsappSession(from: string): Promise<WhatsappSession> {
    const [session] = await db.insert(whatsappSessions).values({ from, step: "menu", data: {}, status: "active" }).returning();
    return session;
  }

  async updateWhatsappSession(id: string, data: Partial<WhatsappSession>): Promise<WhatsappSession | undefined> {
    const [session] = await db
      .update(whatsappSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(whatsappSessions.id, id))
      .returning();
    return session;
  }

  async getWhatsappMessages(sessionId: string): Promise<WhatsappMessage[]> {
    return db.select().from(whatsappMessages).where(eq(whatsappMessages.sessionId, sessionId)).orderBy(asc(whatsappMessages.createdAt));
  }

  async addWhatsappMessage(sessionId: string, direction: string, body: string, from?: string, to?: string): Promise<WhatsappMessage> {
    const [msg] = await db.insert(whatsappMessages).values({ sessionId, direction, body, from: from ?? null, to: to ?? null }).returning();
    return msg;
  }

  // ─── QUOTE RULES ─────────────────────────────────────────────────────────────

  async listQuoteRules(): Promise<QuoteRule[]> {
    return db.select().from(quoteRules).orderBy(asc(quoteRules.createdAt));
  }

  async createQuoteRule(data: InsertQuoteRule): Promise<QuoteRule> {
    const [rule] = await db.insert(quoteRules).values(data).returning();
    return rule;
  }

  async updateQuoteRule(id: string, data: Partial<InsertQuoteRule>): Promise<QuoteRule | undefined> {
    const [rule] = await db
      .update(quoteRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quoteRules.id, id))
      .returning();
    return rule;
  }

  async deleteQuoteRule(id: string): Promise<void> {
    await db.delete(quoteRules).where(eq(quoteRules.id, id));
  }

  // ─── AI AGENT CONFIG ──────────────────────────────────────────────────────────

  async getAiAgentConfig(): Promise<AiAgentConfig | undefined> {
    const [cfg] = await db.select().from(aiAgentConfig).where(eq(aiAgentConfig.id, "default")).limit(1);
    return cfg;
  }

  async upsertAiAgentConfig(instrucoes: string): Promise<AiAgentConfig> {
    const [cfg] = await db
      .insert(aiAgentConfig)
      .values({ id: "default", instrucoes })
      .onConflictDoUpdate({ target: aiAgentConfig.id, set: { instrucoes, updatedAt: new Date() } })
      .returning();
    return cfg;
  }

  // ─── AI AGENT KNOWLEDGE FILES ─────────────────────────────────────────────────

  async listAiAgentKnowledgeFiles(): Promise<AiAgentKnowledgeFile[]> {
    return db.select().from(aiAgentKnowledgeFiles).orderBy(desc(aiAgentKnowledgeFiles.createdAt));
  }

  async createAiAgentKnowledgeFile(data: InsertAiAgentKnowledgeFile): Promise<AiAgentKnowledgeFile> {
    const [file] = await db.insert(aiAgentKnowledgeFiles).values(data).returning();
    return file;
  }

  async updateAiAgentKnowledgeFile(id: string, data: Partial<InsertAiAgentKnowledgeFile>): Promise<AiAgentKnowledgeFile | undefined> {
    const [file] = await db.update(aiAgentKnowledgeFiles).set(data).where(eq(aiAgentKnowledgeFiles.id, id)).returning();
    return file;
  }

  async deleteAiAgentKnowledgeFile(id: string): Promise<void> {
    await db.delete(aiAgentKnowledgeFiles).where(eq(aiAgentKnowledgeFiles.id, id));
  }

  // ─── VEHICLES ─────────────────────────────────────────────────────────────────

  async getVehicles(params?: { search?: string; status?: string }): Promise<Vehicle[]> {
    const conditions: any[] = [];
    if (params?.status) conditions.push(eq(vehicles.status, params.status as any));
    if (params?.search) {
      conditions.push(or(
        ilike(vehicles.placa, `%${params.search}%`),
        ilike(vehicles.modelo, `%${params.search}%`),
        ilike(vehicles.marca, `%${params.search}%`),
        ilike(vehicles.numeroInterno, `%${params.search}%`),
      ));
    }
    return db.select().from(vehicles)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(vehicles.marca), asc(vehicles.modelo));
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [v] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return v;
  }

  async createVehicle(data: InsertVehicle): Promise<Vehicle> {
    const [v] = await db.insert(vehicles).values(data).returning();
    return v;
  }

  async updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const [v] = await db.update(vehicles).set({ ...data, updatedAt: new Date() }).where(eq(vehicles.id, id)).returning();
    return v;
  }

  // ─── VEHICLE EXITS ────────────────────────────────────────────────────────────

  async getVehicleExits(params?: { vehicleId?: string; driverId?: string; status?: string }): Promise<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } })[]> {
    const conditions: any[] = [];
    if (params?.vehicleId) conditions.push(eq(vehicleExits.vehicleId, params.vehicleId));
    if (params?.driverId) conditions.push(eq(vehicleExits.driverId, params.driverId));
    if (params?.status) conditions.push(eq(vehicleExits.status, params.status as any));

    const rows = await db
      .select({
        exit: vehicleExits,
        vehicle: vehicles,
        driverName: sellers.nomeCompleto,
        driverId: sellers.id,
      })
      .from(vehicleExits)
      .innerJoin(vehicles, eq(vehicleExits.vehicleId, vehicles.id))
      .innerJoin(sellers, eq(vehicleExits.driverId, sellers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(vehicleExits.dataHoraSaida));

    return rows.map((r) => ({
      ...r.exit,
      vehicle: r.vehicle,
      driver: { id: r.driverId, nomeCompleto: r.driverName },
    }));
  }

  async getVehicleExit(id: string): Promise<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } }) | undefined> {
    const [r] = await db
      .select({
        exit: vehicleExits,
        vehicle: vehicles,
        driverName: sellers.nomeCompleto,
        driverId: sellers.id,
      })
      .from(vehicleExits)
      .innerJoin(vehicles, eq(vehicleExits.vehicleId, vehicles.id))
      .innerJoin(sellers, eq(vehicleExits.driverId, sellers.id))
      .where(eq(vehicleExits.id, id));
    if (!r) return undefined;
    return { ...r.exit, vehicle: r.vehicle, driver: { id: r.driverId, nomeCompleto: r.driverName } };
  }

  async createVehicleExit(data: InsertVehicleExit): Promise<VehicleExit> {
    const [v] = await db.insert(vehicleExits).values(data as any).returning();
    return v;
  }

  async updateVehicleExit(id: string, data: Partial<InsertVehicleExit>): Promise<VehicleExit | undefined> {
    const [v] = await db.update(vehicleExits).set({ ...data, updatedAt: new Date() } as any).where(eq(vehicleExits.id, id)).returning();
    return v;
  }

  async getSellerByWhatsappNumber(phone: string): Promise<Seller | undefined> {
    const normalized = phone.replace(/\D/g, "");
    const [seller] = await db
      .select()
      .from(sellers)
      .where(
        and(
          eq(sellers.whatsappNumber, normalized),
          isNull(sellers.deletedAt),
        )
      )
      .limit(1);
    return seller;
  }

  async getOpenVehicleExitByDriver(driverId: string): Promise<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } }) | undefined> {
    const [r] = await db
      .select({
        exit: vehicleExits,
        vehicle: vehicles,
        driverName: sellers.nomeCompleto,
        driverId: sellers.id,
      })
      .from(vehicleExits)
      .innerJoin(vehicles, eq(vehicleExits.vehicleId, vehicles.id))
      .innerJoin(sellers, eq(vehicleExits.driverId, sellers.id))
      .where(
        and(
          eq(vehicleExits.driverId, driverId),
          eq(vehicleExits.status, "em_rota")
        )
      )
      .orderBy(desc(vehicleExits.dataHoraSaida))
      .limit(1);
    if (!r) return undefined;
    return { ...r.exit, vehicle: r.vehicle, driver: { id: r.driverId, nomeCompleto: r.driverName } };
  }

  async getOpenVehicleExitByVehicle(vehicleId: string): Promise<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } }) | undefined> {
    const [r] = await db
      .select({
        exit: vehicleExits,
        vehicle: vehicles,
        driverName: sellers.nomeCompleto,
        driverId: sellers.id,
      })
      .from(vehicleExits)
      .innerJoin(vehicles, eq(vehicleExits.vehicleId, vehicles.id))
      .innerJoin(sellers, eq(vehicleExits.driverId, sellers.id))
      .where(
        and(
          eq(vehicleExits.vehicleId, vehicleId),
          eq(vehicleExits.status, "em_rota")
        )
      )
      .orderBy(desc(vehicleExits.dataHoraSaida))
      .limit(1);
    if (!r) return undefined;
    return { ...r.exit, vehicle: r.vehicle, driver: { id: r.driverId, nomeCompleto: r.driverName } };
  }

  // ─── VEHICLE MAINTENANCE ITEMS ──────────────────────────────────────────────

  async getMaintenanceItems(vehicleId: string): Promise<VehicleMaintenanceItem[]> {
    return db
      .select()
      .from(vehicleMaintenanceItems)
      .where(eq(vehicleMaintenanceItems.vehicleId, vehicleId))
      .orderBy(asc(vehicleMaintenanceItems.nome));
  }

  async getMaintenanceItem(id: string): Promise<VehicleMaintenanceItem | undefined> {
    const [item] = await db.select().from(vehicleMaintenanceItems).where(eq(vehicleMaintenanceItems.id, id));
    return item;
  }

  async createMaintenanceItem(data: InsertVehicleMaintenanceItem): Promise<VehicleMaintenanceItem> {
    const [item] = await db.insert(vehicleMaintenanceItems).values(data as any).returning();
    return item;
  }

  async updateMaintenanceItem(id: string, data: Partial<InsertVehicleMaintenanceItem>): Promise<VehicleMaintenanceItem | undefined> {
    const [item] = await db
      .update(vehicleMaintenanceItems)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(vehicleMaintenanceItems.id, id))
      .returning();
    return item;
  }

  async deleteMaintenanceItem(id: string): Promise<void> {
    await db.delete(vehicleMaintenanceItems).where(eq(vehicleMaintenanceItems.id, id));
  }

  // ─── VEHICLE MAINTENANCE HISTORY ────────────────────────────────────────────

  async getMaintenanceHistory(params: { vehicleId?: string; itemId?: string }): Promise<VehicleMaintenanceHistory[]> {
    const conditions: any[] = [];
    if (params.vehicleId) conditions.push(eq(vehicleMaintenanceHistory.vehicleId, params.vehicleId));
    if (params.itemId) conditions.push(eq(vehicleMaintenanceHistory.itemId, params.itemId));
    return db
      .select()
      .from(vehicleMaintenanceHistory)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(vehicleMaintenanceHistory.data));
  }

  async createMaintenanceHistory(data: InsertVehicleMaintenanceHistory): Promise<VehicleMaintenanceHistory> {
    const [entry] = await db.insert(vehicleMaintenanceHistory).values(data as any).returning();
    return entry;
  }

  // ─── VEHICLE ISSUE REPORTS ──────────────────────────────────────────────────

  async getIssueReports(params?: { vehicleId?: string; status?: string }): Promise<(VehicleIssueReport & { reporterName?: string | null })[]> {
    const conditions: any[] = [];
    if (params?.vehicleId) conditions.push(eq(vehicleIssueReports.vehicleId, params.vehicleId));
    if (params?.status) conditions.push(eq(vehicleIssueReports.status, params.status as any));

    const rows = await db
      .select({ issue: vehicleIssueReports, reporterName: sellers.nomeCompleto })
      .from(vehicleIssueReports)
      .leftJoin(sellers, eq(vehicleIssueReports.reportadoPor, sellers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(vehicleIssueReports.dataHora));

    return rows.map((r) => ({ ...r.issue, reporterName: r.reporterName }));
  }

  async getIssueReport(id: string): Promise<VehicleIssueReport | undefined> {
    const [row] = await db.select().from(vehicleIssueReports).where(eq(vehicleIssueReports.id, id));
    return row;
  }

  async createIssueReport(data: InsertVehicleIssueReport): Promise<VehicleIssueReport> {
    const [row] = await db.insert(vehicleIssueReports).values(data as any).returning();
    return row;
  }

  async updateIssueReport(id: string, data: Partial<InsertVehicleIssueReport>): Promise<VehicleIssueReport | undefined> {
    const [row] = await db
      .update(vehicleIssueReports)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(vehicleIssueReports.id, id))
      .returning();
    return row;
  }

  // ─── MAINTENANCE SUMMARY (para status lights) ───────────────────────────────

  /**
   * Calcula o resumo de manutenção de todos os veículos para o painel de status.
   * Status é calculado dinamicamente: vermelho = vencido, amarelo = próximo do vencimento.
   */
  async getMaintenanceSummary(): Promise<{ hasVermelho: boolean; hasAmarelo: boolean; countVermelho: number; countAmarelo: number }> {
    const now = Date.now();
    const allItems = await db
      .select({ item: vehicleMaintenanceItems, kmAtual: vehicles.kmAtual })
      .from(vehicleMaintenanceItems)
      .innerJoin(vehicles, eq(vehicleMaintenanceItems.vehicleId, vehicles.id));

    let countVermelho = 0;
    let countAmarelo = 0;

    for (const { item, kmAtual } of allItems) {
      const status = calcMaintenanceItemStatus(item, kmAtual ? Number(kmAtual) : null);
      if (status === "vermelho") countVermelho++;
      else if (status === "amarelo") countAmarelo++;
    }

    return {
      hasVermelho: countVermelho > 0,
      hasAmarelo: countAmarelo > 0,
      countVermelho,
      countAmarelo,
    };
  }

  // ─── MAINTENANCE TEMPLATES ──────────────────────────────────────────────────

  async getMaintenanceTemplates(params?: { approvalStatus?: string }): Promise<VehicleMaintenanceTemplate[]> {
    const conditions: any[] = [];
    if (params?.approvalStatus) conditions.push(eq(vehicleMaintenanceTemplates.approvalStatus, params.approvalStatus as any));
    return db
      .select()
      .from(vehicleMaintenanceTemplates)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(vehicleMaintenanceTemplates.createdAt));
  }

  async getMaintenanceTemplate(id: string): Promise<VehicleMaintenanceTemplate | undefined> {
    const [tmpl] = await db.select().from(vehicleMaintenanceTemplates).where(eq(vehicleMaintenanceTemplates.id, id));
    return tmpl;
  }

  async createMaintenanceTemplate(data: InsertVehicleMaintenanceTemplate): Promise<VehicleMaintenanceTemplate> {
    const [tmpl] = await db.insert(vehicleMaintenanceTemplates).values(data as any).returning();
    return tmpl;
  }

  async updateMaintenanceTemplate(id: string, data: Partial<InsertVehicleMaintenanceTemplate>): Promise<VehicleMaintenanceTemplate | undefined> {
    const [tmpl] = await db
      .update(vehicleMaintenanceTemplates)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(vehicleMaintenanceTemplates.id, id))
      .returning();
    return tmpl;
  }

  // ─── IMPORT LOGS ────────────────────────────────────────────────────────────

  async getImportLogs(vehicleId: string): Promise<VehicleMaintenanceImportLog[]> {
    return db
      .select()
      .from(vehicleMaintenanceImportLogs)
      .where(eq(vehicleMaintenanceImportLogs.vehicleId, vehicleId))
      .orderBy(desc(vehicleMaintenanceImportLogs.createdAt));
  }

  // ─── WA BOT CONFIG ──────────────────────────────────────────────────────────

  async getWaBotConfig(): Promise<WaBotConfig | undefined> {
    const [row] = await db.select().from(waBotConfig).where(eq(waBotConfig.id, "default")).limit(1);
    return row;
  }

  async createPurchaseRequest(data: InsertPurchaseRequest): Promise<PurchaseRequest> {
    // Gera código sequencial SC-NNNNNN via sequence PostgreSQL
    const result = await db.execute(sql`SELECT nextval('seq_purchase_code') as n`);
    const n = Number((result as any)?.rows?.[0]?.n ?? (result as any)?.[0]?.n ?? 1);
    const codigo = `SC-${String(n).padStart(6, "0")}`;

    const [row] = await db.insert(purchaseRequests).values({ ...data, codigo } as any).returning();
    return row;
  }

  async getPurchaseRequest(id: string): Promise<PurchaseRequest | undefined> {
    const [row] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id));
    return row;
  }

  async getPurchaseRequests(params?: {
    status?: string;
    tipoCompra?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: PurchaseRequest[]; total: number }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params?.status) conditions.push(eq(purchaseRequests.status, params.status));
    if (params?.tipoCompra) conditions.push(eq(purchaseRequests.tipoCompra, params.tipoCompra));
    if (params?.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(purchaseRequests.codigo, q),
          ilike(purchaseRequests.material, q),
          ilike(purchaseRequests.solicitanteNome, q)
        )
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(purchaseRequests).where(where);
    const data = await db
      .select()
      .from(purchaseRequests)
      .where(where)
      .orderBy(desc(purchaseRequests.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: countResult?.count ?? 0 };
  }

  async updatePurchaseRequest(id: string, data: Partial<PurchaseRequest>): Promise<PurchaseRequest> {
    const [row] = await db
      .update(purchaseRequests)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(purchaseRequests.id, id))
      .returning();
    return row;
  }

  async upsertWaBotConfig(data: Partial<InsertWaBotConfig>): Promise<WaBotConfig> {
    const [row] = await db
      .insert(waBotConfig)
      .values({ id: "default", ...data } as any)
      .onConflictDoUpdate({
        target: waBotConfig.id,
        set: { ...data, updatedAt: new Date() } as any,
      })
      .returning();
    return row;
  }

  // ─── SUPPLIERS ────────────────────────────────────────────────────────

  async getSuppliers(params?: {
    search?: string;
    ativo?: boolean;
    material?: string;
    aceitaCotacaoWhatsapp?: boolean;
    whatsappAutorizado?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Supplier[]; total: number }> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params?.ativo !== undefined) conditions.push(eq(suppliers.ativo, params.ativo));
    if (params?.aceitaCotacaoWhatsapp !== undefined) conditions.push(eq(suppliers.aceitaCotacaoWhatsapp, params.aceitaCotacaoWhatsapp));
    if (params?.whatsappAutorizado !== undefined) conditions.push(eq(suppliers.whatsappAutorizado, params.whatsappAutorizado));
    if (params?.material) conditions.push(sql`${suppliers.materiaisFornecidos} @> ARRAY[${params.material}]`);
    if (params?.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(suppliers.nome, q),
          ilike(suppliers.cnpjCpf, q),
          ilike(suppliers.telefone, q),
          ilike(suppliers.whatsapp, q)
        )
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(suppliers).where(where);
    const data = await db
      .select()
      .from(suppliers)
      .where(where)
      .orderBy(asc(suppliers.nome))
      .limit(limit)
      .offset(offset);

    return { data, total: countResult?.count ?? 0 };
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return row;
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const [row] = await db.insert(suppliers).values(data).returning();
    return row;
  }

  async updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [row] = await db
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(suppliers.id, id))
      .returning();
    return row;
  }

  async toggleSupplierActive(id: string): Promise<Supplier | undefined> {
    const existing = await this.getSupplier(id);
    if (!existing) return undefined;
    const [row] = await db
      .update(suppliers)
      .set({ ativo: !existing.ativo, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
