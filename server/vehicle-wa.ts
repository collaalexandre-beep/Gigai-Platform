import path from "path";
import fs from "fs";
import { storage } from "./storage";
import type { WhatsappSession, Vehicle } from "@shared/schema";

// ─── STEP NAMES ──────────────────────────────────────────────────────────────

export const VEH_STEPS = {
  ESCOLHER_VEICULO:      "veh_escolher_veiculo",
  AGUARDANDO_OS:         "veh_aguardando_os",
  AGUARDANDO_MOTIVO:     "veh_aguardando_motivo",
  AGUARDANDO_DESTINO:    "veh_aguardando_destino",
  AGUARDANDO_FOTO_SAIDA: "veh_aguardando_foto_saida",
  RETORNO_FOTO:          "veh_retorno_foto",
  RETORNO_OBS:           "veh_retorno_obs",
};

export const VEH_STEP_LABELS: Record<string, string> = {
  veh_escolher_veiculo:      "🚗 Escolhendo veículo",
  veh_aguardando_os:         "📋 Aguardando OS",
  veh_aguardando_motivo:     "📝 Aguardando motivo",
  veh_aguardando_destino:    "📍 Aguardando destino",
  veh_aguardando_foto_saida: "📸 Aguardando foto de saída",
  veh_retorno_foto:          "📸 Aguardando foto de retorno",
  veh_retorno_obs:           "💬 Aguardando observações",
};

// ─── COMMAND DETECTION ────────────────────────────────────────────────────────

export function isVehicleExitCommand(msgNorm: string): boolean {
  const saida = msgNorm.includes("saida") || msgNorm.includes("saída");
  const veiculo =
    msgNorm.includes("veiculo") ||
    msgNorm.includes("veículo") ||
    msgNorm.includes("carro") ||
    msgNorm.includes("moto") ||
    msgNorm.includes("caminhao") ||
    msgNorm.includes("caminhão");
  if (saida && veiculo) return true;
  if ((msgNorm.includes("retirar") || msgNorm.includes("retirada")) && veiculo) return true;
  if (msgNorm === "saida veiculo" || msgNorm === "saída veículo") return true;
  return false;
}

export function isVehicleReturnCommand(msgNorm: string): boolean {
  const exact = ["retornei", "voltei", "cheguei"];
  if (exact.includes(msgNorm)) return true;
  const veiculo =
    msgNorm.includes("veiculo") ||
    msgNorm.includes("veículo") ||
    msgNorm.includes("carro") ||
    msgNorm.includes("moto");
  const retorno =
    msgNorm.includes("retornei") ||
    msgNorm.includes("voltei") ||
    msgNorm.includes("cheguei");
  if (retorno && veiculo) return true;
  if ((msgNorm.includes("encerrar") || msgNorm.includes("finalizar") || msgNorm.includes("devolvi")) &&
      (msgNorm.includes("saida") || msgNorm.includes("veiculo"))) return true;
  return false;
}

// ─── MEDIA DOWNLOAD ───────────────────────────────────────────────────────────

export async function downloadMetaMedia(
  mediaId: string,
  token: string,
  from: string
): Promise<string | null> {
  try {
    const urlResp = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!urlResp.ok) {
      console.error("[VehicleWA] Falha ao obter URL da mídia:", await urlResp.text());
      return null;
    }
    const { url } = (await urlResp.json()) as { url: string };

    const imgResp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!imgResp.ok) {
      console.error("[VehicleWA] Falha ao baixar imagem");
      return null;
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "vehicle-photos");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = `${Date.now()}-${from.replace(/\D/g, "")}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await imgResp.arrayBuffer());
    await fs.promises.writeFile(filepath, buffer);

    return `/uploads/vehicle-photos/${filename}`;
  } catch (err) {
    console.error("[VehicleWA] Erro ao baixar mídia:", err);
    return null;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatVehicleList(list: Vehicle[]): string {
  return list
    .map(
      (v, i) =>
        `${i + 1}. *${v.marca} ${v.modelo}* — Placa: ${v.placa}${v.kmAtual ? ` (${Number(v.kmAtual).toFixed(0)} km)` : ""}`
    )
    .join("\n");
}

function parseVehicleSelection(rawBody: string, list: Vehicle[]): Vehicle | null {
  const num = parseInt(rawBody.trim());
  if (!isNaN(num) && num >= 1 && num <= list.length) return list[num - 1];

  const plateNorm = rawBody.replace(/[\s\-\.]/g, "").toUpperCase();
  const byPlate = list.find(
    (v) => v.placa.replace(/[\s\-\.]/g, "").toUpperCase() === plateNorm
  );
  if (byPlate) return byPlate;

  const lower = rawBody.toLowerCase();
  return (
    list.find(
      (v) =>
        lower.includes(v.modelo.toLowerCase()) ||
        lower.includes(v.marca.toLowerCase())
    ) ?? null
  );
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export interface VehicleWaParams {
  from: string;
  rawBody: string;
  msgNorm: string;
  msgType: string;
  mediaId?: string;
  session: WhatsappSession;
  token: string;
  reply: (
    msg: string,
    nextStep?: string,
    extraData?: Record<string, unknown>
  ) => Promise<void>;
  updateSession: (data: Partial<WhatsappSession>) => Promise<void>;
}

export async function handleVehicleWaFlow(
  params: VehicleWaParams
): Promise<boolean> {
  const { from, rawBody, msgNorm, msgType, mediaId, session, token, reply, updateSession } = params;
  const step = session.step;
  const data = (session.data ?? {}) as Record<string, unknown>;
  const phone = from.replace(/\D/g, "");

  const isVehStep = step.startsWith("veh_");
  const isExitCmd = isVehicleExitCommand(msgNorm);
  const isReturnCmd = isVehicleReturnCommand(msgNorm);

  if (!isVehStep && !isExitCmd && !isReturnCmd) return false;

  // "cancelar saida" within vehicle flow
  if (
    isVehStep &&
    (msgNorm === "cancelar saida" || msgNorm === "cancelar saída" || msgNorm === "cancelar")
  ) {
    await updateSession({ step: "collecting", data: {} });
    await reply(
      "✅ Registro cancelado. Quando precisar, envie *saída veículo* para recomeçar.",
      "collecting",
      {}
    );
    return true;
  }

  // ── RETURN COMMAND (from outside vehicle steps) ───────────────────────────
  if (!isVehStep && isReturnCmd) {
    const driver = await storage.getSellerByWhatsappNumber(phone);
    if (!driver) {
      await reply(
        "⛔ Seu número não está vinculado a nenhum funcionário cadastrado no sistema.\n\nSolicite ao responsável que cadastre seu WhatsApp no perfil de vendedor/motorista do ERP."
      );
      return true;
    }

    const openExit = await storage.getOpenVehicleExitByDriver(driver.id);
    if (!openExit) {
      await reply(
        `ℹ️ Olá, *${driver.nomeCompleto}*! Não encontrei nenhuma saída em aberto para você.\n\nSe precisar registrar uma nova saída, envie *saída veículo*.`
      );
      return true;
    }

    const dtSaida = new Date(openExit.dataHoraSaida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    await reply(
      `🚗 Olá, *${driver.nomeCompleto}*! Encontrei sua saída em aberto:\n\n` +
        `🚗 *${openExit.vehicle.marca} ${openExit.vehicle.modelo}* — Placa: ${openExit.vehicle.placa}\n` +
        `⏱️ Saída: ${dtSaida}\n` +
        `${openExit.motivoSaida ? `📋 Motivo: ${openExit.motivoSaida}\n` : ""}` +
        `${openExit.orderId ? `📋 OS: ${openExit.orderId}\n` : ""}` +
        `\nPara registrar o retorno, envie a *foto do painel* do veículo:`,
      VEH_STEPS.RETORNO_FOTO,
      { ...data, veh_exitId: openExit.id }
    );
    return true;
  }

  // ── EXIT COMMAND (from outside vehicle steps) ─────────────────────────────
  if (!isVehStep && isExitCmd) {
    const driver = await storage.getSellerByWhatsappNumber(phone);
    if (!driver) {
      await reply(
        "⛔ Seu número não está vinculado a nenhum funcionário cadastrado no sistema.\n\nSolicite ao responsável que cadastre seu WhatsApp no perfil de vendedor/motorista do ERP."
      );
      return true;
    }

    if (!driver.autorizadoDirigir) {
      await reply(
        `⛔ Olá, *${driver.nomeCompleto}*! Você não está autorizado a retirar veículos da empresa.\n\nEntre em contato com o responsável para solicitar autorização.`
      );
      return true;
    }

    const openExit = await storage.getOpenVehicleExitByDriver(driver.id);
    if (openExit) {
      const dtSaida = new Date(openExit.dataHoraSaida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await reply(
        `⚠️ Olá, *${driver.nomeCompleto}*! Você já tem uma saída em aberto:\n\n` +
          `🚗 *${openExit.vehicle.marca} ${openExit.vehicle.modelo}* — ${openExit.vehicle.placa}\n` +
          `⏱️ Saída registrada: ${dtSaida}\n\n` +
          `Para registrar o retorno, envie *retornei*.\n` +
          `Para cancelar o registro atual, envie *cancelar saida*.`
      );
      return true;
    }

    const allVehicles = await storage.getVehicles({ status: "ativo" });
    if (!allVehicles.length) {
      await reply(
        "😟 Não há veículos disponíveis no momento. Todos estão em manutenção ou inativos. Contate o responsável."
      );
      return true;
    }

    const vehicleListData = allVehicles.map((v) => ({
      id: v.id,
      placa: v.placa,
      modelo: v.modelo,
      marca: v.marca,
      kmAtual: v.kmAtual,
    }));

    await reply(
      `🚗 Olá, *${driver.nomeCompleto}*! Vou registrar sua saída de veículo.\n\n` +
        `Veículos disponíveis:\n${formatVehicleList(allVehicles)}\n\n` +
        `Qual veículo você vai utilizar? Envie o *número* da lista ou a *placa*.`,
      VEH_STEPS.ESCOLHER_VEICULO,
      { veh_driverId: driver.id, veh_driverName: driver.nomeCompleto, veh_vehicleList: vehicleListData }
    );
    return true;
  }

  // ── VEH STEP: ESCOLHER VEÍCULO ────────────────────────────────────────────
  if (step === VEH_STEPS.ESCOLHER_VEICULO) {
    const allVehicles = await storage.getVehicles({ status: "ativo" });
    const selected = parseVehicleSelection(rawBody, allVehicles);
    if (!selected) {
      await reply(
        `⚠️ Não reconheci o veículo. Por favor, envie o *número* da lista ou a *placa*:\n\n${formatVehicleList(allVehicles)}`
      );
      return true;
    }

    await reply(
      `✅ Veículo selecionado: *${selected.marca} ${selected.modelo}* — Placa: *${selected.placa}*\n\n` +
        `📋 Você tem uma *Ordem de Serviço (OS)* para esta saída?\n` +
        `• Envie o *número da OS* (ex: PED-2026-0001)\n` +
        `• Ou envie *sem OS* se não houver`,
      VEH_STEPS.AGUARDANDO_OS,
      {
        ...data,
        veh_vehicleId: selected.id,
        veh_vehiclePlaca: selected.placa,
        veh_vehicleModelo: `${selected.marca} ${selected.modelo}`,
      }
    );
    return true;
  }

  // ── VEH STEP: AGUARDANDO OS ───────────────────────────────────────────────
  if (step === VEH_STEPS.AGUARDANDO_OS) {
    const semOS =
      msgNorm === "sem os" ||
      msgNorm === "nao" ||
      msgNorm === "não" ||
      msgNorm === "sem" ||
      msgNorm.includes("sem os") ||
      msgNorm.includes("sem ordem") ||
      msgNorm.includes("nao tenho");

    if (semOS) {
      await reply(
        `📝 Sem OS vinculada.\n\nQual é o *motivo* desta saída?\n_(Ex: Entrega ao cliente, Reunião, Compra de material, Manutenção externa...)_`,
        VEH_STEPS.AGUARDANDO_MOTIVO,
        { ...data, veh_orderId: null }
      );
    } else {
      await reply(
        `✅ OS registrada: *${rawBody.trim()}*\n\nQual é o *destino* desta viagem?\n_(ou envie *sem destino*)_`,
        VEH_STEPS.AGUARDANDO_DESTINO,
        { ...data, veh_orderId: rawBody.trim() }
      );
    }
    return true;
  }

  // ── VEH STEP: AGUARDANDO MOTIVO ───────────────────────────────────────────
  if (step === VEH_STEPS.AGUARDANDO_MOTIVO) {
    await reply(
      `✅ Motivo registrado: *${rawBody.trim()}*\n\nQual é o *destino* desta viagem?\n_(ou envie *sem destino*)_`,
      VEH_STEPS.AGUARDANDO_DESTINO,
      { ...data, veh_motivoSaida: rawBody.trim() }
    );
    return true;
  }

  // ── VEH STEP: AGUARDANDO DESTINO ─────────────────────────────────────────
  if (step === VEH_STEPS.AGUARDANDO_DESTINO) {
    const semDestino =
      msgNorm === "sem destino" ||
      msgNorm === "nao" ||
      msgNorm === "não" ||
      msgNorm === "nao tenho" ||
      msgNorm === "nenhum" ||
      msgNorm === "nd";
    const destino = semDestino ? null : rawBody.trim();

    await reply(
      `📸 ${destino ? `Destino: *${destino}*\n\n` : ""}Agora envie a *foto do painel* do veículo *(${data.veh_vehicleModelo ?? "veículo selecionado"})* antes de sair.\n\n_A foto comprova o estado inicial do veículo e registra km e combustível. Em breve, a IA extrairá essas informações automaticamente!_`,
      VEH_STEPS.AGUARDANDO_FOTO_SAIDA,
      { ...data, veh_destino: destino }
    );
    return true;
  }

  // ── VEH STEP: AGUARDANDO FOTO INICIAL ────────────────────────────────────
  if (step === VEH_STEPS.AGUARDANDO_FOTO_SAIDA) {
    if (msgType !== "image" || !mediaId) {
      await reply(
        `📸 Por favor, envie uma *foto do painel* do veículo para registrar a saída.\n\n_Se preferir cancelar, envie *cancelar*._`
      );
      return true;
    }

    const photoUrl = await downloadMetaMedia(mediaId, token, from);
    const driverId = data.veh_driverId as string;
    const vehicleId = data.veh_vehicleId as string;

    try {
      const exit = await storage.createVehicleExit({
        vehicleId,
        driverId,
        dataHoraSaida: new Date(),
        kmInicial: null as any,
        combustivelInicial: null as any,
        fotoInicialUrl: photoUrl,
        orderId: (data.veh_orderId as string | null) ?? undefined,
        motivoSaida: (data.veh_motivoSaida as string) ?? null,
        destino: (data.veh_destino as string) ?? null,
        status: "em_rota",
      });

      const dtSaida = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await reply(
        `✅ *Saída registrada com sucesso!*\n\n` +
          `🚗 *${data.veh_vehicleModelo}* — Placa: ${data.veh_vehiclePlaca}\n` +
          `🕐 ${dtSaida}\n` +
          `${data.veh_orderId ? `📋 OS: ${data.veh_orderId}\n` : ""}` +
          `${data.veh_motivoSaida ? `📋 Motivo: ${data.veh_motivoSaida}\n` : ""}` +
          `${data.veh_destino ? `📍 Destino: ${data.veh_destino}\n` : ""}` +
          `\nAo retornar, envie *retornei* para registrar o retorno.\n\n_Boa viagem! 🛣️_`,
        "collecting",
        {}
      );
    } catch (err) {
      console.error("[VehicleWA] Erro ao criar saída:", err);
      await reply(
        `❌ Erro ao registrar a saída. Tente novamente ou registre manualmente no ERP.`,
        "collecting",
        {}
      );
    }
    return true;
  }

  // ── VEH STEP: RETORNO — AGUARDANDO FOTO ──────────────────────────────────
  if (step === VEH_STEPS.RETORNO_FOTO) {
    if (msgType !== "image" || !mediaId) {
      await reply(
        `📸 Por favor, envie a *foto do painel* do veículo para registrar o retorno.\n\n_Se preferir cancelar, envie *cancelar*._`
      );
      return true;
    }

    const photoUrl = await downloadMetaMedia(mediaId, token, from);
    await reply(
      `📸 Foto recebida!\n\nHá alguma *observação* sobre esta viagem?\n_(Ex: Sem intercorrências, Pneu calibrado, Abasteceu no posto X...)_\n\nOu envie *ok* para finalizar sem observações.`,
      VEH_STEPS.RETORNO_OBS,
      { ...data, veh_fotoFinal: photoUrl }
    );
    return true;
  }

  // ── VEH STEP: RETORNO — AGUARDANDO OBSERVAÇÕES ───────────────────────────
  if (step === VEH_STEPS.RETORNO_OBS) {
    const semObs =
      msgNorm === "ok" ||
      msgNorm === "sem observacoes" ||
      msgNorm === "sem observações" ||
      msgNorm === "nao" ||
      msgNorm === "não" ||
      msgNorm === "nada" ||
      msgNorm === "nenhuma";
    const observacoes = semObs ? null : rawBody.trim();
    const exitId = data.veh_exitId as string;
    const fotoFinal = data.veh_fotoFinal as string | null;

    try {
      await storage.updateVehicleExit(exitId, {
        dataHoraRetorno: new Date() as any,
        fotoFinalUrl: fotoFinal ?? undefined,
        observacoesRetorno: observacoes ?? undefined,
        status: "finalizada",
      });

      const dtRetorno = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await reply(
        `✅ *Retorno registrado com sucesso!*\n\n` +
          `🕐 ${dtRetorno}\n` +
          `${observacoes ? `📝 Observações: ${observacoes}\n` : ""}` +
          `\nObrigado! O uso do veículo foi registrado no sistema. 🚗`,
        "collecting",
        {}
      );
    } catch (err) {
      console.error("[VehicleWA] Erro ao finalizar saída:", err);
      await reply(
        `❌ Erro ao registrar retorno. Tente novamente ou registre manualmente no ERP.`,
        "collecting",
        {}
      );
    }
    return true;
  }

  // Unknown vehicle step fallback
  if (isVehStep) {
    await reply(
      `⚠️ Não entendi sua resposta. Siga as instruções ou envie *cancelar* para recomeçar.`
    );
    return true;
  }

  return false;
}
