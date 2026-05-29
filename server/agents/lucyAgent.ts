import { storage } from "../storage";
import { sendMetaMessage, sendMetaTemplateMessage, getMetaPhoneId } from "../services/metaWhatsapp";
import type { Seller, WhatsappSession, Supplier } from "@shared/schema";
import { handlePurchaseAgent } from "./purchaseAgent";

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

/**
 * Verifica se um fornecedor pode receber cotação por WhatsApp.
 * Retorna o fornecedor (se elegível) ou a razão do bloqueio.
 */
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

/**
 * Envia cotação a um fornecedor por WhatsApp.
 * Se último contato > 24h, usa template da Meta.
 * Se dentro da janela, envia mensagem normal.
 */
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

  // Verifica se último contato foi nas últimas 24h
  const ultimo = supplier.ultimoContatoWhatsapp;
  const dentroDaJanela = ultimo
    ? (Date.now() - new Date(ultimo).getTime()) < 24 * 60 * 60 * 1000
    : false;

  if (dentroDaJanela) {
    // Envia mensagem normal (sessão ativa)
    const body = `Olá! Aqui é a Lucy da Gráfica+ 🛒\n\n` +
      (solicitanteNome ? `Solicitante: ${solicitanteNome}\n` : "") +
      `Material: ${material ?? "N/I"}\n` +
      `Quantidade: ${quantidade ?? "N/I"}\n\n` +
      `Detalhes: ${mensagem}\n\n` +
      `Poderia nos enviar uma cotação? Obrigado!`;
    await sendMetaMessage(phoneId, to, body);
    return { sucesso: true, usouTemplate: false };
  }

  // Fora da janela → usa template aprovado
  const templateName = supplier.templateCotacaoNome ?? "solicitacao_cotacao_fornecedor";
  const idioma = supplier.idiomaTemplateCotacao ?? "pt_BR";
  const params = [
    { type: "text", text: material ?? "Material não informado" },
    { type: "text", text: quantidade ?? "Quantidade não informada" },
  ];
  await sendMetaTemplateMessage(phoneId, to, templateName, idioma, params);
  return { sucesso: true, usouTemplate: true };
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
        // Usuário já descreveu o pedido → passa para o agente de compras coletar e confirmar
        const sessionComNome = {
          ...session,
          step: "purch_coletando",
          data: {
            ...(session.data as Record<string, unknown>),
            agente: "compras",
            purch_solicitante: resultado.colaborador!.nomeCompleto,
          },
        };
        await storage.updateWhatsappSession(session.id, {
          step: "purch_coletando",
          data: sessionComNome.data,
        });
        await handlePurchaseAgent({ from, rawBody, msgNorm, session: sessionComNome, reply });
        return;
      }

      // Só chamou pelo nome → pede para descrever
      await reply(
        `Oi ${nome}! Aqui é a *Lucy* 🛒\n\n` +
        `Você está autorizado a solicitar compras. Me diga o que precisa:\n` +
        `• Material\n` +
        `• Quantidade e unidade\n` +
        `• Se é para OS, estoque ou expediente\n` +
        `• Fornecedor preferido (opcional)`,
        "purch_coletando",
        { agente: "compras", purch_solicitante: resultado.colaborador!.nomeCompleto }
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
