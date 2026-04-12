/**
 * MaintenanceTemplateResolver
 *
 * Serviço responsável por buscar/gerar um plano de manutenção para um veículo
 * usando IA (OpenAI), além de suporte a modo manual (texto colado).
 *
 * Fluxo:
 *   1. Verificar se já existe template aprovado compatível no banco
 *   2. Se não, usar IA para gerar plano baseado em dados do veículo
 *   3. Salvar como rascunho + log de importação
 *   4. Aguardar aprovação administrativa antes de aplicar ao veículo
 *   5. Ao aprovar, copiar itens para vehicle_maintenance_items
 */

import OpenAI from "openai";
import { db } from "./db";
import { eq, and, gte, lte, or, isNull } from "drizzle-orm";
import {
  vehicleMaintenanceTemplates,
  vehicleMaintenanceImportLogs,
  vehicleMaintenanceItems,
  vehicles,
  type Vehicle,
  type VehicleMaintenanceTemplate,
  type InsertVehicleMaintenanceTemplate,
} from "@shared/schema";

// ─── OpenAI client ────────────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateItem {
  nome: string;
  periodicidadeKm: number | null;
  periodicidadeMeses: number | null;
  observacoes?: string;
}

export interface ResolverResult {
  found: boolean;
  template: VehicleMaintenanceTemplate | null;
  items: TemplateItem[];
  sourceType: string;
  sourceTitle: string;
  searchQuery: string;
  error?: string;
}

// ─── Helper: normalizar string para comparação ────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── 1. Procurar template aprovado compatível no banco ────────────────────────

export async function findCompatibleTemplate(
  vehicle: Vehicle
): Promise<VehicleMaintenanceTemplate | null> {
  const allApproved = await db
    .select()
    .from(vehicleMaintenanceTemplates)
    .where(eq(vehicleMaintenanceTemplates.approvalStatus, "aprovado"));

  const brand = normalize(vehicle.marca);
  const model = normalize(vehicle.modelo);
  const year = vehicle.ano ?? null;

  for (const tmpl of allApproved) {
    const tmplBrand = normalize(tmpl.brand);
    const tmplModel = normalize(tmpl.model);

    // Brand + model devem coincidir (comparação fuzzy simples)
    if (!brand.includes(tmplBrand) && !tmplBrand.includes(brand)) continue;
    if (!model.includes(tmplModel) && !tmplModel.includes(model)) continue;

    // Verificar ano dentro do intervalo se definido
    if (year !== null) {
      if (tmpl.yearStart && year < tmpl.yearStart) continue;
      if (tmpl.yearEnd && year > tmpl.yearEnd) continue;
    }

    return tmpl;
  }

  return null;
}

// ─── 2. Gerar plano de manutenção via IA ─────────────────────────────────────

/**
 * Usa OpenAI para gerar um plano de manutenção baseado nos dados do veículo.
 * Retorna os itens parseados + informações de fonte.
 *
 * NOTA: A IA gera intervalos baseados em conhecimento técnico do modelo/motor,
 * não em scraping de sites. Para dados oficiais, o admin deve revisar e editar.
 */
export async function searchOfficialSource(vehicle: Vehicle): Promise<{
  items: TemplateItem[];
  sourceTitle: string;
  sourceType: string;
  rawResult: string;
}> {
  const desc = [
    vehicle.marca,
    vehicle.modelo,
    vehicle.ano ? `${vehicle.ano}` : null,
    vehicle.tipoCombustivel ? `(${vehicle.tipoCombustivel})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const searchQuery = `${vehicle.marca} ${vehicle.modelo}${vehicle.ano ? ` ${vehicle.ano}` : ""}`;

  const prompt = `Você é um especialista em manutenção automotiva brasileira.
Gere o plano de manutenção preventiva para o seguinte veículo:
  ${desc}

Retorne um JSON com o seguinte formato:
{
  "veiculo": "descrição completa",
  "fonte": "Manual do proprietário ${vehicle.marca} ${vehicle.modelo} / Tabela de revisões padrão",
  "observacoes": "baseado em uso normal; revisão severa pode exigir intervalos menores",
  "itens": [
    {
      "nome": "Troca de óleo do motor",
      "periodicidadeKm": 10000,
      "periodicidadeMeses": 12,
      "observacoes": ""
    }
  ]
}

Inclua todos os itens relevantes:
- Troca de óleo do motor (com tipo recomendado se souber)
- Filtro de óleo
- Filtro de ar do motor
- Filtro de combustível
- Filtro do ar-condicionado (cabine)
- Pastilhas de freio dianteiras
- Pastilhas de freio traseiras (se aplicável)
- Disco de freio
- Correia dentada ou correia de distribuição (se aplicável ao motor)
- Vela de ignição (se motor a gasolina/flex/gnv)
- Cabo de vela (se aplicável)
- Líquido de arrefecimento (fluido)
- Fluido de freio (DOT)
- Alinhamento e balanceamento
- Rodízio de pneus
- Amortecedores (inspeção)
- Bateria (inspeção/troca)
- Correia do alternador / poly-V
- Embreagem (inspeção — se câmbio manual)
- Velas de aquecimento (se diesel)
- Revisão geral dos freios

Preencha periodicidadeKm e/ou periodicidadeMeses conforme o manual tipicamente recomenda para este veículo.
Use null se um critério não se aplica.
Retorne APENAS o JSON, sem texto adicional.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const rawResult = response.choices[0]?.message?.content ?? "{}";
  const items = parseMaintenanceIntervals(rawResult);

  return {
    items,
    sourceTitle: `Plano gerado por IA — ${desc}`,
    sourceType: "ia_gerado",
    rawResult,
  };
}

// ─── 3. Parsear resposta de texto em TemplateItems ────────────────────────────

export function parseMaintenanceIntervals(rawContent: string): TemplateItem[] {
  try {
    // Tentar extrair JSON do texto (pode ter texto ao redor)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const data = JSON.parse(jsonMatch[0]);
    const itens: TemplateItem[] = [];

    const rawItens: any[] = data.itens ?? data.items ?? [];
    for (const item of rawItens) {
      if (!item?.nome) continue;
      itens.push({
        nome: String(item.nome),
        periodicidadeKm: item.periodicidadeKm != null ? Number(item.periodicidadeKm) : null,
        periodicidadeMeses: item.periodicidadeMeses != null ? Number(item.periodicidadeMeses) : null,
        observacoes: item.observacoes ? String(item.observacoes) : undefined,
      });
    }

    return itens;
  } catch {
    return [];
  }
}

// ─── 4. Criar template rascunho no banco ──────────────────────────────────────

export async function createDraftTemplate(data: {
  vehicle: Vehicle;
  items: TemplateItem[];
  sourceType: string;
  sourceTitle: string;
  sourceUrl?: string;
  sourceNotes?: string;
  rawResult?: string;
}): Promise<VehicleMaintenanceTemplate> {
  const [template] = await db
    .insert(vehicleMaintenanceTemplates)
    .values({
      brand: data.vehicle.marca,
      model: data.vehicle.modelo,
      yearStart: data.vehicle.ano ?? null,
      yearEnd: data.vehicle.ano ?? null,
      fuel: data.vehicle.tipoCombustivel ?? null,
      items: JSON.stringify(data.items),
      sourceType: data.sourceType,
      sourceTitle: data.sourceTitle,
      sourceUrl: data.sourceUrl ?? null,
      sourceNotes: data.sourceNotes ?? null,
      approvalStatus: "rascunho",
    } as any)
    .returning();

  return template;
}

// ─── 5. Aplicar template ao veículo (copiar itens) ───────────────────────────

/**
 * Copia os itens do template aprovado para vehicle_maintenance_items do veículo.
 * Não altera histórico já existente.
 * Não recria itens que já existem (por nome).
 */
export async function applyTemplateToVehicle(
  template: VehicleMaintenanceTemplate,
  vehicleId: string
): Promise<{ created: number; skipped: number }> {
  const items: TemplateItem[] = JSON.parse(template.items || "[]");

  // Buscar itens já existentes
  const existing = await db
    .select({ nome: vehicleMaintenanceItems.nome })
    .from(vehicleMaintenanceItems)
    .where(eq(vehicleMaintenanceItems.vehicleId, vehicleId));

  const existingNames = new Set(existing.map((i) => normalize(i.nome)));

  const toCreate = items.filter((i) => !existingNames.has(normalize(i.nome)));

  if (toCreate.length > 0) {
    await db.insert(vehicleMaintenanceItems).values(
      toCreate.map((i) => ({
        vehicleId,
        nome: i.nome,
        periodicidadeKm: i.periodicidadeKm ? String(i.periodicidadeKm) : null,
        periodicidadeMeses: i.periodicidadeMeses ?? null,
        alertaAmareloKm: "1000",
        alertaAmareloDias: 30,
        observacoes: i.observacoes ?? null,
        fonteTabela: template.sourceTitle ?? "Template homologado",
        linkFonte: template.sourceUrl ?? null,
      }))
    );
  }

  return { created: toCreate.length, skipped: items.length - toCreate.length };
}

// ─── 6. Criar plano a partir de texto colado manualmente ─────────────────────

/**
 * Modo manual: recebe texto livre colado pelo usuário (manual, PDF copiado, etc.)
 * e usa IA para extrair os intervalos de manutenção.
 */
export async function importTemplateFromManualText(
  vehicle: Vehicle,
  pastedText: string
): Promise<{ items: TemplateItem[]; rawResult: string }> {
  const prompt = `Você é um especialista em manutenção automotiva.
O usuário colou o seguinte texto de um manual de manutenção para o veículo ${vehicle.marca} ${vehicle.modelo}${vehicle.ano ? ` ${vehicle.ano}` : ""}:

---
${pastedText.slice(0, 3000)}
---

Extraia do texto acima todos os itens de manutenção preventiva com seus intervalos (km e/ou meses).
Retorne APENAS um JSON no formato:
{
  "itens": [
    { "nome": "...", "periodicidadeKm": number|null, "periodicidadeMeses": number|null, "observacoes": "..." }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 1500,
  });

  const rawResult = response.choices[0]?.message?.content ?? "{}";
  const items = parseMaintenanceIntervals(rawResult);

  return { items, rawResult };
}

// ─── 7. Fluxo principal: resolver para um veículo ────────────────────────────

export async function resolveMaintenancePlan(
  vehicle: Vehicle
): Promise<ResolverResult> {
  const searchQuery = [vehicle.marca, vehicle.modelo, vehicle.ano, vehicle.tipoCombustivel]
    .filter(Boolean)
    .join(" ");

  // Passo 1: verificar banco local
  try {
    const existing = await findCompatibleTemplate(vehicle);
    if (existing) {
      await db.insert(vehicleMaintenanceImportLogs).values({
        vehicleId: vehicle.id,
        searchQuery,
        sourceType: "banco_homologado",
        resultStatus: "encontrado_banco",
        templateId: existing.id,
      } as any);

      return {
        found: true,
        template: existing,
        items: JSON.parse(existing.items || "[]"),
        sourceType: "banco_homologado",
        sourceTitle: existing.sourceTitle ?? "Plano homologado",
        searchQuery,
      };
    }
  } catch (err) {
    console.error("[MaintenanceResolver] Erro ao buscar banco:", err);
  }

  // Passo 2: gerar via IA
  try {
    const { items, sourceTitle, sourceType, rawResult } = await searchOfficialSource(vehicle);

    // Criar rascunho no banco
    const template = await createDraftTemplate({
      vehicle,
      items,
      sourceType,
      sourceTitle,
      sourceNotes: "Gerado automaticamente por IA — revisar antes de ativar",
      rawResult,
    });

    // Salvar log
    await db.insert(vehicleMaintenanceImportLogs).values({
      vehicleId: vehicle.id,
      searchQuery,
      sourceType,
      resultStatus: "rascunho_criado",
      templateId: template.id,
      rawResult: rawResult.slice(0, 5000),
    } as any);

    return {
      found: true,
      template,
      items,
      sourceType,
      sourceTitle,
      searchQuery,
    };
  } catch (err: any) {
    // Salvar log de erro
    await db.insert(vehicleMaintenanceImportLogs).values({
      vehicleId: vehicle.id,
      searchQuery,
      sourceType: "ia_gerado",
      resultStatus: "erro",
      rawResult: String(err?.message ?? err),
    } as any).catch(() => {});

    return {
      found: false,
      template: null,
      items: [],
      sourceType: "erro",
      sourceTitle: "",
      searchQuery,
      error: String(err?.message ?? err),
    };
  }
}
