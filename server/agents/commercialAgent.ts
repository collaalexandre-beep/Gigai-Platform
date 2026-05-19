import OpenAI from "openai";
import { storage } from "../storage";
import { suggestQuoteItem } from "../ai";
import { sendMetaDocument } from "../services/metaWhatsapp";
import type { WhatsappSession } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ─── CONSTANTES PADRÃO ────────────────────────────────────────────────────────

export const DEFAULT_SYSTEM_PROMPT = `Você é o assistente virtual da Gráfica+, uma gráfica profissional brasileira. Converse de forma natural, amigável e direta em português brasileiro.

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

export const DEFAULT_WELCOME_MSG = `Olá! 👋 Sou a assistente virtual da *Gráfica+*.\n\nComo posso te ajudar? Me diga o que você precisa — pode escrever normalmente, como:\n\n_"Quero um banner de 3x1m, 50 unidades"_\n_"Preciso de 100 adesivos 10x10cm para minha empresa"_\n_"Qual o status do meu pedido ORC-2026-0001?"_`;
export const DEFAULT_CANCEL_MSG = `Tudo bem! Recomeçamos do zero. 😊\n\nComo posso ajudar? Me diga o que você precisa!`;
export const DEFAULT_ATTENDANT_MSG = `Entendido! 🙋 Em breve um atendente entrará em contato com você.\n\nSe precisar de algo mais, é só dizer!`;

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface QuoteData {
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

export interface CommercialAgentParams {
  from: string;
  fromKey: string;
  rawBody: string;
  msgNorm: string;
  phoneNumberId: string;
  session: WhatsappSession;
  systemPrompt: string;
  attendantMsg: string;
  reply: (msg: string, nextStep?: string, extraData?: Record<string, unknown>) => Promise<void>;
}

// ─── IA: EXTRAÇÃO DE DADOS DO ORÇAMENTO ──────────────────────────────────────

async function extractQuoteInfoWithAI(
  userMessage: string,
  collected: QuoteData,
  systemPromptTemplate: string
): Promise<AiExtractResult> {
  const collected_summary = Object.entries(collected)
    .filter(([, v]) => v != null && v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "nenhuma";

  const systemPrompt = systemPromptTemplate.replace("{DADOS_COLETADOS}", collected_summary);

  try {
    const resp = await openai.chat.completions.create({
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
      produto:      result.produto      ?? collected.produto      ?? null,
      largura:      result.largura      ?? collected.largura      ?? null,
      altura:       result.altura       ?? collected.altura       ?? null,
      quantidade:   result.quantidade   ?? collected.quantidade   ?? null,
      nomeCliente:  result.nomeCliente  ?? collected.nomeCliente  ?? null,
      cidade:       result.cidade       ?? collected.cidade       ?? null,
      reply:        result.reply        ?? "Desculpe, não entendi. Pode repetir?",
      complete:     result.complete === true,
      intent:       result.intent       ?? "orcamento",
    };
  } catch (e) {
    console.error("[CommercialAgent] Erro na extração via IA:", e);
    return {
      ...collected,
      reply: "Não entendi bem. Pode me dizer o que você precisa? 😊",
      complete: false,
      intent: "outro",
    };
  }
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────

export async function handleCommercialAgent(params: CommercialAgentParams): Promise<void> {
  const { from, fromKey, rawBody, msgNorm, phoneNumberId, session, systemPrompt, attendantMsg, reply } = params;

  let currentStep = session.step;
  const data = (session.data ?? {}) as QuoteData;

  // ── STATUS QUERY ──────────────────────────────────────────────────────────
  const isStatusTrigger =
    currentStep === "status_query" ||
    (currentStep === "collecting" && (msgNorm.includes("status") || rawBody.toUpperCase().match(/^(ORC|PED)-\d{4}-\d{4}$/)));

  if (isStatusTrigger) {
    const numUpper = rawBody.trim().toUpperCase();
    if (numUpper.startsWith("ORC-") || numUpper.startsWith("PED-")) {
      const { data: qs } = await storage.getQuotes({ limit: 500 });
      const fq = qs.find((q) => q.numero === numUpper);
      if (fq) {
        const sm: Record<string, string> = { rascunho: "📝 Em análise", enviado: "📤 Enviado", aprovado: "✅ Aprovado", reprovado: "❌ Reprovado", cancelado: "🚫 Cancelado" };
        await reply(`*${fq.numero}*\nStatus: ${sm[fq.status] ?? fq.status}\nValor: R$ ${Number(fq.valorTotal || 0).toFixed(2).replace(".", ",")}\n\nPrecisa de mais alguma coisa?`, "collecting", {});
        return;
      }
      const { data: os } = await storage.getOrders({ limit: 500 });
      const fo = os.find((o) => o.numero === numUpper);
      if (fo) {
        const sm: Record<string, string> = { aguardando_producao: "⏳ Aguardando Produção", em_producao: "🏭 Em Produção", finalizado: "✅ Finalizado", entregue: "📦 Entregue", cancelado: "🚫 Cancelado" };
        await reply(`*${fo.numero}*\nStatus: ${sm[fo.status] ?? fo.status}\nValor: R$ ${Number(fo.valorTotal || 0).toFixed(2).replace(".", ",")}\n\nPrecisa de mais alguma coisa?`, "collecting", {});
        return;
      }
      await reply(`Não encontrei o número *${numUpper}*. Verifique e tente novamente.`, "status_query");
      return;
    }
    if (currentStep !== "status_query") {
      await reply(`Me informe o número do orçamento ou pedido:\n_(ex: ORC-2026-0001 ou PED-2026-0001)_`, "status_query");
      return;
    }
  }

  // ── CONFIRMAR ORÇAMENTO ───────────────────────────────────────────────────
  if (currentStep === "confirmar") {
    const confirmWords = ["sim", "s", "yes", "confirmo", "ok", "pode"];
    const cancelWords  = ["nao", "não", "n", "no", "errado", "incorreto"];

    if (confirmWords.includes(msgNorm)) {
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
        const alt  = d.altura  ?? 0;
        const qtd  = d.quantidade ?? 1;

        let quoteItemData: Record<string, unknown> = {
          quoteId: quote.id,
          descricao: d.produto ?? "Produto",
          largura: String(larg),
          altura:  String(alt),
          area:    (larg * alt).toFixed(4),
          quantidade: String(qtd),
          unidade: larg > 0 && alt > 0 ? "m²" : "un",
          custoCalculado: "0",
          precoUnitario:  "0",
          precoTotal:     "0",
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
            largura:   suggestion.largura   != null ? String(suggestion.largura) : String(larg),
            altura:    suggestion.altura    != null ? String(suggestion.altura)  : String(alt),
            area:      suggestion.area      != null ? String(suggestion.area)    : (larg * alt).toFixed(4),
            quantidade: String(suggestion.quantidade || qtd),
            unidade:    suggestion.unidade || "un",
            custoCalculado: "0",
            precoUnitario:  String(suggestion.precoUnitario ?? 0),
            precoTotal:     String(suggestion.precoTotal    ?? 0),
            observacoes:    suggestion.observacoes ?? null,
            ordem: 0,
          };
          await storage.updateQuote(quote.id, { valorTotal: String(suggestion.precoTotal ?? 0) });
        } catch (aiErr) {
          console.warn("[CommercialAgent] Erro ao calcular preço com IA:", aiErr);
        }

        await storage.setQuoteItems(quote.id, [quoteItemData as any]);
        await storage.updateWhatsappSession(session.id, { step: "done", status: "completed", clientId, quoteId: quote.id });

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
        console.error("[CommercialAgent] Erro ao criar orçamento:", e);
        await reply(`Ocorreu um erro. Por favor, tente novamente.`, "collecting");
      }
      return;
    }

    if (cancelWords.some(w => msgNorm.includes(w))) {
      await storage.updateWhatsappSession(session.id, { step: "collecting", data: {}, status: "abandoned" });
      await reply(`Tudo bem! Vamos recomeçar. 😊\n\nMe diga o que você precisa:`, "collecting");
      return;
    }

    await reply(`Por favor, responda *SIM* para confirmar ou *NÃO* para recomeçar.`);
    return;
  }

  // ── COLLECTING (IA-DRIVEN) ────────────────────────────────────────────────
  if (currentStep === "done") {
    await storage.updateWhatsappSession(session.id, { step: "collecting", data: {} });
    currentStep = "collecting";
  }

  const aiResult = await extractQuoteInfoWithAI(rawBody, data, systemPrompt);

  if (aiResult.intent === "atendente") {
    await reply(attendantMsg, "collecting", {});
    return;
  }

  if (aiResult.intent === "status") {
    await reply(`Me informe o número do orçamento ou pedido:\n_(ex: ORC-2026-0001 ou PED-2026-0001)_`, "status_query");
    return;
  }

  const newData: QuoteData = {
    produto:    aiResult.produto,
    largura:    aiResult.largura,
    altura:     aiResult.altura,
    quantidade: aiResult.quantidade,
    nomeCliente: aiResult.nomeCliente,
    cidade:     aiResult.cidade,
  };

  if (aiResult.complete) {
    await reply(aiResult.reply, "confirmar", newData as Record<string, unknown>);
  } else {
    await reply(aiResult.reply, "collecting", { ...newData as Record<string, unknown>, agente: "comercial" });
  }
}
