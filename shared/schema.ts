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

export const membroFuncaoEnum = pgEnum("membro_funcao", [
  "vendedor",
  "serralheiro",
  "instalador",
  "financeiro",
  "diretor",
  "motorista",
  "administrativo",
  "tecnico",
  "outro",
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

export const tipoPessoaEnum = pgEnum("tipo_pessoa", ["fisica", "juridica"]);

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

// ─── PAYMENT TERMS ────────────────────────────────────────────────────────────

export const paymentTerms = pgTable("payment_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  dias: integer("dias").array().notNull().default([]),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentTermSchema = createInsertSchema(paymentTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dias: z.array(z.number().int().min(0)).min(1, "Informe ao menos um prazo"),
});
export type InsertPaymentTerm = z.infer<typeof insertPaymentTermSchema>;
export type PaymentTerm = typeof paymentTerms.$inferSelect;

// ─── PAYMENT METHODS ──────────────────────────────────────────────────────────

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export const clients = pgTable(
  "clients",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tipoPessoa: tipoPessoaEnum("tipo_pessoa").notNull().default("juridica"),
    cpf: varchar("cpf", { length: 14 }),
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
    // Comercial
    prazosPagamentoId: varchar("prazos_pagamento_id").references(() => paymentTerms.id),
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
    tipoPessoa: tipoPessoaEnum("tipo_pessoa").notNull().default("fisica"),
    nomeCompleto: text("nome_completo").notNull(),
    nomeFantasia: text("nome_fantasia"),
    cpf: varchar("cpf", { length: 14 }),
    cnpj: varchar("cnpj", { length: 18 }),
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
    funcao: membroFuncaoEnum("funcao"),
    dataEntrada: date("data_entrada"),
    status: sellerStatusEnum("status").notNull().default("ativo"),
    percentualComissao: decimal("percentual_comissao", {
      precision: 5,
      scale: 2,
    }),
    observacoes: text("observacoes"),
    // Driver / Vehicle Control
    autorizadoDirigir: boolean("autorizado_dirigir").notNull().default(false),
    cnhCategoria: text("cnh_categoria"),
    cnhValidade: date("cnh_validade"),
    cnhObservacoes: text("cnh_observacoes"),
    whatsappNumber: text("whatsapp_number"),
    // Purchasing
    autorizadoCompras: boolean("autorizado_compras").notNull().default(false),
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

// ─── SELLER DOCUMENTS ─────────────────────────────────────────────────────────

export const sellerDocuments = pgTable("seller_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id")
    .notNull()
    .references(() => sellers.id),
  nomeArquivo: text("nome_arquivo").notNull(),
  descricao: text("descricao"),
  mimeType: text("mime_type").notNull(),
  caminho: text("caminho").notNull(),
  tamanhoBytes: integer("tamanho_bytes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSellerDocumentSchema = createInsertSchema(sellerDocuments).omit({
  id: true,
  createdAt: true,
});
export type InsertSellerDocument = z.infer<typeof insertSellerDocumentSchema>;
export type SellerDocument = typeof sellerDocuments.$inferSelect;

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

// ─── RAW MATERIALS ───────────────────────────────────────────────────────────

export const rawMaterialCategoryEnum = pgEnum("raw_material_category", [
  "chapas",
  "impressao",
  "estruturas",
  "iluminacao",
  "fixacao",
  "adesivos",
  "tintas",
  "acabamento",
  "instalacao",
  "servicos_terceirizados",
  "outros",
]);

export const rawMaterials = pgTable(
  "raw_materials",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    nome: text("nome").notNull(),
    categoria: rawMaterialCategoryEnum("categoria").notNull(),
    codigoInterno: text("codigo_interno"),
    descricao: text("descricao"),
    unidadeCompra: text("unidade_compra").notNull(),
    unidadeUso: text("unidade_uso"),
    custoUnitario: decimal("custo_unitario", { precision: 12, scale: 4 }),
    perdaPadrao: decimal("perda_padrao", { precision: 5, scale: 2 }),
    fornecedor: text("fornecedor"),
    marca: text("marca"),
    observacoes: text("observacoes"),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_raw_materials_categoria").on(t.categoria),
    index("idx_raw_materials_deleted_at").on(t.deletedAt),
  ]
);

export const insertRawMaterialSchema = createInsertSchema(rawMaterials).omit({
  id: true, createdAt: true, updatedAt: true, deletedAt: true,
});
export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;
export type RawMaterial = typeof rawMaterials.$inferSelect;

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export const calcTypeEnum = pgEnum("calc_type", [
  "m2",
  "unidade",
  "metro_linear",
  "perimetro",
  "projeto",
  "fixo_variavel",
]);

export const products = pgTable(
  "products",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    nome: text("nome").notNull(),
    categoria: text("categoria").notNull(),
    descricaoComercial: text("descricao_comercial"),
    descricaoTecnica: text("descricao_tecnica"),
    unidadeVenda: text("unidade_venda").notNull(),
    tipoCalculo: calcTypeEnum("tipo_calculo").notNull(),
    aceitaMedidasVariaveis: boolean("aceita_medidas_variaveis").notNull().default(true),
    requerInstalacao: boolean("requer_instalacao").notNull().default(false),
    requerArte: boolean("requer_arte").notNull().default(false),
    observacoesInternas: text("observacoes_internas"),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_products_categoria").on(t.categoria),
    index("idx_products_deleted_at").on(t.deletedAt),
  ]
);

export const insertProductSchema = createInsertSchema(products).omit({
  id: true, createdAt: true, updatedAt: true, deletedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ─── PRODUCT COMPONENTS ───────────────────────────────────────────────────────

export const productComponents = pgTable(
  "product_components",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    rawMaterialId: varchar("raw_material_id").references(() => rawMaterials.id),
    tipoConsumo: text("tipo_consumo"),
    formula: text("formula"),
    quantidadeBase: decimal("quantidade_base", { precision: 12, scale: 4 }),
    perdaAdicional: decimal("perda_adicional", { precision: 5, scale: 2 }),
    opcional: boolean("opcional").notNull().default(false),
    observacaoTecnica: text("observacao_tecnica"),
    ordem: integer("ordem").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_product_components_product").on(t.productId),
  ]
);

export const insertProductComponentSchema = createInsertSchema(productComponents).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertProductComponent = z.infer<typeof insertProductComponentSchema>;
export type ProductComponent = typeof productComponents.$inferSelect;

// ─── AI PRODUCT GENERATIONS ───────────────────────────────────────────────────

export const aiProductGenerations = pgTable(
  "ai_product_generations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    promptOriginal: text("prompt_original").notNull(),
    respostaRaw: text("resposta_raw"),
    composicaoSugerida: jsonb("composicao_sugerida"),
    duvidas: text("duvidas"),
    confianca: integer("confianca"),
    aprovadoPor: varchar("aprovado_por").references(() => users.id),
    productIdGerado: varchar("product_id_gerado").references(() => products.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const insertAiProductGenerationSchema = createInsertSchema(aiProductGenerations).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertAiProductGeneration = z.infer<typeof insertAiProductGenerationSchema>;
export type AiProductGeneration = typeof aiProductGenerations.$inferSelect;

// ─── COMPANIES ────────────────────────────────────────────────────────────────

export const companies = pgTable(
  "companies",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    codigo: text("codigo"),
    razaoSocial: text("razao_social").notNull(),
    nomeFantasia: text("nome_fantasia").notNull(),
    cnpj: text("cnpj").notNull(),
    suframa: text("suframa"),
    inscricaoEstadual: text("inscricao_estadual"),
    inscricaoMunicipal: text("inscricao_municipal"),
    endereco: text("endereco"),
    numero: text("numero"),
    complemento: text("complemento"),
    cep: text("cep"),
    estado: text("estado"),
    cidade: text("cidade"),
    bairro: text("bairro"),
    telefone: text("telefone"),
    fax: text("fax"),
    site: text("site"),
    email: text("email"),
    status: text("status").notNull().default("ativa"),
    isPadrao: boolean("is_padrao").notNull().default(false),
    logo: text("logo"),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_companies_cnpj").on(t.cnpj),
    index("idx_companies_status").on(t.status),
  ]
);

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true, createdAt: true, updatedAt: true, deletedAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// ─── QUOTES ───────────────────────────────────────────────────────────────────

export const quoteStatusEnum = pgEnum("quote_status", [
  "rascunho",
  "enviado",
  "aprovado",
  "reprovado",
  "cancelado",
]);

export const quotes = pgTable(
  "quotes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    numero: text("numero").unique().notNull(),
    clientId: varchar("client_id").notNull().references(() => clients.id),
    contactId: varchar("contact_id").references(() => clientContacts.id),
    sellerId: varchar("seller_id").references(() => sellers.id),
    companyId: varchar("company_id").references(() => companies.id),
    data: date("data").notNull(),
    validade: date("validade"),
    status: quoteStatusEnum("status").notNull().default("rascunho"),
    desconto: decimal("desconto", { precision: 5, scale: 2 }).default("0"),
    impostos: decimal("impostos", { precision: 5, scale: 2 }).default("0"),
    prazoProd: text("prazo_prod"),
    prazosPagamentoId: varchar("prazos_pagamento_id").references(() => paymentTerms.id),
    formaPagamento: text("forma_pagamento"),
    observacoes: text("observacoes"),
    valorTotal: decimal("valor_total", { precision: 14, scale: 2 }).default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_quotes_client").on(t.clientId),
    index("idx_quotes_status").on(t.status),
    index("idx_quotes_numero").on(t.numero),
    index("idx_quotes_deleted_at").on(t.deletedAt),
  ]
);

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true, createdAt: true, updatedAt: true, deletedAt: true,
});
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// ─── QUOTE ITEMS ──────────────────────────────────────────────────────────────

export const quoteItems = pgTable(
  "quote_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
    productId: varchar("product_id").references(() => products.id),
    descricao: text("descricao").notNull(),
    largura: decimal("largura", { precision: 10, scale: 3 }),
    altura: decimal("altura", { precision: 10, scale: 3 }),
    area: decimal("area", { precision: 12, scale: 4 }),
    quantidade: decimal("quantidade", { precision: 12, scale: 3 }).notNull().default("1"),
    unidade: text("unidade"),
    custoCalculado: decimal("custo_calculado", { precision: 14, scale: 4 }),
    precoUnitario: decimal("preco_unitario", { precision: 14, scale: 4 }).notNull().default("0"),
    precoTotal: decimal("preco_total", { precision: 14, scale: 4 }).notNull().default("0"),
    observacoes: text("observacoes"),
    ordem: integer("ordem").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_quote_items_quote").on(t.quoteId),
  ]
);

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "aguardando_producao",
  "em_producao",
  "finalizado",
  "entregue",
  "cancelado",
]);

export const orders = pgTable(
  "orders",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    numero: text("numero").unique().notNull(),
    quoteId: varchar("quote_id").references(() => quotes.id),
    clientId: varchar("client_id").notNull().references(() => clients.id),
    companyId: varchar("company_id").references(() => companies.id),
    data: date("data").notNull(),
    status: orderStatusEnum("status").notNull().default("aguardando_producao"),
    valorTotal: decimal("valor_total", { precision: 14, scale: 2 }).default("0"),
    prazosPagamentoId: varchar("prazos_pagamento_id").references(() => paymentTerms.id),
    formaPagamento: text("forma_pagamento"),
    prazoEntrega: date("prazo_entrega"),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("idx_orders_client").on(t.clientId),
    index("idx_orders_status").on(t.status),
    index("idx_orders_numero").on(t.numero),
    index("idx_orders_deleted_at").on(t.deletedAt),
  ]
);

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true, createdAt: true, updatedAt: true, deletedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ─── ORDER ITEMS ──────────────────────────────────────────────────────────────

export const orderItems = pgTable(
  "order_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: varchar("product_id").references(() => products.id),
    descricao: text("descricao").notNull(),
    largura: decimal("largura", { precision: 10, scale: 3 }),
    altura: decimal("altura", { precision: 10, scale: 3 }),
    area: decimal("area", { precision: 12, scale: 4 }),
    quantidade: decimal("quantidade", { precision: 12, scale: 3 }).notNull().default("1"),
    unidade: text("unidade"),
    precoUnitario: decimal("preco_unitario", { precision: 14, scale: 4 }).notNull().default("0"),
    precoTotal: decimal("preco_total", { precision: 14, scale: 4 }).notNull().default("0"),
    observacoes: text("observacoes"),
    ordem: integer("ordem").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_order_items_order").on(t.orderId),
  ]
);

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// ─── WHATSAPP SESSIONS ────────────────────────────────────────────────────────

export const whatsappSessions = pgTable(
  "whatsapp_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    from: varchar("from").notNull(),
    step: varchar("step").notNull().default("menu"),
    data: jsonb("data").default({}),
    clientId: varchar("client_id").references(() => clients.id),
    quoteId: varchar("quote_id").references(() => quotes.id),
    status: varchar("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_wa_sessions_from").on(t.from),
    index("idx_wa_sessions_status").on(t.status),
  ]
);

export const insertWhatsappSessionSchema = createInsertSchema(whatsappSessions).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertWhatsappSession = z.infer<typeof insertWhatsappSessionSchema>;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").references(() => whatsappSessions.id, { onDelete: "cascade" }),
    direction: varchar("direction").notNull(),
    body: text("body").notNull(),
    from: varchar("from"),
    to: varchar("to"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_wa_messages_session").on(t.sessionId),
  ]
);

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

// ─── QUOTE RULES ─────────────────────────────────────────────────────────────

export const quoteRules = pgTable(
  "quote_rules",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    regra: text("regra").notNull(),
    ativa: boolean("ativa").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const insertQuoteRuleSchema = createInsertSchema(quoteRules).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertQuoteRule = z.infer<typeof insertQuoteRuleSchema>;
export type QuoteRule = typeof quoteRules.$inferSelect;

// ─── VEHICLE CONTROL ─────────────────────────────────────────────────────────

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "ativo",
  "manutencao",
  "inativo",
]);

export const fuelTypeEnum = pgEnum("fuel_type", [
  "gasolina",
  "etanol",
  "diesel",
  "flex",
  "gnv",
  "eletrico",
  "hibrido",
]);

export const fuelLevelEnum = pgEnum("fuel_level", [
  "vazio",
  "quarto",
  "metade",
  "tres_quartos",
  "cheio",
]);

export const vehicleExitStatusEnum = pgEnum("vehicle_exit_status", [
  "em_rota",
  "finalizada",
  "cancelada",
]);

export const vehicles = pgTable(
  "vehicles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    placa: text("placa").notNull().unique(),
    numeroInterno: integer("numero_interno"),
    modelo: text("modelo").notNull(),
    marca: text("marca").notNull(),
    ano: integer("ano"),
    cor: text("cor"),
    tipoCombustivel: fuelTypeEnum("tipo_combustivel"),
    kmAtual: decimal("km_atual", { precision: 12, scale: 1 }),
    consumoMedioKmL: decimal("consumo_medio_km_l", { precision: 6, scale: 2 }),
    status: vehicleStatusEnum("status").notNull().default("ativo"),
    observacoes: text("observacoes"),
    ocorrenciaAberta: boolean("ocorrencia_aberta").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vehicles_placa").on(t.placa),
    index("idx_vehicles_status").on(t.status),
  ]
);

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

export const vehicleExits = pgTable(
  "vehicle_exits",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id),
    driverId: varchar("driver_id").notNull().references(() => sellers.id),
    dataHoraSaida: timestamp("data_hora_saida").notNull(),
    kmInicial: decimal("km_inicial", { precision: 12, scale: 1 }),
    combustivelInicial: fuelLevelEnum("combustivel_inicial"),
    fotoInicialUrl: text("foto_inicial_url"),
    // IA — análise painel inicial
    origemKmInicial: text("origem_km_inicial"),
    origemCombustivelInicial: text("origem_combustivel_inicial"),
    leituraKmInicialConfianca: decimal("leitura_km_inicial_confianca", { precision: 5, scale: 2 }),
    leituraCombustivelInicialConfianca: decimal("leitura_combustivel_inicial_confianca", { precision: 5, scale: 2 }),
    alertasPainelInicial: text("alertas_painel_inicial"),
    fotoInicialAnalisadaEm: timestamp("foto_inicial_analisada_em"),
    painelInicialRawAnalise: text("painel_inicial_raw_analise"),
    orderId: varchar("order_id").references(() => orders.id),
    motivoSaida: text("motivo_saida"),
    destino: text("destino"),
    status: vehicleExitStatusEnum("status").notNull().default("em_rota"),
    // Return fields
    dataHoraRetorno: timestamp("data_hora_retorno"),
    kmFinal: decimal("km_final", { precision: 12, scale: 1 }),
    combustivelFinal: fuelLevelEnum("combustivel_final"),
    fotoFinalUrl: text("foto_final_url"),
    observacoesRetorno: text("observacoes_retorno"),
    kmPercorridos: decimal("km_percorridos", { precision: 12, scale: 1 }),
    // IA — análise painel final
    origemKmFinal: text("origem_km_final"),
    origemCombustivelFinal: text("origem_combustivel_final"),
    leituraKmFinalConfianca: decimal("leitura_km_final_confianca", { precision: 5, scale: 2 }),
    leituraCombustivelFinalConfianca: decimal("leitura_combustivel_final_confianca", { precision: 5, scale: 2 }),
    alertasPainelFinal: text("alertas_painel_final"),
    fotoFinalAnalisadaEm: timestamp("foto_final_analisada_em"),
    painelFinalRawAnalise: text("painel_final_raw_analise"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vehicle_exits_vehicle").on(t.vehicleId),
    index("idx_vehicle_exits_driver").on(t.driverId),
    index("idx_vehicle_exits_status").on(t.status),
  ]
);

export const insertVehicleExitSchema = createInsertSchema(vehicleExits).omit({
  id: true, createdAt: true, updatedAt: true,
}).extend({
  dataHoraSaida: z.union([z.date(), z.string().transform((s) => new Date(s))]),
  dataHoraRetorno: z.union([z.date(), z.string().transform((s) => new Date(s))]).optional().nullable(),
});
export type InsertVehicleExit = z.infer<typeof insertVehicleExitSchema>;
export type VehicleExit = typeof vehicleExits.$inferSelect;

// ─── VEHICLE MAINTENANCE ─────────────────────────────────────────────────────

export const issueGravityEnum = pgEnum("issue_gravity", ["baixa", "media", "alta"]);
export const issueStatusEnum = pgEnum("issue_status", ["aberto", "em_analise", "resolvido"]);

/** Itens do plano de manutenção por veículo */
export const vehicleMaintenanceItems = pgTable(
  "vehicle_maintenance_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    periodicidadeKm: decimal("periodicidade_km", { precision: 10, scale: 0 }),
    periodicidadeMeses: integer("periodicidade_meses"),
    /** km antes de vencer para disparar amarelo (default 1000) */
    alertaAmareloKm: decimal("alerta_amarelo_km", { precision: 10, scale: 0 }).default("1000"),
    /** dias antes de vencer para disparar amarelo (default 30) */
    alertaAmareloDias: integer("alerta_amarelo_dias").default(30),
    ultimaManutencaoData: timestamp("ultima_manutencao_data"),
    ultimaManutencaoKm: decimal("ultima_manutencao_km", { precision: 12, scale: 1 }),
    proximaManutencaoData: timestamp("proxima_manutencao_data"),
    proximaManutencaoKm: decimal("proxima_manutencao_km", { precision: 12, scale: 1 }),
    observacoes: text("observacoes"),
    fonteTabela: text("fonte_tabela"),
    linkFonte: text("link_fonte"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_vmaint_vehicle").on(t.vehicleId)]
);

export const insertVehicleMaintenanceItemSchema = createInsertSchema(vehicleMaintenanceItems).omit({
  id: true, createdAt: true, updatedAt: true,
}).extend({
  ultimaManutencaoData: z.union([z.date(), z.string().transform((s) => new Date(s))]).optional().nullable(),
  proximaManutencaoData: z.union([z.date(), z.string().transform((s) => new Date(s))]).optional().nullable(),
});
export type InsertVehicleMaintenanceItem = z.infer<typeof insertVehicleMaintenanceItemSchema>;
export type VehicleMaintenanceItem = typeof vehicleMaintenanceItems.$inferSelect;

/** Histórico de manutenções realizadas */
export const vehicleMaintenanceHistory = pgTable(
  "vehicle_maintenance_history",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    itemId: varchar("item_id").references(() => vehicleMaintenanceItems.id, { onDelete: "set null" }),
    nomeItem: text("nome_item").notNull(),
    data: timestamp("data").notNull(),
    kmNoMomento: decimal("km_no_momento", { precision: 12, scale: 1 }),
    descricaoServico: text("descricao_servico"),
    oficina: text("oficina"),
    custo: decimal("custo", { precision: 10, scale: 2 }),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vmaint_hist_vehicle").on(t.vehicleId),
    index("idx_vmaint_hist_item").on(t.itemId),
  ]
);

export const insertVehicleMaintenanceHistorySchema = createInsertSchema(vehicleMaintenanceHistory).omit({
  id: true, createdAt: true,
}).extend({
  data: z.union([z.date(), z.string().transform((s) => new Date(s))]),
});
export type InsertVehicleMaintenanceHistory = z.infer<typeof insertVehicleMaintenanceHistorySchema>;
export type VehicleMaintenanceHistory = typeof vehicleMaintenanceHistory.$inferSelect;

/** Ocorrências / relatos de problemas pelos funcionários */
export const vehicleIssueReports = pgTable(
  "vehicle_issue_reports",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    reportadoPor: varchar("reportado_por").references(() => sellers.id, { onDelete: "set null" }),
    dataHora: timestamp("data_hora").notNull().defaultNow(),
    categoria: text("categoria"),
    gravidade: issueGravityEnum("gravidade").notNull().default("media"),
    descricao: text("descricao").notNull(),
    status: issueStatusEnum("status").notNull().default("aberto"),
    respostaAdmin: text("resposta_admin"),
    dataResolucao: timestamp("data_resolucao"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vissue_vehicle").on(t.vehicleId),
    index("idx_vissue_status").on(t.status),
  ]
);

export const insertVehicleIssueReportSchema = createInsertSchema(vehicleIssueReports).omit({
  id: true, createdAt: true, updatedAt: true,
}).extend({
  dataHora: z.union([z.date(), z.string().transform((s) => new Date(s))]).optional(),
  dataResolucao: z.union([z.date(), z.string().transform((s) => new Date(s))]).optional().nullable(),
});
export type InsertVehicleIssueReport = z.infer<typeof insertVehicleIssueReportSchema>;
export type VehicleIssueReport = typeof vehicleIssueReports.$inferSelect;

// ─── VEHICLE MAINTENANCE TEMPLATES ───────────────────────────────────────────

export const templateApprovalStatusEnum = pgEnum("template_approval_status", [
  "rascunho",
  "aprovado",
  "rejeitado",
]);

/**
 * Planos de manutenção homologados (por marca/modelo/ano).
 * Os itens ficam em formato JSONB para simplificar a estrutura.
 * Ao aprovar + aplicar, os itens são copiados para vehicle_maintenance_items.
 */
export const vehicleMaintenanceTemplates = pgTable(
  "vehicle_maintenance_templates",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    yearStart: integer("year_start"),
    yearEnd: integer("year_end"),
    version: text("version"),
    engine: text("engine"),
    fuel: text("fuel"),
    severeUse: boolean("severe_use").default(false),
    /** Itens do plano em JSON: Array<{ nome, periodicidadeKm, periodicidadeMeses, observacoes }> */
    items: text("items").notNull().default("[]"),
    sourceType: text("source_type").notNull().default("ia_gerado"),
    sourceUrl: text("source_url"),
    sourceTitle: text("source_title"),
    sourceFileUrl: text("source_file_url"),
    sourceNotes: text("source_notes"),
    approvalStatus: templateApprovalStatusEnum("approval_status").notNull().default("rascunho"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_vmaint_tmpl_brand").on(t.brand, t.model),
    index("idx_vmaint_tmpl_status").on(t.approvalStatus),
  ]
);

export const insertVehicleMaintenanceTemplateSchema = createInsertSchema(vehicleMaintenanceTemplates).omit({
  id: true, createdAt: true, updatedAt: true,
}).extend({
  approvedAt: z.union([z.date(), z.string().transform((s) => new Date(s))]).optional().nullable(),
});
export type InsertVehicleMaintenanceTemplate = z.infer<typeof insertVehicleMaintenanceTemplateSchema>;
export type VehicleMaintenanceTemplate = typeof vehicleMaintenanceTemplates.$inferSelect;

/** Log de cada tentativa de busca/importação de plano para um veículo */
export const vehicleMaintenanceImportLogs = pgTable(
  "vehicle_maintenance_import_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
    searchQuery: text("search_query").notNull(),
    sourceUrl: text("source_url"),
    sourceType: text("source_type"),
    resultStatus: text("result_status").notNull().default("ok"),
    templateId: varchar("template_id").references(() => vehicleMaintenanceTemplates.id, { onDelete: "set null" }),
    rawResult: text("raw_result"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_vmaint_importlog_vehicle").on(t.vehicleId)]
);

export const insertVehicleMaintenanceImportLogSchema = createInsertSchema(vehicleMaintenanceImportLogs).omit({
  id: true, createdAt: true,
});
export type InsertVehicleMaintenanceImportLog = z.infer<typeof insertVehicleMaintenanceImportLogSchema>;
export type VehicleMaintenanceImportLog = typeof vehicleMaintenanceImportLogs.$inferSelect;

// ─── WHATSAPP BOT CONFIG ──────────────────────────────────────────────────────

export const waBotConfig = pgTable("wa_bot_config", {
  id: varchar("id").primaryKey().default("default"),
  nomeBot: varchar("nome_bot", { length: 100 }).notNull().default("Assistente Gráfica+"),
  nomeEmpresa: varchar("nome_empresa", { length: 100 }).notNull().default("Gráfica+"),
  systemPrompt: text("system_prompt").notNull().default(""),
  welcomeMessage: text("welcome_message").notNull().default(""),
  cancelMessage: text("cancel_message").notNull().default(""),
  attendantMessage: text("attendant_message").notNull().default(""),
  // ── Frota (fluxo de funcionários) ──────────────────────────
  vehMsgNaoCadastrado: text("veh_msg_nao_cadastrado"),
  vehMsgNaoAutorizado: text("veh_msg_nao_autorizado"),
  vehMsgSemVeiculos: text("veh_msg_sem_veiculos"),
  vehMsgCancelado: text("veh_msg_cancelado"),
  vehMsgSaidaSucesso: text("veh_msg_saida_sucesso"),
  vehMsgRetornoSucesso: text("veh_msg_retorno_sucesso"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWaBotConfigSchema = createInsertSchema(waBotConfig).omit({ updatedAt: true });
export type InsertWaBotConfig = z.infer<typeof insertWaBotConfigSchema>;
export type WaBotConfig = typeof waBotConfig.$inferSelect;

// ─── SOLICITAÇÕES DE COMPRA ───────────────────────────────────────────────────

export const purchaseRequests = pgTable("purchase_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  solicitanteNome: text("solicitante_nome"),
  solicitanteTelefone: text("solicitante_telefone"),
  material: text("material").notNull(),
  quantidade: text("quantidade"),
  unidade: text("unidade"),
  urgencia: text("urgencia").default("normal"),
  osRelacionada: text("os_relacionada"),
  observacao: text("observacao"),
  fornecedorSugerido: text("fornecedor_sugerido"),
  status: text("status").default("pendente"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPurchaseRequestSchema = createInsertSchema(purchaseRequests).omit({ id: true, createdAt: true });
export type InsertPurchaseRequest = z.infer<typeof insertPurchaseRequestSchema>;
export type PurchaseRequest = typeof purchaseRequests.$inferSelect;

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────

export const suppliers = pgTable(
  "suppliers",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    nome: text("nome").notNull(),
    tipoPessoa: text("tipo_pessoa").notNull().default("pj"), // pj | pf
    cnpjCpf: text("cnpj_cpf"),
    telefone: text("telefone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    contato: text("contato"),
    materiaisFornecidos: text("materiais_fornecidos").array(),
    condicaoPagamentoPadrao: text("condicao_pagamento_padrao"),
    prazoMedioEntrega: text("prazo_medio_entrega"),
    observacao: text("observacao"),
    ativo: boolean("ativo").notNull().default(true),
    aceitaCotacaoWhatsapp: boolean("aceita_cotacao_whatsapp").notNull().default(true),
    whatsappAutorizado: boolean("whatsapp_autorizado").notNull().default(false),
    templateCotacaoNome: text("template_cotacao_nome").notNull().default("solicitacao_cotacao_fornecedor"),
    ultimoContatoWhatsapp: timestamp("ultimo_contato_whatsapp"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_suppliers_nome").on(t.nome),
    index("idx_suppliers_cnpj_cpf").on(t.cnpjCpf),
    index("idx_suppliers_ativo").on(t.ativo),
    index("idx_suppliers_whatsapp_autorizado").on(t.whatsappAutorizado),
  ]
);

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

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
