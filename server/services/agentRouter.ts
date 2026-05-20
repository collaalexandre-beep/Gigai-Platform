import { storage } from "../storage";
import { classifyMessage } from "../agents/centralAgent";
import { handleCommercialAgent, DEFAULT_SYSTEM_PROMPT, DEFAULT_ATTENDANT_MSG } from "../agents/commercialAgent";
import { handleVehicleWaFlow, isVehicleExitCommand, isVehicleReturnCommand } from "../agents/fleetAgent";
import { handlePurchaseAgent, PURCH_STEPS } from "../agents/purchaseAgent";
import { handleLucyAgent } from "../agents/lucyAgent";
import type { WhatsappSession } from "@shared/schema";

export interface RouterParams {
  from: string;
  fromKey: string;
  rawBody: string;
  msgNorm: string;
  msgType: string;
  mediaId?: string;
  phoneNumberId: string;
  botNumber: string;
  session: WhatsappSession;
  botConfig: {
    systemPrompt: string;
    welcomeMsg: string;
    cancelMsg: string;
    attendantMsg: string;
    vehMessages: Record<string, string | null | undefined>;
  };
  reply: (msg: string, nextStep?: string, extraData?: Record<string, unknown>) => Promise<void>;
  updateSession: (data: Partial<WhatsappSession>) => Promise<void>;
}

// ─── COMANDOS UNIVERSAIS ──────────────────────────────────────────────────────

const CANCEL_CMDS  = new Set(["cancelar", "sair", "cancel"]);
const WELCOME_CMDS = new Set(["menu", "inicio", "início", "oi", "ola", "olá", "hi", "hello"]);

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────────────────────

export async function routeMessage(params: RouterParams): Promise<void> {
  const { from, fromKey, rawBody, msgNorm, msgType, mediaId, phoneNumberId, botNumber,
    session, botConfig, reply, updateSession } = params;

  const step = session.step ?? "collecting";
  const data = (session.data ?? {}) as Record<string, unknown>;

  // ── 1. COMANDOS UNIVERSAIS (qualquer agente) ──────────────────────────────
  // "cancelar" dentro do fluxo de frota é tratado internamente pelo agente
  if (!step.startsWith("veh_") && CANCEL_CMDS.has(msgNorm)) {
    await storage.updateWhatsappSession(session.id, { step: "collecting", data: {} });
    await reply(botConfig.cancelMsg, "collecting");
    return;
  }

  if (WELCOME_CMDS.has(msgNorm)) {
    if (step === "done" || step === "menu") {
      await storage.updateWhatsappSession(session.id, { step: "collecting", data: {} });
    }
    await reply(botConfig.welcomeMsg, "collecting");
    return;
  }

  // ── 2. ROTEAMENTO POR STEP ATIVO (sem IA — sessão em andamento) ───────────

  // Frota: step veh_*
  if (step.startsWith("veh_")) {
    await runFleetAgent(params);
    return;
  }

  // Lucy (Compras/Estoque): step lucy_*
  if (step.startsWith("lucy_")) {
    await handleLucyAgent({ from, rawBody, msgNorm, session, reply });
    return;
  }

  // Compras (agente legado): step purch_*
  if (step.startsWith("purch_")) {
    await handlePurchaseAgent({ from, rawBody, msgNorm, session, reply });
    return;
  }

  // Comercial: steps específicos
  if (["confirmar", "done", "status_query"].includes(step)) {
    await handleCommercialAgent({
      from, fromKey, rawBody, msgNorm, phoneNumberId, session,
      systemPrompt: botConfig.systemPrompt,
      attendantMsg: botConfig.attendantMsg,
      reply,
    });
    return;
  }

  // ── 3. SESSÃO EM ANDAMENTO (agente gravado no data) ───────────────────────
  const agenteAtivo = data.agente as string | undefined;

  if (agenteAtivo === "frota") {
    await runFleetAgent(params);
    return;
  }
  if (agenteAtivo === "compras" || agenteAtivo === "lucy") {
    await handleLucyAgent({ from, rawBody, msgNorm, session, reply });
    return;
  }
  if (agenteAtivo === "comercial") {
    await handleCommercialAgent({
      from, fromKey, rawBody, msgNorm, phoneNumberId, session,
      systemPrompt: botConfig.systemPrompt,
      attendantMsg: botConfig.attendantMsg,
      reply,
    });
    return;
  }

  // ── 4. DETECÇÃO RÁPIDA POR PALAVRAS-CHAVE (sem IA) ───────────────────────
  if (isVehicleExitCommand(msgNorm) || isVehicleReturnCommand(msgNorm)) {
    await runFleetAgent(params);
    return;
  }

  // ── 5. CLASSIFICAÇÃO POR AGENTE CENTRAL (IA) ─────────────────────────────
  console.log(`[AgentRouter] Sessão nova ou não classificada — chamando Agente Central. msg="${rawBody.slice(0, 60)}"`);
  const classification = await classifyMessage(rawBody);
  console.log(`[AgentRouter] Classificação:`, classification);

  switch (classification.destino) {
    case "frota":
      await storage.updateWhatsappSession(session.id, { data: { ...data, agente: "frota" } });
      await runFleetAgent(params);
      break;

    case "compras":
      await storage.updateWhatsappSession(session.id, { data: { ...data, agente: "lucy" } });
      await handleLucyAgent({ from, rawBody, msgNorm, session: { ...session, data: { ...data, agente: "lucy" } }, reply });
      break;

    case "financeiro":
      await reply(
        `💰 Olá! O módulo financeiro está em desenvolvimento.\n\nPor enquanto, entre em contato diretamente com nosso setor financeiro. Em breve teremos mais recursos por aqui! 😊`,
        "collecting",
        {}
      );
      break;

    case "humano":
      if (classification.confianca < 0.4) {
        // Mensagem muito curta ou ambígua — usar boas-vindas comercial
        await handleCommercialAgent({
          from, fromKey, rawBody, msgNorm, phoneNumberId, session,
          systemPrompt: botConfig.systemPrompt,
          attendantMsg: botConfig.attendantMsg,
          reply,
        });
      } else {
        await reply(
          `🙋 Olá! Não entendi bem o que você precisa.\n\nSou assistente da *Gráfica+*. Posso ajudar com:\n• 🖨️ *Orçamentos* de impressão\n• 🚗 *Frota* (funcionários)\n• 🛒 *Compras* de materiais (funcionários)\n\nO que você precisa?`,
          "collecting",
          {}
        );
      }
      break;

    case "comercial":
    default:
      await handleCommercialAgent({
        from, fromKey, rawBody, msgNorm, phoneNumberId, session,
        systemPrompt: botConfig.systemPrompt,
        attendantMsg: botConfig.attendantMsg,
        reply,
      });
      break;
  }
}

// ─── AUXILIAR: EXECUTAR AGENTE DE FROTA ──────────────────────────────────────

async function runFleetAgent(params: RouterParams): Promise<void> {
  const { from, rawBody, msgNorm, msgType, mediaId, session, botConfig, reply, updateSession } = params;
  try {
    await handleVehicleWaFlow({
      from,
      rawBody,
      msgNorm,
      msgType,
      mediaId,
      session,
      token: process.env.META_WHATSAPP_TOKEN ?? "",
      vehMessages: botConfig.vehMessages,
      reply,
      updateSession,
    });
  } catch (err) {
    console.error("[AgentRouter] Erro no agente de frota:", err);
    await reply("❌ Erro interno no módulo de frota. Tente novamente.", "collecting", {});
  }
}
