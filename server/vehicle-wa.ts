import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { analisarPainelVeiculo, parseFuelLevel, FUEL_LABELS, CONFIANCA_THRESHOLD, formatAlerts } from "./painel-ai";
import type { WhatsappSession, Vehicle } from "@shared/schema";

// ─── STEP NAMES ──────────────────────────────────────────────────────────────

export const VEH_STEPS = {
  ESCOLHER_VEICULO:             "veh_escolher_veiculo",
  AGUARDANDO_OS:                "veh_aguardando_os",
  AGUARDANDO_MOTIVO:            "veh_aguardando_motivo",
  AGUARDANDO_DESTINO:           "veh_aguardando_destino",
  AGUARDANDO_FOTO_SAIDA:        "veh_aguardando_foto_saida",
  // IA — leitura inicial
  CONFIRMANDO_LEITURA_INICIAL:  "veh_confirmando_leitura_inicial",
  KM_MANUAL_INICIAL:            "veh_km_manual_inicial",
  COMBUSTIVEL_MANUAL_INICIAL:   "veh_combustivel_manual_inicial",
  // Retorno
  RETORNO_FOTO:                 "veh_retorno_foto",
  // IA — leitura final
  CONFIRMANDO_LEITURA_FINAL:    "veh_confirmando_leitura_final",
  KM_MANUAL_FINAL:              "veh_km_manual_final",
  COMBUSTIVEL_MANUAL_FINAL:     "veh_combustivel_manual_final",
  RETORNO_OBS:                  "veh_retorno_obs",
};

export const VEH_STEP_LABELS: Record<string, string> = {
  veh_escolher_veiculo:             "🚗 Escolhendo veículo",
  veh_aguardando_os:                "📋 Aguardando OS",
  veh_aguardando_motivo:            "📝 Aguardando motivo",
  veh_aguardando_destino:           "📍 Aguardando destino",
  veh_aguardando_foto_saida:        "📸 Aguardando foto de saída",
  veh_confirmando_leitura_inicial:  "✅ Confirmando leitura inicial",
  veh_km_manual_inicial:            "📝 KM manual (saída)",
  veh_combustivel_manual_inicial:   "⛽ Combustível manual (saída)",
  veh_retorno_foto:                 "📸 Aguardando foto de retorno",
  veh_confirmando_leitura_final:    "✅ Confirmando leitura final",
  veh_km_manual_final:              "📝 KM manual (retorno)",
  veh_combustivel_manual_final:     "⛽ Combustível manual (retorno)",
  veh_retorno_obs:                  "💬 Aguardando observações",
};

// ─── COMMAND DETECTION ────────────────────────────────────────────────────────

export function isVehicleExitCommand(msgNorm: string): boolean {
  const veiculo =
    msgNorm.includes("veiculo") ||
    msgNorm.includes("veículo") ||
    msgNorm.includes("carro") ||
    msgNorm.includes("moto") ||
    msgNorm.includes("caminhao") ||
    msgNorm.includes("caminhão") ||
    msgNorm.includes("van") ||
    msgNorm.includes("utilitario") ||
    msgNorm.includes("utilitário") ||
    msgNorm.includes("picape") ||
    msgNorm.includes("pickup");

  const saidaVerb =
    msgNorm.includes("saida") ||
    msgNorm.includes("saída") ||
    msgNorm.includes("sair") ||    // "vou sair com o carro", "iria sair com um veículo"
    msgNorm.includes("saindo");    // "estou saindo com o carro"

  const outraAcao =
    (msgNorm.includes("retirar") || msgNorm.includes("retirada") || msgNorm.includes("pegar") || msgNorm.includes("usar")) && veiculo;

  if (saidaVerb && veiculo) return true;
  if (outraAcao) return true;
  if (msgNorm === "saida" || msgNorm === "saída") return true;
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
  if (
    (msgNorm.includes("encerrar") || msgNorm.includes("finalizar") || msgNorm.includes("devolvi")) &&
    (msgNorm.includes("saida") || msgNorm.includes("veiculo"))
  ) return true;
  return false;
}

function isSim(msgNorm: string): boolean {
  return ["sim", "s", "confirmo", "ok", "correto", "isso", "certo", "yes"].includes(msgNorm);
}

function isNao(msgNorm: string): boolean {
  return ["nao", "não", "n", "errado", "incorreto", "corrigir", "no"].includes(msgNorm);
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

function parseKm(rawBody: string): number | null {
  const digits = rawBody.replace(/[^\d]/g, "");
  const km = parseInt(digits);
  return !isNaN(km) && km > 0 ? km : null;
}

function buildAlertasMsgLine(alertasJson: string | null | undefined): string {
  const txt = formatAlerts(alertasJson);
  return txt
    ? `⚠️ Alertas: ${txt}`
    : "✅ Alertas: nenhum";
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export interface VehMessages {
  naoCadastrado?: string | null;
  naoAutorizado?: string | null;
  semVeiculos?: string | null;
  cancelado?: string | null;
  saidaSucesso?: string | null;
  retornoSucesso?: string | null;
}

export interface VehicleWaParams {
  from: string;
  rawBody: string;
  msgNorm: string;
  msgType: string;
  mediaId?: string;
  session: WhatsappSession;
  token: string;
  vehMessages?: VehMessages;
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
  const { from, rawBody, msgNorm, msgType, mediaId, session, token, vehMessages = {}, reply, updateSession } = params;

  const MSG_NAO_CADASTRADO = vehMessages.naoCadastrado ||
    "⛔ Seu número não está vinculado a nenhum funcionário cadastrado no sistema.\n\nSolicite ao responsável que cadastre seu WhatsApp no perfil de vendedor/motorista do ERP.";
  const MSG_NAO_AUTORIZADO = (nome: string) =>
    vehMessages.naoAutorizado
      ? vehMessages.naoAutorizado.replace("{nome}", nome)
      : `⛔ Olá, *${nome}*! Você não está autorizado a retirar veículos da empresa.\n\nEntre em contato com o responsável para solicitar autorização.`;
  const MSG_SEM_VEICULOS = vehMessages.semVeiculos ||
    "😟 Não há veículos disponíveis no momento. Todos estão em manutenção ou inativos. Contate o responsável.";
  const MSG_CANCELADO = vehMessages.cancelado ||
    "✅ Registro cancelado. Quando precisar, envie *saída veículo* para recomeçar.";
  const step = session.step;
  const data = (session.data ?? {}) as Record<string, unknown>;
  const phone = from.replace(/\D/g, "");

  const isVehStep = step.startsWith("veh_");
  const isExitCmd = isVehicleExitCommand(msgNorm);
  const isReturnCmd = isVehicleReturnCommand(msgNorm);

  if (!isVehStep && !isExitCmd && !isReturnCmd) return false;

  // "cancelar" within vehicle flow
  if (
    isVehStep &&
    (msgNorm === "cancelar saida" || msgNorm === "cancelar saída" || msgNorm === "cancelar")
  ) {
    await updateSession({ step: "collecting", data: {} });
    await reply(MSG_CANCELADO, "collecting", {});
    return true;
  }

  // ── RETURN COMMAND (from outside vehicle steps) ───────────────────────────
  if (!isVehStep && isReturnCmd) {
    const driver = await storage.getSellerByWhatsappNumber(phone);
    if (!driver) {
      await reply(MSG_NAO_CADASTRADO);
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
      await reply(MSG_NAO_CADASTRADO);
      return true;
    }

    if (!driver.autorizadoDirigir) {
      await reply(MSG_NAO_AUTORIZADO(driver.nomeCompleto));
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
      await reply(MSG_SEM_VEICULOS);
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
      `📸 ${destino ? `Destino: *${destino}*\n\n` : ""}Agora envie a *foto do painel* do veículo *(${data.veh_vehicleModelo ?? "veículo selecionado"})* antes de sair.\n\n_A foto comprova o estado inicial e nossa IA vai extrair automaticamente o KM e o combustível!_`,
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

    // 1. Create exit record first (without km/fuel — will be updated after AI reading)
    let exitId: string;
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
      exitId = exit.id;
    } catch (err) {
      console.error("[VehicleWA] Erro ao criar saída:", err);
      await reply(`❌ Erro ao registrar a saída. Tente novamente ou registre manualmente no ERP.`, "collecting", {});
      return true;
    }

    // 2. Inform user and start AI analysis
    await reply(`📸 Foto recebida! Analisando o painel... 🔍\n\n_Isso leva alguns segundos._`);

    const analise = await analisarPainelVeiculo(photoUrl ?? "");
    console.log("[VehicleWA] Análise inicial:", { exitId, ...analise });

    const sessionBase: Record<string, unknown> = {
      ...data,
      veh_exitId: exitId,
      veh_aiKm: analise.km,
      veh_aiFuel: analise.combustivel,
      veh_aiAlerts: JSON.stringify(analise.alertas),
      veh_aiConfKm: analise.confiancaKm,
      veh_aiConfFuel: analise.confiancaCombustivel,
      veh_aiRaw: analise.raw,
      veh_aiAt: new Date().toISOString(),
    };

    const kmOk = analise.sucesso && analise.km !== null && analise.confiancaKm >= CONFIANCA_THRESHOLD;
    const fuelOk = analise.sucesso && analise.combustivel !== null && analise.confiancaCombustivel >= CONFIANCA_THRESHOLD;

    if (kmOk && fuelOk) {
      await reply(
        `🔍 *Leitura do painel (IA):*\n\n` +
          `📏 Km: *${analise.km!.toLocaleString("pt-BR")}*\n` +
          `⛽ Combustível: *${FUEL_LABELS[analise.combustivel!]}*\n` +
          `${buildAlertasMsgLine(JSON.stringify(analise.alertas))}\n\n` +
          `_Os dados conferem? Responda *sim* para confirmar ou *não* para corrigir._`,
        VEH_STEPS.CONFIRMANDO_LEITURA_INICIAL,
        sessionBase
      );
    } else {
      let msg = `🔍 `;
      if (!analise.sucesso) {
        msg += `Não consegui ler o painel automaticamente.\n\n`;
      } else {
        msg += `Leitura parcial do painel:\n`;
        if (kmOk) msg += `📏 Km: *${analise.km!.toLocaleString("pt-BR")}*\n`;
        if (fuelOk) msg += `⛽ Combustível: *${FUEL_LABELS[analise.combustivel!]}*\n`;
        msg += `\n_Não consegui confirmar todos os dados com confiança suficiente._\n\n`;
      }
      msg += `Por favor, informe o *KM atual* do odômetro:\n_(Ex: 82415)_`;
      await reply(msg, VEH_STEPS.KM_MANUAL_INICIAL, sessionBase);
    }
    return true;
  }

  // ── VEH STEP: CONFIRMAR LEITURA INICIAL ──────────────────────────────────
  if (step === VEH_STEPS.CONFIRMANDO_LEITURA_INICIAL) {
    const exitId = data.veh_exitId as string;

    if (isSim(msgNorm)) {
      // Persist confirmed AI data
      try {
        await storage.updateVehicleExit(exitId, {
          kmInicial: data.veh_aiKm != null ? String(data.veh_aiKm) : undefined,
          combustivelInicial: (data.veh_aiFuel as any) ?? undefined,
          origemKmInicial: "ia_confirmado",
          origemCombustivelInicial: "ia_confirmado",
          leituraKmInicialConfianca: data.veh_aiConfKm != null ? String(data.veh_aiConfKm) : undefined,
          leituraCombustivelInicialConfianca: data.veh_aiConfFuel != null ? String(data.veh_aiConfFuel) : undefined,
          alertasPainelInicial: data.veh_aiAlerts as string ?? undefined,
          fotoInicialAnalisadaEm: new Date() as any,
          painelInicialRawAnalise: data.veh_aiRaw as string ?? undefined,
        } as any);
      } catch (err) {
        console.error("[VehicleWA] Erro ao salvar leitura inicial confirmada:", err);
      }

      const alertasTxt = formatAlerts(data.veh_aiAlerts as string);
      const saidaSucessoMsg = vehMessages.saidaSucesso
        ? vehMessages.saidaSucesso
            .replace("{veiculo}", String(data.veh_vehicleModelo ?? ""))
            .replace("{placa}", String(data.veh_vehiclePlaca ?? ""))
            .replace("{km}", Number(data.veh_aiKm).toLocaleString("pt-BR"))
            .replace("{combustivel}", FUEL_LABELS[data.veh_aiFuel as string] ?? String(data.veh_aiFuel ?? ""))
        : `✅ *Saída registrada com sucesso!*\n\n` +
          `🚗 *${data.veh_vehicleModelo}* — Placa: ${data.veh_vehiclePlaca}\n` +
          `📏 KM: ${Number(data.veh_aiKm).toLocaleString("pt-BR")}\n` +
          `⛽ Combustível: ${FUEL_LABELS[data.veh_aiFuel as string] ?? data.veh_aiFuel}\n` +
          `${alertasTxt ? `⚠️ Alertas: ${alertasTxt}\n` : ""}` +
          `\nAo retornar, envie *retornei*. Boa viagem! 🛣️`;
      await reply(saidaSucessoMsg, "collecting", {});
      return true;
    }

    if (isNao(msgNorm)) {
      await reply(
        `📝 Tudo bem! Vamos corrigir manualmente.\n\nQual é o *KM atual* do odômetro?\n_(Ex: 82415)_`,
        VEH_STEPS.KM_MANUAL_INICIAL,
        { ...data }
      );
      return true;
    }

    await reply(
      `Por favor, responda *sim* para confirmar os dados lidos ou *não* para corrigir manualmente.`
    );
    return true;
  }

  // ── VEH STEP: KM MANUAL INICIAL ──────────────────────────────────────────
  if (step === VEH_STEPS.KM_MANUAL_INICIAL) {
    const km = parseKm(rawBody);
    if (km === null) {
      await reply(
        `⚠️ Não entendi. Por favor, informe apenas o número do KM atual do odômetro.\n_(Ex: 82415)_`
      );
      return true;
    }

    await reply(
      `✅ KM registrado: *${km.toLocaleString("pt-BR")}*\n\n⛽ Qual é o *nível de combustível* atual?\n\nOpções:\n• *vazio*\n• *1/4*\n• *1/2*\n• *3/4*\n• *cheio*`,
      VEH_STEPS.COMBUSTIVEL_MANUAL_INICIAL,
      { ...data, veh_kmManual: km }
    );
    return true;
  }

  // ── VEH STEP: COMBUSTÍVEL MANUAL INICIAL ─────────────────────────────────
  if (step === VEH_STEPS.COMBUSTIVEL_MANUAL_INICIAL) {
    const fuel = parseFuelLevel(msgNorm);
    if (!fuel) {
      await reply(
        `⚠️ Não reconheci o nível de combustível.\n\nEnvie uma das opções:\n• *vazio*\n• *1/4*\n• *1/2*\n• *3/4*\n• *cheio*`
      );
      return true;
    }

    const exitId = data.veh_exitId as string;
    const km = data.veh_kmManual as number;
    try {
      await storage.updateVehicleExit(exitId, {
        kmInicial: String(km),
        combustivelInicial: fuel as any,
        origemKmInicial: "manual",
        origemCombustivelInicial: "manual",
        fotoInicialAnalisadaEm: new Date() as any,
        ...(data.veh_aiAlerts ? { alertasPainelInicial: data.veh_aiAlerts as string } : {}),
        ...(data.veh_aiRaw ? { painelInicialRawAnalise: data.veh_aiRaw as string } : {}),
        ...(data.veh_aiConfKm != null ? { leituraKmInicialConfianca: String(data.veh_aiConfKm) } : {}),
        ...(data.veh_aiConfFuel != null ? { leituraCombustivelInicialConfianca: String(data.veh_aiConfFuel) } : {}),
      } as any);
    } catch (err) {
      console.error("[VehicleWA] Erro ao salvar km/combustível manual inicial:", err);
    }

    const saidaManualMsg = vehMessages.saidaSucesso
      ? vehMessages.saidaSucesso
          .replace("{veiculo}", String(data.veh_vehicleModelo ?? ""))
          .replace("{placa}", String(data.veh_vehiclePlaca ?? ""))
          .replace("{km}", km.toLocaleString("pt-BR"))
          .replace("{combustivel}", FUEL_LABELS[fuel])
      : `✅ *Saída registrada!*\n\n` +
        `🚗 *${data.veh_vehicleModelo}* — Placa: ${data.veh_vehiclePlaca}\n` +
        `📏 KM: ${km.toLocaleString("pt-BR")}\n` +
        `⛽ Combustível: ${FUEL_LABELS[fuel]}\n` +
        `\nAo retornar, envie *retornei*. Boa viagem! 🛣️`;
    await reply(saidaManualMsg, "collecting", {});
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

    // Interim message while AI analyzes
    await reply(`📸 Foto recebida! Analisando o painel do retorno... 🔍\n\n_Isso leva alguns segundos._`);

    const analise = await analisarPainelVeiculo(photoUrl ?? "");
    console.log("[VehicleWA] Análise final:", { exitId: data.veh_exitId, ...analise });

    const sessionBase: Record<string, unknown> = {
      ...data,
      veh_fotoFinal: photoUrl,
      veh_ai2Km: analise.km,
      veh_ai2Fuel: analise.combustivel,
      veh_ai2Alerts: JSON.stringify(analise.alertas),
      veh_ai2ConfKm: analise.confiancaKm,
      veh_ai2ConfFuel: analise.confiancaCombustivel,
      veh_ai2Raw: analise.raw,
      veh_ai2At: new Date().toISOString(),
    };

    const kmOk = analise.sucesso && analise.km !== null && analise.confiancaKm >= CONFIANCA_THRESHOLD;
    const fuelOk = analise.sucesso && analise.combustivel !== null && analise.confiancaCombustivel >= CONFIANCA_THRESHOLD;

    if (kmOk && fuelOk) {
      await reply(
        `🔍 *Leitura do painel no retorno (IA):*\n\n` +
          `📏 Km: *${analise.km!.toLocaleString("pt-BR")}*\n` +
          `⛽ Combustível: *${FUEL_LABELS[analise.combustivel!]}*\n` +
          `${buildAlertasMsgLine(JSON.stringify(analise.alertas))}\n\n` +
          `_Os dados conferem? Responda *sim* para confirmar ou *não* para corrigir._`,
        VEH_STEPS.CONFIRMANDO_LEITURA_FINAL,
        sessionBase
      );
    } else {
      let msg = `🔍 `;
      if (!analise.sucesso) {
        msg += `Não consegui ler o painel automaticamente.\n\n`;
      } else {
        msg += `Leitura parcial do painel:\n`;
        if (kmOk) msg += `📏 Km: *${analise.km!.toLocaleString("pt-BR")}*\n`;
        if (fuelOk) msg += `⛽ Combustível: *${FUEL_LABELS[analise.combustivel!]}*\n`;
        msg += `\n_Não consegui confirmar todos os dados._\n\n`;
      }
      msg += `Por favor, informe o *KM atual* do odômetro no retorno:\n_(Ex: 82800)_`;
      await reply(msg, VEH_STEPS.KM_MANUAL_FINAL, sessionBase);
    }
    return true;
  }

  // ── VEH STEP: CONFIRMAR LEITURA FINAL ────────────────────────────────────
  if (step === VEH_STEPS.CONFIRMANDO_LEITURA_FINAL) {
    if (isSim(msgNorm)) {
      await reply(
        `✅ Dados confirmados!\n\n📝 Alguma *observação* sobre a viagem?\n_(Incidentes, abastecimento, problemas...)_\n\nOu envie *ok* para finalizar sem observações.`,
        VEH_STEPS.RETORNO_OBS,
        {
          ...data,
          veh_kmFinal: data.veh_ai2Km,
          veh_fuelFinal: data.veh_ai2Fuel,
          veh_srcKmFinal: "ia_confirmado",
          veh_srcFuelFinal: "ia_confirmado",
        }
      );
      return true;
    }

    if (isNao(msgNorm)) {
      await reply(
        `📝 Tudo bem! Vamos corrigir manualmente.\n\nQual é o *KM atual* do odômetro no retorno?\n_(Ex: 82800)_`,
        VEH_STEPS.KM_MANUAL_FINAL,
        { ...data }
      );
      return true;
    }

    await reply(
      `Por favor, responda *sim* para confirmar os dados lidos ou *não* para corrigir manualmente.`
    );
    return true;
  }

  // ── VEH STEP: KM MANUAL FINAL ────────────────────────────────────────────
  if (step === VEH_STEPS.KM_MANUAL_FINAL) {
    const km = parseKm(rawBody);
    if (km === null) {
      await reply(
        `⚠️ Não entendi. Por favor, informe apenas o número do KM atual do odômetro no retorno.\n_(Ex: 82800)_`
      );
      return true;
    }

    await reply(
      `✅ KM registrado: *${km.toLocaleString("pt-BR")}*\n\n⛽ Qual é o *nível de combustível* atual?\n\nOpções:\n• *vazio*\n• *1/4*\n• *1/2*\n• *3/4*\n• *cheio*`,
      VEH_STEPS.COMBUSTIVEL_MANUAL_FINAL,
      { ...data, veh_kmManualFinal: km }
    );
    return true;
  }

  // ── VEH STEP: COMBUSTÍVEL MANUAL FINAL ───────────────────────────────────
  if (step === VEH_STEPS.COMBUSTIVEL_MANUAL_FINAL) {
    const fuel = parseFuelLevel(msgNorm);
    if (!fuel) {
      await reply(
        `⚠️ Não reconheci o nível de combustível.\n\nEnvie uma das opções:\n• *vazio*\n• *1/4*\n• *1/2*\n• *3/4*\n• *cheio*`
      );
      return true;
    }

    const km = data.veh_kmManualFinal as number;
    await reply(
      `✅ KM: *${km.toLocaleString("pt-BR")}*, Combustível: *${FUEL_LABELS[fuel]}*\n\n📝 Alguma *observação* sobre a viagem?\n_(Incidentes, abastecimento, problemas...)_\n\nOu envie *ok* para finalizar sem observações.`,
      VEH_STEPS.RETORNO_OBS,
      {
        ...data,
        veh_kmFinal: km,
        veh_fuelFinal: fuel,
        veh_srcKmFinal: "manual",
        veh_srcFuelFinal: "manual",
      }
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
    const kmFinal = data.veh_kmFinal as number | null;
    const fuelFinal = data.veh_fuelFinal as string | null;
    const srcKm = (data.veh_srcKmFinal as string) || null;
    const srcFuel = (data.veh_srcFuelFinal as string) || null;

    try {
      await storage.updateVehicleExit(exitId, {
        dataHoraRetorno: new Date() as any,
        fotoFinalUrl: fotoFinal ?? undefined,
        observacoesRetorno: observacoes ?? undefined,
        status: "finalizada",
        ...(kmFinal != null ? { kmFinal: String(kmFinal) } : {}),
        ...(fuelFinal ? { combustivelFinal: fuelFinal as any } : {}),
        ...(srcKm ? { origemKmFinal: srcKm } : {}),
        ...(srcFuel ? { origemCombustivelFinal: srcFuel } : {}),
        // IA analysis metadata
        ...(data.veh_ai2Raw ? {
          leituraKmFinalConfianca: data.veh_ai2ConfKm != null ? String(data.veh_ai2ConfKm) : undefined,
          leituraCombustivelFinalConfianca: data.veh_ai2ConfFuel != null ? String(data.veh_ai2ConfFuel) : undefined,
          alertasPainelFinal: data.veh_ai2Alerts as string ?? undefined,
          fotoFinalAnalisadaEm: new Date() as any,
          painelFinalRawAnalise: data.veh_ai2Raw as string ?? undefined,
        } : {}),
      } as any);

      const dtRetorno = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const kmPercMsg = kmFinal && (data.veh_aiKm as number)
        ? `\n📏 KM percorridos: ${(kmFinal - Number(data.veh_aiKm)).toLocaleString("pt-BR")} km`
        : "";

      const retornoSucessoMsg = vehMessages.retornoSucesso
        ? vehMessages.retornoSucesso
            .replace("{veiculo}", String(data.veh_vehicleModelo ?? ""))
            .replace("{placa}", String(data.veh_vehiclePlaca ?? ""))
            .replace("{km}", kmFinal ? Number(kmFinal).toLocaleString("pt-BR") : "-")
            .replace("{combustivel}", fuelFinal ? FUEL_LABELS[fuelFinal] : "-")
            .replace("{data}", dtRetorno)
        : `✅ *Retorno registrado com sucesso!*\n\n` +
          `🕐 ${dtRetorno}\n` +
          `${kmFinal ? `📏 KM final: ${Number(kmFinal).toLocaleString("pt-BR")}\n` : ""}` +
          `${fuelFinal ? `⛽ Combustível: ${FUEL_LABELS[fuelFinal]}\n` : ""}` +
          kmPercMsg +
          `${observacoes ? `\n📝 Obs: ${observacoes}\n` : ""}` +
          `\nObrigado! O uso do veículo foi registrado. 🚗`;
      await reply(retornoSucessoMsg, "collecting", {});
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
