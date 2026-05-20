import { storage } from "../storage";
import type { Seller, WhatsappSession } from "@shared/schema";

// ─── NORMALIZAÇÃO DE TELEFONE ─────────────────────────────────────────────────

export function normalizarTelefone(telefone: string): string {
  let digits = telefone.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

// ─── VERIFICAÇÃO DE AUTORIZAÇÃO ───────────────────────────────────────────────

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

// ─── AGENTE LUCY ──────────────────────────────────────────────────────────────

export interface LucyAgentParams {
  from: string;
  rawBody: string;
  msgNorm: string;
  session: WhatsappSession;
  reply: (msg: string, nextStep?: string, extraData?: Record<string, unknown>) => Promise<void>;
}

// Mensagens que são apenas uma chamada pelo nome, sem conteúdo de pedido
const GREETING_ONLY = new Set([
  "lucy", "oi lucy", "ola lucy", "olá lucy", "ei lucy",
  "oilá lucy", "oi,lucy", "ola,lucy",
  "chama lucy", "quero falar com a lucy", "falar com a lucy",
  "me passa a lucy", "chama a lucy",
]);

function isSomenteSaudacao(msgNorm: string): boolean {
  return GREETING_ONLY.has(msgNorm.trim());
}

export async function handleLucyAgent(params: LucyAgentParams): Promise<void> {
  const { from, rawBody, msgNorm, session, reply } = params;
  const step = session.step ?? "collecting";
  const data = (session.data ?? {}) as Record<string, unknown>;

  console.log(`[Lucy] step="${step}" msgNorm="${msgNorm}"`);

  // ─── STEP: lucy_aguardando ────────────────────────────────────────────────
  // Usuário chamou a Lucy (saudação) e agora descreveu o que precisa
  if (step === "lucy_aguardando") {
    await fazerVerificacaoEResponder(from, rawBody, data, reply);
    return;
  }

  // ─── STEP: lucy_coletando ─────────────────────────────────────────────────
  // Usuário está autorizado e descreveu o pedido (fase 1 → só confirma recebimento)
  if (step === "lucy_coletando") {
    await reply(
      `✅ Anotei o seu pedido!\n\n` +
      `*"${rawBody}"*\n\n` +
      `Em breve o setor de compras vai dar continuidade. 🛒\n\n` +
      `Se precisar de mais alguma coisa, é só chamar.`,
      "collecting",
      {}
    );
    return;
  }

  // ─── ENTRADA NOVA: só uma saudação ("lucy", "oi lucy", etc.) ─────────────
  if (isSomenteSaudacao(msgNorm)) {
    await reply(
      `👋 Olá! Aqui é a *Lucy*, agente de Estoque e Compras da GIGAI.\n\n` +
      `Me conta o que você precisa — informe o material, quantidade e se é para uma OS, estoque ou expediente.`,
      "lucy_aguardando",
      { agente: "lucy" }
    );
    return;
  }

  // ─── ENTRADA NOVA: já veio com intenção de compra → verificar e responder ─
  await fazerVerificacaoEResponder(from, rawBody, data, reply);
}

// ─── VERIFICAÇÃO DE AUTORIZAÇÃO + RESPOSTA ───────────────────────────────────

async function fazerVerificacaoEResponder(
  from: string,
  rawBody: string,
  data: Record<string, unknown>,
  reply: LucyAgentParams["reply"]
): Promise<void> {
  try {
    const resultado = await verificarAutorizacaoCompraPorTelefone(from);
    console.log(`[Lucy] verificação: motivo="${resultado.motivo}" colaborador="${resultado.colaborador?.nomeCompleto ?? "—"}"`);

    if (resultado.motivo === "colaborador_autorizado") {
      const nome = resultado.colaborador!.nomeCompleto.split(" ")[0];
      await reply(
        `Olá, ${nome}! ✅ Identifiquei seu cadastro e você está autorizado a solicitar compras.\n\n` +
        `Me diga:\n` +
        `• O *material* que precisa\n` +
        `• A *quantidade* e unidade\n` +
        `• Se é para uma *OS*, para *estoque* ou *expediente*`,
        "lucy_coletando",
        { agente: "lucy", lucy_colaborador: resultado.colaborador!.nomeCompleto }
      );
      return;
    }

    if (resultado.motivo === "colaborador_nao_autorizado") {
      const nome = resultado.colaborador!.nomeCompleto.split(" ")[0];
      await reply(
        `Olá, ${nome}. Encontrei seu cadastro, mas você ainda não está autorizado a solicitar compras.\n\n` +
        `Peça para um responsável liberar sua autorização no sistema.`,
        "collecting",
        {}
      );
      return;
    }

    // telefone_nao_cadastrado
    await reply(
      `Olá! Não encontrei seu número no cadastro de colaboradores.\n\n` +
      `Para solicitar compras, peça para um responsável cadastrar seu WhatsApp e liberar a autorização.`,
      "collecting",
      {}
    );
  } catch (err) {
    console.error("[Lucy] Erro na verificação:", err);
    await reply(
      `⚠️ Houve um erro interno. Tente novamente ou contate um responsável.`,
      "collecting",
      {}
    );
  }
}
