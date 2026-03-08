import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  decimal,
  integer,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const clientStatusEnum = pgEnum("client_status", [
  "ativo",
  "inativo",
  "prospect",
  "bloqueado",
]);

export const leadOriginEnum = pgEnum("lead_origin", [
  "indicacao",
  "site",
  "instagram",
  "google",
  "whatsapp",
  "email",
  "prospeccao_ativa",
  "evento",
  "outro",
]);

export const sellerStatusEnum = pgEnum("seller_status", [
  "ativo",
  "inativo",
  "afastado",
]);

export const interactionTypeEnum = pgEnum("interaction_type", [
  "ligacao",
  "email",
  "whatsapp",
  "reuniao",
  "visita",
  "proposta",
  "outro",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pendente",
  "em_andamento",
  "concluida",
  "cancelada",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "baixa",
  "media",
  "alta",
  "urgente",
]);

export const timelineEventTypeEnum = pgEnum("timeline_event_type", [
  "cadastro_criado",
  "cnpj_consultado",
  "contato_adicionado",
  "contato_editado",
  "contato_removido",
  "vendedor_vinculado",
  "vendedor_desvinculado",
  "observacao_criada",
  "status_alterado",
  "interacao_registrada",
  "tarefa_criada",
  "tarefa_concluida",
  "tag_adicionada",
]);

export const automationJobStatusEnum = pgEnum("automation_job_status", [
  "pendente",
  "em_processamento",
  "concluido",
  "erro",
]);

export const followStatusEnum = pgEnum("follow_status", [
  "pendente",
  "em_processamento",
  "concluido",
  "erro",
]);

export const pixKeyTypeEnum = pgEnum("pix_key_type", [
  "cpf",
  "cnpj",
  "email",
  "telefone",
  "chave_aleatoria",
]);

export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "corrente",
  "poupanca",
]);

export const taxRegimeEnum = pgEnum("tax_regime", [
  "simples_nacional",
  "lucro_presumido",
  "lucro_real",
  "mei",
  "isento",
  "outro",
]);

// ─── USERS ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  email: true,
  role: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export const clients = pgTable(
  "clients",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    // Fiscal
    cnpj: varchar("cnpj", { length: 18 }),
    razaoSocial: text("razao_social").notNull(),
    nomeFantasia: text("nome_fantasia"),
    inscricaoEstadual: text("inscricao_estadual"),
    inscricaoMunicipal: text("inscricao_municipal"),
    situacaoCadastral: text("situacao_cadastral"),
    dataAbertura: date("data_abertura"),
    naturezaJuridica: text("natureza_juridica"),
    regimeTributario: taxRegimeEnum("regime_tributario"),
    // Address
    cep: varchar("cep", { length: 9 }),
    logradouro: text("logradouro"),
    numero: text("numero"),
    complemento: text("complemento"),
    bairro: text("bairro"),
    cidade: text("cidade"),
    estado: varchar("estado", { length: 2 }),
    // Contact
    telefone: text("telefone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    site: text("site"),
    instagram: text("instagram"),
    // CRM
    status: clientStatusEnum("status").notNull().default("prospect"),
    origemLead: leadOriginEnum("origem_lead"),
    segmento: text("segmento"),
    potencialCompra: text("potencial_compra"), // baixo, medio, alto
    tags: text("tags").array(),
    observacoes: text("observacoes"),
    // CNPJ lookup metadata
    cnpjConsultadoEm: timestamp("cnpj_consultado_em"),
    cnpjFonteConsulta: text("cnpj_fonte_consulta"),
    cnpjConsultaBemSucedida: boolean("cnpj_consulta_bem_sucedida"),
    // Instagram automation fields
    instagramHandle: text("instagram_handle"),
    followDesired: boolean("follow_desired").default(false),
    followStatus: followStatusEnum("follow_status"),
    followRequestedAt: timestamp("follow_requested_at"),
    followCompletedAt: timestamp("follow_completed_at"),
    followErrorLog: text("follow_error_log"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    createdBy: varchar("created_by").references(() => users.id),
    // CRM fields
    dataUltimoContato: timestamp("data_ultimo_contato"),
    dataProximoFollowup: timestamp("data_proximo_followup"),
    responsavelComercialId: varchar("responsavel_comercial_id").references(
      () => users.id
    ),
  },
  (t) => [
    index("idx_clients_cnpj").on(t.cnpj),
    index("idx_clients_status").on(t.status),
    index("idx_clients_cidade").on(t.cidade),
    index("idx_clients_deleted_at").on(t.deletedAt),
  ]
);

const coerceDate = z.union([z.date(), z.string().transform((s) => new Date(s))]).optional().nullable();

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  cnpjConsultadoEm: coerceDate,
  dataUltimoContato: coerceDate,
  dataProximoFollowup: coerceDate,
  followRequestedAt: coerceDate,
  followCompletedAt: coerceDate,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── CLIENT CONTACTS ──────────────────────────────────────────────────────────

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: varchar("client_id")
      .notNull()
      .references(() => clients.id),
    nomeCompleto: text("nome_completo").notNull(),
    cargo: text("cargo"),
    setor: text("setor"),
    telefone: text("telefone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    dataNascimento: date("data_nascimento"),
    instagram: text("instagram"),
    linkedin: text("linkedin"),
    observacoes: text("observacoes"),
    contatoPrincipal: boolean("contato_principal").default(false),
    podeAprovarCompras: boolean("pode_aprovar_compras").default(false),
    podeAprovarOrcamento: boolean("pode_aprovar_orcamento").default(false),
    recebeFinanceiro: boolean("recebe_financeiro").default(false),
    recebeProducao: boolean("recebe_producao").default(false),
    status: boolean("status").default(true),
    // Instagram automation
    instagramHandle: text("instagram_handle"),
    followDesired: boolean("follow_desired").default(false),
    followStatus: followStatusEnum("follow_status"),
    followRequestedAt: timestamp("follow_requested_at"),
    followCompletedAt: timestamp("follow_completed_at"),
    followErrorLog: text("follow_error_log"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_contacts_client_id").on(t.clientId),
    index("idx_contacts_principal").on(t.contatoPrincipal),
  ]
);

export const insertContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  followRequestedAt: coerceDate,
  followCompletedAt: coerceDate,
});
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof clientContacts.$inferSelect;

// ─── SELLERS ─────────────────────────────────────────────────────────────────

export const sellers = pgTable(
  "sellers",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    nomeCompleto: text("nome_completo").notNull(),
    cpf: varchar("cpf", { length: 14 }),
    rg: text("rg"),
    dataNascimento: date("data_nascimento"),
    telefone: text("telefone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    instagram: text("instagram"),
    // Address
    cep: varchar("cep", { length: 9 }),
    logradouro: text("logradouro"),
    numero: text("numero"),
    complemento: text("complemento"),
    bairro: text("bairro"),
    cidade: text("cidade"),
    estado: varchar("estado", { length: 2 }),
    // Commercial
    cargo: text("cargo"),
    dataEntrada: date("data_entrada"),
    status: sellerStatusEnum("status").notNull().default("ativo"),
    percentualComissao: decimal("percentual_comissao", {
      precision: 5,
      scale: 2,
    }),
    observacoes: text("observacoes"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
    userId: varchar("user_id").references(() => users.id),
  },
  (t) => [
    index("idx_sellers_status").on(t.status),
    index("idx_sellers_cpf").on(t.cpf),
  ]
);

export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type Seller = typeof sellers.$inferSelect;

// ─── SELLER BANK ACCOUNTS ─────────────────────────────────────────────────────

export const sellerBankAccounts = pgTable("seller_bank_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id")
    .notNull()
    .references(() => sellers.id),
  banco: text("banco"),
  agencia: text("agencia"),
  conta: text("conta"),
  tipoConta: bankAccountTypeEnum("tipo_conta"),
  nomeFavorecido: text("nome_favorecido"),
  documentoFavorecido: text("documento_favorecido"),
  pixTipoChave: pixKeyTypeEnum("pix_tipo_chave"),
  pixChave: text("pix_chave"),
  principal: boolean("principal").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSellerBankAccountSchema = createInsertSchema(
  sellerBankAccounts
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSellerBankAccount = z.infer<
  typeof insertSellerBankAccountSchema
>;
export type SellerBankAccount = typeof sellerBankAccounts.$inferSelect;

// ─── CLIENT SELLER LINKS ──────────────────────────────────────────────────────

export const clientSellerLinks = pgTable(
  "client_seller_links",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: varchar("client_id")
      .notNull()
      .references(() => clients.id),
    sellerId: varchar("seller_id")
      .notNull()
      .references(() => sellers.id),
    principal: boolean("principal").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_client_seller_client").on(t.clientId),
    index("idx_client_seller_seller").on(t.sellerId),
  ]
);

export const insertClientSellerLinkSchema = createInsertSchema(
  clientSellerLinks
).omit({ id: true, createdAt: true });
export type InsertClientSellerLink = z.infer<
  typeof insertClientSellerLinkSchema
>;
export type ClientSellerLink = typeof clientSellerLinks.$inferSelect;

// ─── CRM INTERACTIONS ─────────────────────────────────────────────────────────

export const crmInteractions = pgTable(
  "crm_interactions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: varchar("client_id")
      .notNull()
      .references(() => clients.id),
    sellerId: varchar("seller_id").references(() => sellers.id),
    tipo: interactionTypeEnum("tipo").notNull(),
    descricao: text("descricao").notNull(),
    resultado: text("resultado"),
    dataInteracao: timestamp("data_interacao").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_interactions_client").on(t.clientId)]
);

export const insertInteractionSchema = createInsertSchema(
  crmInteractions
).omit({ id: true, createdAt: true }).extend({
  dataInteracao: coerceDate,
});
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof crmInteractions.$inferSelect;

// ─── CRM TASKS ────────────────────────────────────────────────────────────────

export const crmTasks = pgTable(
  "crm_tasks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: varchar("client_id").references(() => clients.id),
    sellerId: varchar("seller_id").references(() => sellers.id),
    titulo: text("titulo").notNull(),
    descricao: text("descricao"),
    status: taskStatusEnum("status").notNull().default("pendente"),
    prioridade: taskPriorityEnum("prioridade").notNull().default("media"),
    dataVencimento: timestamp("data_vencimento"),
    dataConclusao: timestamp("data_conclusao"),
    assignedTo: varchar("assigned_to").references(() => users.id),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_tasks_client").on(t.clientId),
    index("idx_tasks_status").on(t.status),
    index("idx_tasks_vencimento").on(t.dataVencimento),
  ]
);

export const insertTaskSchema = createInsertSchema(crmTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dataVencimento: coerceDate,
  dataConclusao: coerceDate,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof crmTasks.$inferSelect;

// ─── CRM TAGS ─────────────────────────────────────────────────────────────────

export const crmTags = pgTable("crm_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull().unique(),
  cor: text("cor").notNull().default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTagSchema = createInsertSchema(crmTags).omit({
  id: true,
  createdAt: true,
});
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof crmTags.$inferSelect;

// ─── ACTIVITY TIMELINE ────────────────────────────────────────────────────────

export const activityTimeline = pgTable(
  "activity_timeline",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    clientId: varchar("client_id").references(() => clients.id),
    sellerId: varchar("seller_id").references(() => sellers.id),
    eventType: timelineEventTypeEnum("event_type").notNull(),
    titulo: text("titulo").notNull(),
    descricao: text("descricao"),
    metadata: jsonb("metadata"),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_timeline_client").on(t.clientId),
    index("idx_timeline_created_at").on(t.createdAt),
  ]
);

export const insertTimelineSchema = createInsertSchema(activityTimeline).omit({
  id: true,
  createdAt: true,
});
export type InsertTimeline = z.infer<typeof insertTimelineSchema>;
export type Timeline = typeof activityTimeline.$inferSelect;

// ─── COMPANY LOOKUP LOGS ──────────────────────────────────────────────────────

export const companyLookupLogs = pgTable("company_lookup_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cnpj: varchar("cnpj", { length: 18 }).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  provider: text("provider").notNull(),
  sucesso: boolean("sucesso").notNull(),
  rawResponse: jsonb("raw_response"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── AUTOMATION JOBS ─────────────────────────────────────────────────────────

export const automationJobs = pgTable(
  "automation_jobs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tipo: text("tipo").notNull(), // "instagram_follow", "whatsapp_message", etc.
    payload: jsonb("payload"),
    status: automationJobStatusEnum("status").notNull().default("pendente"),
    tentativas: integer("tentativas").notNull().default(0),
    maxTentativas: integer("max_tentativas").notNull().default(3),
    errorLog: text("error_log"),
    agendadoPara: timestamp("agendado_para"),
    processadoEm: timestamp("processado_em"),
    clientId: varchar("client_id").references(() => clients.id),
    contactId: varchar("contact_id").references(() => clientContacts.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_jobs_status").on(t.status),
    index("idx_jobs_client").on(t.clientId),
  ]
);

// ─── DASHBOARD STATS (view types) ────────────────────────────────────────────

export interface DashboardStats {
  totalClientes: number;
  totalProspects: number;
  totalContatos: number;
  totalVendedores: number;
  tarefasPendentes: number;
  aniversariosProximos: Contact[];
  ultimasAtividades: Timeline[];
}
