import OpenAI from "openai";
import { storage } from "../storage";
import { sendMetaMessage, sendMetaTemplateMessage, getMetaPhoneId } from "../services/metaWhatsapp";
import type { Seller, WhatsappSession, Supplier } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function normalizarTelefone(telefone: string): string {
  let digits = telefone.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

export interface AutorizacaoResult {
  autorizado: boolean;
  colaborador: Seller | null;
  motivo: "colaborador_autorizado" | "colaborador_nao_autorizado" | "telefone_nao_cadastrado";
}

export async function verificarAutorizacaoCompraPorTelefone(
  telefone: string
): Promise<AutorizacaoResult> {
  const normRecebido = normalizarTelefone(telefone);
  const { data: todos } = await storage.getSellers({ limit: 1000 });

  const encontrado = todos.find((s: any) => {
    const candidatos = [s.whatsappNumber, s.whatsapp, s.telefone]
      .filter(Boolean)
      .map((n: string) => normalizarTelefone(n));
    return candidatos.includes(normRecebido);
  }) ?? null;

  if (!encontrado) {
    return { autorizado: false, colaborador: null, motivo: "telefone_nao_cadastrado" };
  }
  if (encontrado.autorizadoCompras) {
    return { autorizado: true, colaborador: encontrado, motivo: "colaborador_autorizado" };
  }
  return { autorizado: false, colaborador: encontrado, motivo: "colaborador_nao_autorizado" };
}

export interface LucyAgentParams {
  from: string;
  rawBody: string;
  msgNorm: string;
  session: WhatsappSession;
  reply: (msg: string, nextStep?: string, extraData?: Record<string, unknown>) => Promise<void>;
}

export function podeCotarPorWhatsapp(supplier: Supplier): { elegivel: boolean; razao?: string } {
  if (!supplier.ativo) return { elegivel: false, razao: "fornecedor_inativo" };
  if (!supplier.whatsapp || supplier.whatsapp.trim().length < 8) return { elegivel: false, razao: "sem_whatsapp" };
  if (!supplier.aceitaCotacaoWhatsapp) return { elegivel: false, razao: "nao_aceita_cotacao" };
  if (!supplier.whatsappAutorizado) return { elegivel: false, razao: "whatsapp_nao_autorizado" };
  if (!supplier.templateCotacaoNome || supplier.templateCotacaoNome.trim() === "") {
    return { elegivel: false, razao: "sem_template" };
  }
  if (!supplier.idiomaTemplateCotacao || supplier.idiomaTemplateCotacao.trim() === "") {
    return { elegivel: false, razao: "sem_idioma_template" };
  }
  return { elegivel: true };
}

export async function enviarCotacaoFornecedor(
  supplier: Supplier,
  mensagem: string,
  solicitanteNome?: string,
  material?: string,
  quantidade?: string
): Promise<{ sucesso: boolean; erro?: string; usouTemplate: boolean }> {
  const check = podeCotarPorWhatsapp(supplier);
  if (!check.elegivel) {
    return { sucesso: false, erro: check.razao, usouTemplate: false };
  }

  const phoneId = getMetaPhoneId();
  const to = supplier.whatsapp!;

  const ultimo = supplier.ultimoContatoWhatsapp;
  const dentroDaJanela = ultimo
    ? (Date.now() - new Date(ultimo).getTime()) < 24 * 60 * 60 * 1000
    : false;

  if (dentroDaJanela) {
    const body =
      `Olá! Aqui é a Lucy da Gráfica+ 🛒\n\n` +
      (solicitanteNome ? `Solicitante: ${solicitanteNome}\n` : "") +
      `Material: ${material ?? "N/I"}\n` +
      `Quantidade: ${quantidade ?? "N/I"}\n\n` +
      `Detalhes: ${mensagem}\n\n` +
      `Poderia nos enviar uma cotação? Obrigado!`;
    await sendMetaMessage(phoneId, to, body);
    return { sucesso: true, usouTemplate: false };
  }

  const templateName = supplier.templateCotacaoNome ?? "solicitacao_cotacao_fornecedor";
  const idioma = supplier.idiomaTemplateCotacao ?? "pt_BR";
  const params = [
    { type: "text", text: material ?? "Material não informado" },
    { type: "text", text: quantidade ?? "Quantidade não informada" },
    { type: "text", text: solicitanteNome ?? "Equipe" },
  ];
  await sendMetaTemplateMessage(phoneId, to, templateName, idioma, params);
  return { sucesso: true, usouTemplate: true };
}

// ─── LUCY: AGENTE CONVERSACIONAL COM IA E HISTÓRICO ──────────────────────────

type HistoryMsg = { role: "user" | "assistant"; content: string };

export async function handleLucyAgent(params: LucyAgentParams): Promise<void> {
  const { from, rawBody, msgNorm, session, reply } = params;
  const data = (session.data ?? {}) as Record<string, unknown>;

  try {
    const resultado = await verificarAutorizacaoCompraPorTelefone(from);
    console.log(`[Lucy] motivo="${resultado.motivo}" colaborador="${resultado.colaborador?.nomeCompleto ?? "—"}"`);

    // ─── Número desconhecido ──────────────────────────────────────────────
    if (resultado.motivo === "telefone_nao_cadastrado") {
      await reply(
        `Olá! Sou a Lucy, assistente de compras da Gráfica+.\n\n` +
        `Seu número não está cadastrado no sistema. Para solicitar compras, peça para um responsável te cadastrar e liberar o acesso.`,
        "collecting", {}
      );
      return;
    }

    // ─── Cadastrado mas sem autorização ──────────────────────────────────
    if (resultado.motivo === "colaborador_nao_autorizado") {
      const nome = resultado.colaborador!.nomeCompleto.split(" ")[0];
      await reply(
        `Oi ${nome}! Sou a Lucy 🛒\n\n` +
        `Você está no sistema, mas ainda não tem autorização para solicitar compras. ` +
        `Fala com um responsável para liberar o seu acesso, tá bom?`,
        "collecting", {}
      );
      return;
    }

    // ─── AUTORIZADO → conversa com IA ────────────────────────────────────
    const colaborador = resultado.colaborador!;
    const nome = colaborador.nomeCompleto.split(" ")[0];

    // Histórico das últimas 10 trocas (20 mensagens)
    const history: HistoryMsg[] = (data.lucy_history as HistoryMsg[]) ?? [];

    // Dados de compra já coletados
    const purchData = {
      material:    (data.purch_material  as string | null) ?? null,
      quantidade:  (data.purch_quantidade as string | null) ?? null,
      unidade:     (data.purch_unidade   as string | null) ?? null,
      urgencia:    (data.purch_urgencia  as string | null) ?? null,
      fornecedor:  (data.purch_fornecedor as string | null) ?? null,
      os:          (data.purch_os        as string | null) ?? null,
      obs:         (data.purch_obs       as string | null) ?? null,
    };

    const dadosColetados = Object.entries(purchData)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ") || "nenhum ainda";

    const systemPrompt =
      `Você é a Lucy, assistente interna de compras da Gráfica+. ` +
      `Sua personalidade é simpática, natural e direta — como uma colega de trabalho de confiança. ` +
      `Use linguagem coloquial brasileira (pode usar "tá", "ótimo", "perfeito", etc.).\n\n` +
      `Você está conversando com ${nome} (${colaborador.nomeCompleto}), colaborador(a) autorizado(a).\n\n` +
      `Sua missão é coletar dados para uma solicitação de compra de forma natural, sem parecer um robô:\n` +
      `- material: o que precisa comprar (obrigatório)\n` +
      `- quantidade + unidade: ex. "5 resmas", "10 litros" (obrigatório)\n` +
      `- urgencia: "normal", "urgente" ou "muito_urgente" (obrigatório — se não mencionado, pergunte casualmente)\n` +
      `- fornecedor: fornecedor preferido, ex. "SGI", "Serilon" (opcional)\n` +
      `- os: número de OS relacionada (opcional)\n` +
      `- obs: especificação técnica ou observação (opcional)\n\n` +
      `Dados já coletados nessa conversa: ${dadosColetados}\n\n` +
      `REGRAS:\n` +
      `1. Converse naturalmente — sem listas com bullets, sem menus\n` +
      `2. Se já tiver os dados obrigatórios, não fique fazendo mais perguntas — vá para o resumo\n` +
      `3. Não repita perguntas sobre dados já informados\n` +
      `4. Quando tiver material + quantidade + urgência → complete=true e faça um resumo pedindo "pode confirmar? (sim/não)"\n` +
      `5. Se o colaborador quiser cancelar, responda de forma natural e marque complete=false\n\n` +
      `Responda SOMENTE com JSON válido:\n` +
      `{\n` +
      `  "reply": "sua resposta em português natural",\n` +
      `  "material": string | null,\n` +
      `  "quantidade": string | null,\n` +
      `  "unidade": string | null,\n` +
      `  "urgencia": "normal" | "urgente" | "muito_urgente" | null,\n` +
      `  "fornecedor": string | null,\n` +
      `  "os": string | null,\n` +
      `  "obs": string | null,\n` +
      `  "complete": boolean\n` +
      `}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-20),
      { role: "user" as const, content: rawBody },
    ];

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const result = JSON.parse(resp.choices[0].message.content ?? "{}") as {
      reply: string;
      material: string | null;
      quantidade: string | null;
      unidade: string | null;
      urgencia: string | null;
      fornecedor: string | null;
      os: string | null;
      obs: string | null;
      complete: boolean;
    };

    // Mescla dados novos com existentes (não sobrescreve com null)
    const newPurchData = {
      purch_material:    result.material   ?? purchData.material,
      purch_quantidade:  result.quantidade ?? purchData.quantidade,
      purch_unidade:     result.unidade    ?? purchData.unidade,
      purch_urgencia:    result.urgencia   ?? purchData.urgencia,
      purch_fornecedor:  result.fornecedor ?? purchData.fornecedor,
      purch_os:          result.os         ?? purchData.os,
      purch_obs:         result.obs        ?? purchData.obs,
    };

    // Mantém histórico (max 20 mensagens = 10 trocas)
    const newHistory: HistoryMsg[] = [
      ...history,
      { role: "user", content: rawBody },
      { role: "assistant", content: result.reply },
    ].slice(-20);

    const newData: Record<string, unknown> = {
      ...data,
      agente: "lucy",
      purch_solicitante: colaborador.nomeCompleto,
      ...newPurchData,
      lucy_history: newHistory,
    };

    if (result.complete) {
      await reply(result.reply, "purch_confirmar", newData);
    } else {
      await reply(result.reply, "purch_coletando", newData);
    }
  } catch (err) {
    console.error("[Lucy] Erro:", err);
    await reply(
      `Oi! Sou a Lucy 🛒 Tive um probleminha técnico aqui — pode repetir o que você precisava?`,
      "purch_coletando",
      { ...data, agente: "lucy" }
    );
  }
}
