import { storage } from "../storage";
import type { Seller, WhatsappSession } from "@shared/schema";

// ─── NORMALIZAÇÃO DE TELEFONE ─────────────────────────────────────────────────

/**
 * Remove todos os caracteres não-numéricos e o prefixo DDI 55 do Brasil,
 * retornando apenas DDD + número (10-11 dígitos).
 */
export function normalizarTelefone(telefone: string): string {
  let digits = telefone.replace(/\D/g, "");
  // Remove DDI 55 se o número tiver 12-13 dígitos (55 + DDD + número)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

// ─── VERIFICAÇÃO DE AUTORIZAÇÃO ────────────────────────────────────────────────

export interface AutorizacaoResult {
  autorizado: boolean;
  colaborador: Seller | null;
  motivo: "colaborador_autorizado" | "colaborador_nao_autorizado" | "telefone_nao_cadastrado";
}

export async function verificarAutorizacaoCompraPorTelefone(
  telefone: string
): Promise<AutorizacaoResult> {
  const normRecebido = normalizarTelefone(telefone);

  // Busca todos os colaboradores ativos
  const todos = await storage.getSellers();

  const encontrado = todos.find((s) => {
    // Compara contra whatsappNumber (campo específico do bot), whatsapp e telefone
    const candidatos = [s.whatsappNumber, s.whatsapp, s.telefone]
      .filter(Boolean)
      .map((n) => normalizarTelefone(n!));
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

export async function handleLucyAgent(params: LucyAgentParams): Promise<void> {
  const { from, reply } = params;

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
        `Vou encaminhar essa solicitação para aprovação de um responsável.`,
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
