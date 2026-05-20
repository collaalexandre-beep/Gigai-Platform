import { storage } from "../storage";
import type { Seller, WhatsappSession } from "@shared/schema";

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

export async function handleLucyAgent(params: LucyAgentParams): Promise<void> {
  const { from, rawBody, msgNorm, session, reply } = params;

  const isChamadaPeloNome = msgNorm.trim() === "lucy" || msgNorm.trim().startsWith("lucy ") || msgNorm.trim().startsWith("oi lucy") || msgNorm.trim().startsWith("ola lucy") || msgNorm.trim().startsWith("olá lucy");
  const isIntencaoDeCompra = !isChamadaPeloNome;

  try {
    const resultado = await verificarAutorizacaoCompraPorTelefone(from);
    console.log(`[Lucy] chamada="${isChamadaPeloNome}" intencao="${isIntencaoDeCompra}" motivo="${resultado.motivo}" colaborador="${resultado.colaborador?.nomeCompleto ?? "—"}"`);

    // ─── Autorizado ──────────────────────────────────────────────────────
    if (resultado.motivo === "colaborador_autorizado") {
      const nome = resultado.colaborador!.nomeCompleto.split(" ")[0];

      if (isIntencaoDeCompra) {
        // Usuário já descreveu o pedido → anota e confirma
        await reply(
          `✅ Anotei, ${nome}!\n\n` +
          `Pedido: *${rawBody}*\n\n` +
          `O setor de compras vai dar continuidade. Obrigado! 🛒`,
          "collecting",
          {}
        );
        return;
      }

      // Só chamou pelo nome → pede para descrever
      await reply(
        `Oi ${nome}! Aqui é a *Lucy* 🛒\n\n` +
        `Você está autorizado a solicitar compras. Me diga o que precisa:\n` +
        `• Material\n` +
        `• Quantidade e unidade\n` +
        `• Se é para OS, estoque ou expediente`,
        "collecting",
        {}
      );
      return;
    }

    // ─── Cadastrado, mas NÃO autorizado ──────────────────────────────────────────
    if (resultado.motivo === "colaborador_nao_autorizado") {
      const nome = resultado.colaborador!.nomeCompleto.split(" ")[0];
      await reply(
        `Oi ${nome}. Aqui é a *Lucy* 🛒\n\n` +
        `Encontrei seu cadastro, mas você ainda não está autorizado a solicitar compras.\n` +
        `Peça para um responsável liberar sua autorização no sistema.`,
        "collecting",
        {}
      );
      return;
    }

    // ─── Telefone NÃO cadastrado ──────────────────────────────────────────
    await reply(
      `Oi! Aqui é a *Lucy* 🛒\n\n` +
      `Não encontrei seu número no cadastro de colaboradores.\n` +
      `Para solicitar compras, peça para um responsável cadastrar seu WhatsApp e liberar a autorização.`,
      "collecting",
      {}
    );
  } catch (err) {
    console.error("[Lucy] Erro:", err);
    await reply(
      `⚠️ Erro interno. Tente novamente ou contate um responsável.`,
      "collecting",
      {}
    );
  }
}
