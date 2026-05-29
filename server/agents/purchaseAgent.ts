import OpenAI from "openai";
import { storage } from "../storage";
import type { WhatsappSession } from "@shared/schema";
import { enviarCotacaoFornecedor } from "./lucyAgent";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export const PURCH_STEPS = {
  COLETANDO: "purch_coletando",
  CONFIRMAR: "purch_confirmar",
};

interface PurchData {
  material?: string | null;
  quantidade?: string | null;
  unidade?: string | null;
  urgencia?: string | null;
  osRelacionada?: string | null;
  observacao?: string | null;
  fornecedorSugerido?: string | null;
}

const PURCHASE_PROMPT = `Você é o Agente de Compras da Gráfica+. Sua função é coletar dados para uma solicitação de compra ou pedido de material.

Dados JÁ coletados: {DADOS_COLETADOS}

Campos a coletar:
- material: o que precisa comprar/solicitar (obrigatório)
- quantidade: quanto precisa — número + unidade juntos se possível (obrigatório)
- unidade: unidade de medida: kg, litros, unidades, metros, folhas, rolos, etc. (obrigatório)
- urgencia: "normal", "urgente" ou "muito_urgente" (obrigatório, se não informado pergunte)
- osRelacionada: número de OS relacionada (opcional)
- observacao: observação adicional, especificação técnica (opcional)
- fornecedorSugerido: fornecedor preferido (opcional)

REGRAS:
1. Se o funcionário informar tudo numa mensagem, extraia tudo e marque complete=true
2. Se faltar algum campo obrigatório, pergunte de forma natural apenas pelo que está faltando
3. Se a urgência não for mencionada, pergunte — pode ser "normal", "urgente" ou "muito urgente"
4. Quando complete=true, o reply deve ser um resumo claro pedindo confirmação (SIM/NÃO)
5. Seja direto e profissional — este é um sistema interno para funcionários

Responda SOMENTE com JSON válido:
{
  "material": string | null,
  "quantidade": string | null,
  "unidade": string | null,
  "urgencia": "normal" | "urgente" | "muito_urgente" | null,
  "osRelacionada": string | null,
  "observacao": string | null,
  "fornecedorSugerido": string | null,
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

export async function handlePurchaseAgent(params: PurchaseAgentParams): Promise<void> {
  const { from, rawBody, msgNorm, session, reply } = params;
  const step = session.step;
  const data = (session.data ?? {}) as Record<string, unknown>;
  const phone = from.replace(/\D/g, "");

  const CONFIRM_WORDS = ["sim", "s", "yes", "confirmo", "ok", "pode", "correto", "certo", "isso"];
  const CANCEL_WORDS  = ["nao", "não", "n", "no", "errado", "corrigir", "cancelar"];

  // ── STEP: CONFIRMAR ───────────────────────────────────────────────────────
  if (step === PURCH_STEPS.CONFIRMAR) {
    if (CONFIRM_WORDS.includes(msgNorm)) {
      try {
        const material    = (data.purch_material as string) || "Material não especificado";
        const quantidade  = (data.purch_quantidade as string) || null;
        const unidade     = (data.purch_unidade as string) || null;
        const fornNome    = (data.purch_fornecedor as string) || null;
        const solicitante = (data.purch_solicitante as string) || null;

        await storage.createPurchaseRequest({
          solicitanteNome: solicitante,
          solicitanteTelefone: phone,
          material,
          quantidade,
          unidade,
          urgencia: (data.purch_urgencia as string) || "normal",
          osRelacionada: (data.purch_os as string) || null,
          observacao: (data.purch_obs as string) || null,
          fornecedorSugerido: fornNome,
          status: "pendente",
        } as any);

        const urgLabels: Record<string, string> = {
          muito_urgente: "🔴 Muito urgente",
          urgente: "🟡 Urgente",
          normal: "🟢 Normal",
        };
        const urg = (data.purch_urgencia as string) || "normal";

        // ── Disparar cotação WhatsApp ──────────────────────────────────────
        let linhaFornecedor = "";
        try {
          if (fornNome && fornNome.trim().length > 0) {
            // Fornecedor específico pedido → busca pelo nome
            const { data: lista } = await storage.getSuppliers({ search: fornNome, ativo: true, limit: 5 });
            const alvo = lista.find(s =>
              s.aceitaCotacaoWhatsapp && s.whatsappAutorizado && s.whatsapp && s.templateCotacaoNome
            );
            if (alvo) {
              const res = await enviarCotacaoFornecedor(alvo, `Solicitação de compra de ${material}`, solicitante ?? undefined, material, quantidade ?? undefined);
              linhaFornecedor = res.sucesso
                ? `\n📨 Cotação enviada para *${alvo.nomeFantasia ?? alvo.nome}* via WhatsApp${res.usouTemplate ? " (template)" : ""}.`
                : `\n⚠️ Não foi possível enviar WhatsApp para ${alvo.nome}: ${res.erro ?? "erro desconhecido"}.`;
            } else {
              linhaFornecedor = `\n⚠️ Fornecedor *"${fornNome}"* não encontrado ou não está habilitado para cotação via WhatsApp.`;
            }
          } else {
            // Sem fornecedor específico → busca elegíveis pelo material
            const { data: lista } = await storage.getSuppliers({
              ativo: true,
              aceitaCotacaoWhatsapp: true,
              whatsappAutorizado: true,
              material,
              limit: 10,
            });
            const elegiveis = lista.filter(s => s.whatsapp && s.templateCotacaoNome);
            if (elegiveis.length > 0) {
              const resultados = await Promise.all(
                elegiveis.map(s => enviarCotacaoFornecedor(s, `Solicitação de compra de ${material}`, solicitante ?? undefined, material, quantidade ?? undefined))
              );
              const enviados = elegiveis.filter((_, i) => resultados[i].sucesso).map(s => s.nomeFantasia ?? s.nome);
              linhaFornecedor = enviados.length > 0
                ? `\n📨 Cotação enviada para: *${enviados.join(", ")}*.`
                : `\n⚠️ Nenhum fornecedor elegível encontrado para envio automático.`;
            } else {
              linhaFornecedor = `\n💡 Nenhum fornecedor cadastrado e habilitado para cotação automática via WhatsApp.`;
            }
          }
        } catch (waErr) {
          console.error("[PurchaseAgent] Erro ao enviar cotação WA:", waErr);
          linhaFornecedor = `\n⚠️ Erro ao disparar cotação WhatsApp.`;
        }

        await reply(
          `✅ *Solicitação registrada com sucesso!*\n\n` +
          `📦 *Material:* ${material}\n` +
          `🔢 *Quantidade:* ${quantidade ?? "—"} ${unidade ?? ""}\n` +
          `⚡ *Urgência:* ${urgLabels[urg] ?? urg}\n` +
          (data.purch_os ? `🔖 *OS:* ${data.purch_os}\n` : "") +
          (data.purch_obs ? `📝 *Obs:* ${data.purch_obs}\n` : "") +
          (fornNome ? `🏪 *Fornecedor:* ${fornNome}\n` : "") +
          linhaFornecedor +
          `\n\nObrigado! 🙏`,
          "collecting",
          {}
        );
      } catch (err) {
        console.error("[PurchaseAgent] Erro ao salvar:", err);
        await reply("❌ Erro ao registrar a solicitação. Tente novamente.", "collecting", {});
      }
      return;
    }

    if (CANCEL_WORDS.some(w => msgNorm.includes(w))) {
      await reply(
        `Ok, vamos corrigir. Me diga novamente o que você precisa:`,
        PURCH_STEPS.COLETANDO,
        {}
      );
      return;
    }

    await reply(`Por favor, responda *SIM* para confirmar ou *NÃO* para corrigir.`);
    return;
  }

  // ── STEP: COLETANDO (IA) ──────────────────────────────────────────────────
  const purchData: PurchData = {
    material:          (data.purch_material as string) || null,
    quantidade:        (data.purch_quantidade as string) || null,
    unidade:           (data.purch_unidade as string) || null,
    urgencia:          (data.purch_urgencia as string) || null,
    osRelacionada:     (data.purch_os as string) || null,
    observacao:        (data.purch_obs as string) || null,
    fornecedorSugerido:(data.purch_fornecedor as string) || null,
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
        { role: "user", content: rawBody },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 400,
    });

    const result = JSON.parse(resp.choices[0].message.content ?? "{}") as PurchData & { reply: string; complete: boolean };

    const newData: Record<string, unknown> = {
      ...data,
      agente: "compras",
      purch_material:    result.material    ?? purchData.material,
      purch_quantidade:  result.quantidade  ?? purchData.quantidade,
      purch_unidade:     result.unidade     ?? purchData.unidade,
      purch_urgencia:    result.urgencia    ?? purchData.urgencia,
      purch_os:          result.osRelacionada ?? purchData.osRelacionada,
      purch_obs:         result.observacao  ?? purchData.observacao,
      purch_fornecedor:  result.fornecedorSugerido ?? purchData.fornecedorSugerido,
    };

    if (result.complete) {
      await reply(result.reply, PURCH_STEPS.CONFIRMAR, newData);
    } else {
      await reply(result.reply, PURCH_STEPS.COLETANDO, newData);
    }
  } catch (err) {
    console.error("[PurchaseAgent] Erro na IA:", err);
    await reply(
      `🛒 Olá! Sou o Agente de Compras.\n\nPode me dizer o que precisa? Informe:\n• O material\n• A quantidade\n• A urgência (normal/urgente)`,
      PURCH_STEPS.COLETANDO,
      { ...data, agente: "compras" }
    );
  }
}
