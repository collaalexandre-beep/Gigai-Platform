import OpenAI from "openai";
import { storage } from "../storage";
import type { WhatsappSession } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export const PURCH_STEPS = {
  COLETANDO: "purch_coletando",
  CONFIRMAR:  "purch_confirmar",
};

interface PurchData {
  solicitanteNome?: string | null;
  material?:        string | null;
  quantidade?:      string | null;
  unidade?:         string | null;
  osId?:            string | null;
  tipoCompra?:      string | null;
  urgencia?:        string | null;
  observacao?:      string | null;
}

// Campos obrigatórios antes de registrar
const REQUIRED: (keyof PurchData)[] = ["material", "quantidade", "tipoCompra"];

const TIPO_LABELS: Record<string, string> = {
  os:          "📋 OS (Ordem de Serviço)",
  estoque:     "📦 Reposição de estoque",
  expediente:  "🖊️ Material de expediente",
  manutencao:  "🔧 Manutenção",
};

const URGENCIA_LABELS: Record<string, string> = {
  muito_urgente: "🔴 Muito urgente",
  urgente:       "🟡 Urgente",
  normal:        "🟢 Normal",
};

const PURCHASE_PROMPT = `Você é o Agente de Compras da Gráfica+. Sua função é coletar dados para uma solicitação de compra interna.

Dados JÁ coletados: {DADOS_COLETADOS}

Campos a coletar:
- solicitanteNome: nome do funcionário que está solicitando (obrigatório se não informado)
- material: o que precisa comprar (obrigatório)
- quantidade: quanto — número (obrigatório)
- unidade: unidade de medida: kg, litros, un, metros, folhas, rolos, caixas, etc. (obrigatório)
- tipoCompra: finalidade — DEVE ser um destes: "os" (para uma OS específica), "estoque" (reposição de estoque), "expediente" (material de escritório/expediente), "manutencao" (manutenção de equipamento/veículo) — (OBRIGATÓRIO)
- osId: número da OS relacionada, se tipoCompra for "os" (obrigatório quando tipoCompra=os, senão opcional)
- urgencia: "normal", "urgente" ou "muito_urgente" (obrigatório, pergunte se não informado)
- observacao: especificação técnica, marca preferida, local de entrega, etc. (opcional)

REGRAS:
1. material, quantidade e tipoCompra são campos OBRIGATÓRIOS — não prossiga sem eles
2. Se tipoCompra for "os" mas osId não foi informado, peça o número da OS
3. Se a urgência não for mencionada, pergunte — pode ser "normal", "urgente" ou "muito urgente"
4. Quando todos os campos obrigatórios estiverem preenchidos, marque complete=true e gere um resumo pedindo confirmação
5. No resumo de confirmação, mostre os dados de forma clara e peça SIM/NÃO
6. Seja direto e profissional — este é um sistema interno para funcionários

Responda SOMENTE com JSON válido:
{
  "solicitanteNome": string | null,
  "material": string | null,
  "quantidade": string | null,
  "unidade": string | null,
  "osId": string | null,
  "tipoCompra": "os" | "estoque" | "expediente" | "manutencao" | null,
  "urgencia": "normal" | "urgente" | "muito_urgente" | null,
  "observacao": string | null,
  "reply": string,
  "complete": boolean
}`;

export interface PurchaseAgentParams {
  from: string;
  rawBody: string;
  msgNorm: string;
  session: WhatsappSession;
  reply: (msg: string, nextStep?: string, extraData?: Record<string, unknown>) => Promise<void>;
}

function formatCodigo(codigo: number): string {
  return `SC-${String(codigo).padStart(6, "0")}`;
}

export async function handlePurchaseAgent(params: PurchaseAgentParams): Promise<void> {
  const { from, rawBody, msgNorm, session, reply } = params;
  const step = session.step;
  const data = (session.data ?? {}) as Record<string, unknown>;
  const phone = from.replace(/\D/g, "");

  const CONFIRM_WORDS = ["sim", "s", "yes", "confirmo", "ok", "pode", "correto", "certo", "isso"];
  const CANCEL_WORDS  = ["nao", "não", "n", "no", "errado", "corrigir", "cancelar", "voltar"];

  // ── STEP: CONFIRMAR ─────────────────────────────────────────────────────────
  if (step === PURCH_STEPS.CONFIRMAR) {
    if (CONFIRM_WORDS.includes(msgNorm)) {
      try {
        const row = await storage.createPurchaseRequest({
          solicitanteNome:     (data.purch_solicitante as string) || null,
          solicitanteTelefone: phone,
          material:            (data.purch_material as string) || "Material não especificado",
          quantidade:          (data.purch_quantidade as string) || null,
          unidade:             (data.purch_unidade as string) || null,
          osId:                (data.purch_os as string) || null,
          tipoCompra:          (data.purch_tipo as string) || null,
          urgencia:            (data.purch_urgencia as string) || "normal",
          observacao:          (data.purch_obs as string) || null,
          status:              "aguardando_aprovacao",
        });

        const codigo = formatCodigo(row.codigo);
        const urg    = (data.purch_urgencia as string) || "normal";
        const tipo   = (data.purch_tipo as string) || "";

        await reply(
          `✅ *Solicitação de compra registrada com sucesso!*\n` +
          `📎 *Código: ${codigo}*\n\n` +
          `📦 *Material:* ${data.purch_material}\n` +
          `🔢 *Quantidade:* ${data.purch_quantidade} ${data.purch_unidade ?? ""}\n` +
          `🏷️ *Tipo:* ${TIPO_LABELS[tipo] ?? tipo}\n` +
          `⚡ *Urgência:* ${URGENCIA_LABELS[urg] ?? urg}\n` +
          (data.purch_os  ? `🔖 *OS:* ${data.purch_os}\n`  : "") +
          (data.purch_obs ? `📝 *Obs:* ${data.purch_obs}\n` : "") +
          `\nVou encaminhar para aprovação. Obrigado! 🙏`,
          "collecting",
          {}
        );
      } catch (err) {
        console.error("[PurchaseAgent] Erro ao salvar:", err);
        await reply("❌ Erro ao registrar a solicitação. Tente novamente.", PURCH_STEPS.COLETANDO, {});
      }
      return;
    }

    if (CANCEL_WORDS.some(w => msgNorm.includes(w))) {
      await reply(
        `Ok, vamos corrigir. Me diga novamente o que você precisa comprar:`,
        PURCH_STEPS.COLETANDO,
        { ...data, purch_material: null, purch_quantidade: null, purch_unidade: null, purch_tipo: null }
      );
      return;
    }

    await reply(`Por favor, responda *SIM* para confirmar ou *NÃO* para corrigir.`);
    return;
  }

  // ── STEP: COLETANDO (IA) ───────────────────────────────────────────────────
  const purchData: PurchData = {
    solicitanteNome: (data.purch_solicitante as string) || null,
    material:        (data.purch_material   as string) || null,
    quantidade:      (data.purch_quantidade as string) || null,
    unidade:         (data.purch_unidade    as string) || null,
    osId:            (data.purch_os         as string) || null,
    tipoCompra:      (data.purch_tipo       as string) || null,
    urgencia:        (data.purch_urgencia   as string) || null,
    observacao:      (data.purch_obs        as string) || null,
  };

  const collectedSummary = Object.entries(purchData)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "nenhuma";

  const systemPrompt = PURCHASE_PROMPT.replace("{DADOS_COLETADOS}", collectedSummary);

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: rawBody },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500,
    });

    const result = JSON.parse(resp.choices[0].message.content ?? "{}") as PurchData & { reply: string; complete: boolean };

    const newData: Record<string, unknown> = {
      ...data,
      agente:           "compras",
      purch_solicitante: result.solicitanteNome ?? purchData.solicitanteNome,
      purch_material:    result.material        ?? purchData.material,
      purch_quantidade:  result.quantidade      ?? purchData.quantidade,
      purch_unidade:     result.unidade         ?? purchData.unidade,
      purch_os:          result.osId            ?? purchData.osId,
      purch_tipo:        result.tipoCompra      ?? purchData.tipoCompra,
      purch_urgencia:    result.urgencia        ?? purchData.urgencia,
      purch_obs:         result.observacao      ?? purchData.observacao,
    };

    // Verifica se todos os obrigatórios estão preenchidos antes de avançar
    const missing = REQUIRED.filter(f => {
      const map: Record<keyof PurchData, string> = {
        solicitanteNome: "purch_solicitante",
        material:        "purch_material",
        quantidade:      "purch_quantidade",
        unidade:         "purch_unidade",
        osId:            "purch_os",
        tipoCompra:      "purch_tipo",
        urgencia:        "purch_urgencia",
        observacao:      "purch_obs",
      };
      return !newData[map[f]];
    });

    if (result.complete && missing.length === 0) {
      await reply(result.reply, PURCH_STEPS.CONFIRMAR, newData);
    } else {
      await reply(result.reply, PURCH_STEPS.COLETANDO, newData);
    }
  } catch (err) {
    console.error("[PurchaseAgent] Erro na IA:", err);
    await reply(
      `🛒 Olá! Sou o Agente de Compras.\n\nPara registrar sua solicitação preciso saber:\n• O que você precisa comprar?\n• A quantidade e unidade\n• A finalidade (OS específica, estoque, expediente ou manutenção)`,
      PURCH_STEPS.COLETANDO,
      { ...data, agente: "compras" }
    );
  }
}
