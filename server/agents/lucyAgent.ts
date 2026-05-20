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

// Mensagens que são apenas uma chamada pelo nome — sem intenção de compra
const GREETING_PATTERNS = [
  "lucy", "oi lucy", "ola lucy", "olá lucy", "ei lucy",
  "oi, lucy", "olá, lucy", "oi! lucy", "lucy!", "lucy?",
  "chama lucy", "quero falar com a lucy", "falar com a lucy",
];

function isJustGreeting(msgNorm: string): boolean {
  const clean = msgNorm.trim();
  return GREETING_PATTERNS.includes(clean);
}

export async function handleLucyAgent(params: LucyAgentParams): Promise<void> {
  const { from, rawBody, msgNorm, session, reply } = params;
  const step = session.step ?? "collecting";
  const data = (session.data ?? {}) as Record<string, unknown>;

  // ── ETAPA 1: usuário está esperando Lucy responder (chamou só pelo nome) ──
  // Agora ele vai descrever o que precisa → fazer a verificação
  if (step === "lucy_aguardando") {
    await verificarEResponder(from, reply, data);
    return;
  }

  // ── ETAPA 2: coletando dados (fase futura — por ora só avisa) ─────────────
  if (step === "lucy_coletando") {
    await reply(
      `✅ Certo! Sua solicitação foi recebida.\n\nEm breve o setor de compras dará retorno. 🛒`,
      "collecting",
      {}
    );
    return;
  }

  // ── ENTRADA NOVA: verificar se é só uma chamada pelo nome ─────────────────
  if (isJustGreeting(msgNorm)) {
    await reply(
      `Oi! Eu sou a *Lucy* 👋\n\n` +
      `Sou a agente de Estoque e Compras da GIGAI.\n\n` +
      `Me conta o que você precisa — material, quantidade e se é para uma OS, estoque ou expediente — e eu te ajudo!`,
      "lucy_aguardando",
      { agente: "lucy" }
    );
    return;
  }

  // ── ENTRADA NOVA: tem intenção de compra → verificar autorização ──────────
  await verificarEResponder(from, reply, data);
}

// ─── VERIFICAÇÃO E RESPOSTA ───────────────────────────────────────────────────

async function verificarEResponder(
  from: string,
  reply: LucyAgentParams["reply"],
  data: Record<string, unknown>
): Promise<void> {
  try {
    const resultado = await verificarAutorizacaoCompraPorTelefone(from);

    if (resultado.motivo === "colaborador_autorizado") {
      const nome = resultado.colaborador!.nomeCompleto.split(" ")[0];
      await reply(
        `Oi ${nome}! Eu sou a *Lucy*, agente de Estoque e Compras da GIGAI. 🛒\n\n` +
        `Identifiquei que você está autorizado a solicitar compras.\n\n` +
        `Você só precisa me dizer:\n` +
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
        `Oi ${nome}! Eu sou a *Lucy*, agente de Estoque e Compras da GIGAI. 🛒\n\n` +
        `Encontrei seu cadastro, mas você ainda não está autorizado a solicitar compras.\n\n` +
        `Peça para um responsável liberar sua autorização no sistema.`,
        "collecting",
        {}
      );
      return;
    }

    // telefone_nao_cadastrado
    await reply(
      `Oi! Eu sou a *Lucy*, agente de Estoque e Compras da GIGAI. 🛒\n\n` +
      `Não encontrei seu número no cadastro de colaboradores.\n\n` +
      `Para solicitar compras, peça para um responsável cadastrar seu WhatsApp e liberar a autorização.`,
      "collecting",
      {}
    );
  } catch (err) {
    console.error("[LucyAgent] Erro na verificação de autorização:", err);
    await reply(
      `⚠️ Houve um erro interno. Tente novamente ou contate um responsável.`,
      "collecting",
      {}
    );
  }
}
