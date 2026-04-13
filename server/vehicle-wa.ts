import { storage } from "./storage";
import type { WhatsappSession, Vehicle } from "@shared/schema";

// ─── STEP NAMES ──────────────────────────────────────────────────────────────

export const VEH_STEPS = {
  ESCOLHER_VEICULO:  "veh_escolher_veiculo",
  AGUARDANDO_KM:     "veh_aguardando_km",
  RETORNO_ESCOLHER:  "veh_retorno_escolher",
  RETORNO_KM:        "veh_retorno_km",
  RETORNO_OBS:       "veh_retorno_obs",
};

export const VEH_STEP_LABELS: Record<string, string> = {
  veh_escolher_veiculo: "🚗 Escolhendo veículo",
  veh_aguardando_km:    "📏 Aguardando KM de saída",
  veh_retorno_escolher: "🚗 Escolhendo veículo p/ retorno",
  veh_retorno_km:       "📏 Aguardando KM de retorno",
  veh_retorno_obs:      "💬 Aguardando observações",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function isVehicleExitCommand(msgNorm: string): boolean {
  const s = stripAccents(msgNorm);
  const hasVehicle =
    s.includes("veiculo") || s.includes("carro") || s.includes("moto") ||
    s.includes("caminhao") || s.includes("van") || s.includes("utilitario") ||
    s.includes("picape") || s.includes("pickup");
  const hasSaidaVerb = s.includes("saida") || s.includes("sair") || s.includes("saindo");
  const hasRetira = (s.includes("retirar") || s.includes("retirada") || s.includes("pegar") || s.includes("usar")) && hasVehicle;
  if (hasSaidaVerb && hasVehicle) return true;
  if (hasRetira) return true;
  if (s === "saida") return true;
  if (/\b(carro|moto|caminhao|van|pickup|picape|uno|strada|saveiro|kombi|palio|siena|gol|onix|kwid|hb20|tracker|civic|corolla|hilux|ranger|s10|frontier|amarok)\s*\d+\b/.test(s)) return true;
  return false;
}

export function isVehicleReturnCommand(msgNorm: string): boolean {
  const exact = ["retornei", "voltei", "cheguei", "devolvi"];
  if (exact.includes(msgNorm)) return true;
  const s = stripAccents(msgNorm);
  const hasVeiculo =
    s.includes("veiculo") || s.includes("carro") || s.includes("moto") ||
    s.includes("caminhao") || s.includes("van");
  const hasVolta = s.includes("voltei") || s.includes("retornei") || s.includes("cheguei") ||
    s.includes("devolvi") || s.includes("retorno") || (s.includes("devolver") && hasVeiculo);
  return hasVolta;
}

function formatVehicleList(list: Vehicle[]): string {
  return list
    .map((v, i) =>
      `${v.numeroInterno ?? i + 1}. *${v.marca} ${v.modelo}* — Placa: ${v.placa}${v.kmAtual ? ` (${Number(v.kmAtual).toFixed(0)} km)` : ""}`
    )
    .join("\n");
}

function parseVehicleFromMsg(msgNorm: string, list: Vehicle[]): Vehicle | null {
  const s = stripAccents(msgNorm.trim());
  const numMatch = s.match(/\b(\d+)\b/);
  const num = numMatch ? parseInt(numMatch[1]) : null;

  for (const v of list) {
    const modelo = stripAccents(v.modelo);
    const marca = stripAccents(v.marca);
    if (s.includes(modelo) || s.includes(marca)) {
      if (num != null && v.numeroInterno != null && v.numeroInterno === num) return v;
      return v;
    }
  }

  if (num != null) {
    const byInternal = list.find(v => v.numeroInterno != null && v.numeroInterno === num);
    if (byInternal) return byInternal;
    if (num >= 1 && num <= list.length) return list[num - 1];
  }
  return null;
}

function parseVehicleSelection(rawBody: string, list: Vehicle[]): Vehicle | null {
  const plateNorm = rawBody.replace(/[\s\-\.]/g, "").toUpperCase();
  const byPlate = list.find(v => v.placa.replace(/[\s\-\.]/g, "").toUpperCase() === plateNorm);
  if (byPlate) return byPlate;
  return parseVehicleFromMsg(rawBody.toLowerCase(), list);
}

function parseKm(rawBody: string): number | null {
  const digits = rawBody.replace(/[^\d]/g, "");
  if (!digits || digits.length < 2) return null;
  const km = parseInt(digits);
  return isNaN(km) || km <= 0 ? null : km;
}

// ── Parse KM + OS(s) + Motivo numa única mensagem ─────────────────────────
// Ex: "41500 OS 1234 e 5678 entrega de pedidos"
// Ex: "41500" (só KM)
// Ex: "41500 entrega ao cliente"
// Ex: "41.500 OS 1234"
function parseKmAndMotivo(rawBody: string): { km: number | null; motivo: string | null } {
  let body = rawBody.trim();

  // 1. Extrair OS(s): padrão "os" ou "o.s." + números separados por , / e &
  const osNumbers: string[] = [];
  const osRegex = /\bo\.?s\.?s?\s*[:\-]?\s*([\d]+(?:\s*(?:[,\/]|\s+e\s+|\s+&\s+|\s+and\s+)\s*\d+)*)/gi;
  let osMatch: RegExpExecArray | null;
  const osSpans: Array<[number, number]> = [];
  while ((osMatch = osRegex.exec(body)) !== null) {
    const nums = osMatch[1].match(/\d+/g) ?? [];
    osNumbers.push(...nums);
    osSpans.push([osMatch.index, osMatch.index + osMatch[0].length]);
  }
  // Remover OS do body (de trás pra frente)
  let bodyWithoutOs = body;
  for (let i = osSpans.length - 1; i >= 0; i--) {
    const [s, e] = osSpans[i];
    bodyWithoutOs = bodyWithoutOs.slice(0, s) + " " + bodyWithoutOs.slice(e);
  }
  bodyWithoutOs = bodyWithoutOs.trim();

  // 2. Extrair KM: maior número no texto restante (KM costuma ser maior que nº de OS)
  const allNums = bodyWithoutOs.match(/[\d\.]+/g) ?? [];
  if (!allNums.length && osNumbers.length === 0) return { km: null, motivo: null };
  if (!allNums.length) return { km: null, motivo: null };

  let kmStr = "";
  let kmVal = -1;
  for (const n of allNums) {
    const v = parseInt(n.replace(/\./g, ""), 10); // aceita 41.500
    if (!isNaN(v) && v > kmVal) { kmVal = v; kmStr = n; }
  }
  if (kmVal < 10) return { km: null, motivo: null };

  // 3. Motivo = tudo que sobra depois de tirar o KM
  const bodyWithoutKm = bodyWithoutOs
    .replace(new RegExp(kmStr.replace(/\./g, "\\."), ""), "")
    .replace(/^\s*[,.\-:]+\s*/, "")
    .replace(/\s*[,.\-:]+\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const motivoParts: string[] = [];
  if (osNumbers.length > 0) motivoParts.push(`OS ${osNumbers.join(", ")}`);
  if (bodyWithoutKm) motivoParts.push(bodyWithoutKm);

  return { km: kmVal, motivo: motivoParts.length > 0 ? motivoParts.join(" — ") : null };
}

const PROMPT_KM_SAIDA =
  `📏 Informe o *KM atual*, a(s) *OS* e/ou o *motivo da saída* — tudo numa única mensagem:\n\n` +
  `_Exemplos:_\n` +
  `• _41500 OS 1234_\n` +
  `• _41500 OS 1234 e 5678 entrega de pedidos_\n` +
  `• _41500 entrega ao cliente_\n` +
  `• _41500_ _(só o KM, se preferir)_`;

function isNao(msgNorm: string): boolean {
  return ["nao", "não", "n", "nope", "sem obs", "sem observacao", "sem observações", "sem observacoes", "nada", "ok", "tudo bem", "tudo certo", "tudo ok"].includes(msgNorm);
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
  vehMessages: Record<string, string | null | undefined>;
  reply: (msg: string, nextStep?: string, extraData?: Record<string, unknown>) => Promise<void>;
  updateSession: (data: Partial<WhatsappSession>) => Promise<void>;
}

export async function handleVehicleWaFlow(params: VehicleWaParams): Promise<boolean> {
  const { from, rawBody, msgNorm, session, vehMessages, reply, updateSession } = params;

  const MSG_NAO_CADASTRADO = vehMessages.naoCadastrado ||
    "⛔ Seu número não está vinculado a nenhum funcionário cadastrado.\n\nSolicite ao responsável que cadastre seu WhatsApp no ERP.";
  const MSG_NAO_AUTORIZADO = (nome: string) =>
    vehMessages.naoAutorizado
      ? vehMessages.naoAutorizado.replace("{nome}", nome)
      : `⛔ Olá, *${nome}*! Você não está autorizado a retirar veículos.\n\nContate o responsável para solicitar autorização.`;
  const MSG_SEM_VEICULOS = vehMessages.semVeiculos ||
    "😟 Não há veículos disponíveis no momento. Contate o responsável.";

  const step = session.step;
  const data = (session.data ?? {}) as Record<string, unknown>;
  const phone = from.replace(/\D/g, "");

  const isVehStep = step.startsWith("veh_");
  const isExitCmd = isVehicleExitCommand(msgNorm);
  const isReturnCmd = isVehicleReturnCommand(msgNorm);

  if (!isVehStep && !isExitCmd && !isReturnCmd) return false;

  // "cancelar" dentro do fluxo de veículo
  if (isVehStep && (msgNorm === "cancelar" || msgNorm === "cancelar saida" || msgNorm === "cancelar saída")) {
    await reply("✅ Operação cancelada.", "collecting", {});
    return true;
  }

  // ── COMANDO DE RETORNO (fora do fluxo) ───────────────────────────────────
  if (!isVehStep && isReturnCmd) {
    const driver = await storage.getSellerByWhatsappNumber(phone);
    if (!driver) { await reply(MSG_NAO_CADASTRADO); return true; }

    const openExit = await storage.getOpenVehicleExitByDriver(driver.id);
    if (openExit) {
      const dtSaida = new Date(openExit.dataHoraSaida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await reply(
        `🚗 Olá, *${driver.nomeCompleto}*! Encontrei sua saída em aberto:\n\n` +
        `*${openExit.vehicle.marca} ${openExit.vehicle.modelo}* — ${openExit.vehicle.placa}\n` +
        `⏱️ Saída: ${dtSaida}\n\n` +
        `📏 Informe o *KM atual* do veículo:`,
        VEH_STEPS.RETORNO_KM,
        { veh_exitId: openExit.id, veh_vehicleId: openExit.vehicleId, veh_vehiclePlaca: openExit.vehicle.placa, veh_vehicleModelo: `${openExit.vehicle.marca} ${openExit.vehicle.modelo}` }
      );
      return true;
    }

    // Não tem saída em aberto → outro motorista devolvendo
    const allVehicles = await storage.getVehicles({ status: "ativo" });
    const withOpenExit: Vehicle[] = [];
    for (const v of allVehicles) {
      const oe = await storage.getOpenVehicleExitByVehicle(v.id);
      if (oe) withOpenExit.push(v);
    }
    if (!withOpenExit.length) {
      await reply(`ℹ️ Olá, *${driver.nomeCompleto}*! Não há nenhum veículo com saída em aberto no momento.`);
      return true;
    }
    await reply(
      `🚗 Olá, *${driver.nomeCompleto}*! Você não tem saída em aberto, mas quer registrar retorno de outro veículo.\n\n` +
      `Veículos fora:\n${formatVehicleList(withOpenExit)}\n\n` +
      `Qual veículo está devolvendo? (número, placa ou modelo)`,
      VEH_STEPS.RETORNO_ESCOLHER,
      { veh_driverRetornoId: driver.id, veh_driverRetornoName: driver.nomeCompleto }
    );
    return true;
  }

  // ── COMANDO DE SAÍDA (fora do fluxo) ─────────────────────────────────────
  if (!isVehStep && isExitCmd) {
    const driver = await storage.getSellerByWhatsappNumber(phone);
    if (!driver) { await reply(MSG_NAO_CADASTRADO); return true; }
    if (!driver.autorizadoDirigir) { await reply(MSG_NAO_AUTORIZADO(driver.nomeCompleto)); return true; }

    const openExit = await storage.getOpenVehicleExitByDriver(driver.id);
    if (openExit) {
      const dtSaida = new Date(openExit.dataHoraSaida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await reply(
        `⚠️ Olá, *${driver.nomeCompleto}*! Você já tem uma saída em aberto:\n\n` +
        `🚗 *${openExit.vehicle.marca} ${openExit.vehicle.modelo}* — ${openExit.vehicle.placa}\n` +
        `⏱️ Saída: ${dtSaida}\n\n` +
        `Para registrar o retorno, envie *retornei* + o KM.\nPara cancelar, envie *cancelar*.`
      );
      return true;
    }

    const allVehicles = await storage.getVehicles({ status: "ativo" });
    if (!allVehicles.length) { await reply(MSG_SEM_VEICULOS); return true; }

    // Tenta identificar veículo na mensagem
    const vehicleFromMsg = parseVehicleFromMsg(msgNorm, allVehicles);
    if (vehicleFromMsg) {
      await reply(
        `🚗 Olá, *${driver.nomeCompleto}*!\n\n` +
        `Veículo: *${vehicleFromMsg.marca} ${vehicleFromMsg.modelo}* — Placa: ${vehicleFromMsg.placa}\n\n` +
        PROMPT_KM_SAIDA,
        VEH_STEPS.AGUARDANDO_KM,
        { veh_driverId: driver.id, veh_driverName: driver.nomeCompleto, veh_vehicleId: vehicleFromMsg.id, veh_vehiclePlaca: vehicleFromMsg.placa, veh_vehicleModelo: `${vehicleFromMsg.marca} ${vehicleFromMsg.modelo}` }
      );
      return true;
    }

    await reply(
      `🚗 Olá, *${driver.nomeCompleto}*! Vou registrar sua saída.\n\n` +
      `Veículos disponíveis:\n${formatVehicleList(allVehicles)}\n\n` +
      `Qual veículo você vai retirar? (número, placa ou modelo)`,
      VEH_STEPS.ESCOLHER_VEICULO,
      { veh_driverId: driver.id, veh_driverName: driver.nomeCompleto }
    );
    return true;
  }

  // ── STEP: ESCOLHER VEÍCULO (saída) ───────────────────────────────────────
  if (step === VEH_STEPS.ESCOLHER_VEICULO) {
    const allVehicles = await storage.getVehicles({ status: "ativo" });
    const selected = parseVehicleSelection(rawBody, allVehicles);
    if (!selected) {
      await reply(`⚠️ Não reconheci o veículo. Envie o número, placa ou modelo:\n\n${formatVehicleList(allVehicles)}`);
      return true;
    }
    await reply(
      `✅ *${selected.marca} ${selected.modelo}* — ${selected.placa}\n\n` + PROMPT_KM_SAIDA,
      VEH_STEPS.AGUARDANDO_KM,
      { ...data, veh_vehicleId: selected.id, veh_vehiclePlaca: selected.placa, veh_vehicleModelo: `${selected.marca} ${selected.modelo}` }
    );
    return true;
  }

  // ── STEP: AGUARDANDO KM (saída) ──────────────────────────────────────────
  if (step === VEH_STEPS.AGUARDANDO_KM) {
    const { km, motivo } = parseKmAndMotivo(rawBody);
    if (km === null) {
      await reply(
        `⚠️ Não encontrei o KM na mensagem. Informe o KM atual (e opcionalmente a OS e motivo):\n\n` +
        `Ex: _41500 OS 1234 entrega_  ou  _41500_`
      );
      return true;
    }

    const driverId = data.veh_driverId as string;
    const vehicleId = data.veh_vehicleId as string;
    const vehicleModelo = data.veh_vehicleModelo as string;
    const vehiclePlaca = data.veh_vehiclePlaca as string;

    try {
      await storage.createVehicleExit({
        vehicleId,
        driverId,
        dataHoraSaida: new Date(),
        kmInicial: km as any,
        motivoSaida: motivo ?? null,
        combustivelInicial: null as any,
        status: "em_rota",
      });
      await storage.updateVehicle(vehicleId, { kmAtual: String(km) as any });
    } catch (err) {
      console.error("[VehicleWA] Erro ao criar saída:", err);
      await reply(`❌ Erro ao registrar a saída. Tente novamente.`, "collecting", {});
      return true;
    }

    const saidaMsg = vehMessages.saidaSucesso
      ? vehMessages.saidaSucesso
          .replace("{veiculo}", vehicleModelo)
          .replace("{placa}", vehiclePlaca)
          .replace("{km}", km.toLocaleString("pt-BR"))
          .replace("{combustivel}", "")
      : `✅ *Saída registrada!*\n\n` +
        `🚗 *${vehicleModelo}* — ${vehiclePlaca}\n` +
        `📏 KM: *${km.toLocaleString("pt-BR")}*\n` +
        (motivo ? `📋 ${motivo}\n` : "") +
        `\nAo retornar, envie *retornei*. Boa viagem! 🛣️`;
    await reply(saidaMsg, "collecting", {});
    return true;
  }

  // ── STEP: RETORNO — ESCOLHER VEÍCULO (outro motorista) ───────────────────
  if (step === VEH_STEPS.RETORNO_ESCOLHER) {
    const allVehicles = await storage.getVehicles({ status: "ativo" });
    const selected = parseVehicleSelection(rawBody, allVehicles);
    if (!selected) {
      await reply(`⚠️ Não reconheci o veículo. Envie o número, placa ou modelo:\n\n${formatVehicleList(allVehicles)}`);
      return true;
    }

    const openExit = await storage.getOpenVehicleExitByVehicle(selected.id);
    if (!openExit) {
      await reply(`ℹ️ O veículo *${selected.marca} ${selected.modelo}* não tem saída em aberto.`);
      return true;
    }

    const dtSaida = new Date(openExit.dataHoraSaida).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    await reply(
      `✅ *${selected.marca} ${selected.modelo}* — ${selected.placa}\n` +
      `⏱️ Saída: ${dtSaida} (por ${openExit.driver.nomeCompleto})\n\n` +
      `📏 Informe o *KM atual* do veículo:`,
      VEH_STEPS.RETORNO_KM,
      { ...data, veh_exitId: openExit.id, veh_vehicleId: selected.id, veh_vehiclePlaca: selected.placa, veh_vehicleModelo: `${selected.marca} ${selected.modelo}` }
    );
    return true;
  }

  // ── STEP: RETORNO — KM ────────────────────────────────────────────────────
  if (step === VEH_STEPS.RETORNO_KM) {
    const km = parseKm(rawBody);
    if (km === null) {
      await reply(`⚠️ Não entendi. Informe apenas o número do KM atual (ex: *41800*):`)
      return true;
    }
    const exitId = data.veh_exitId as string;
    const vehicleId = data.veh_vehicleId as string;

    try {
      const exitRecord = await storage.getVehicleExit(exitId);
      const kmInicial = exitRecord?.kmInicial ? Number(exitRecord.kmInicial) : null;
      const kmPercorridos = kmInicial != null ? km - kmInicial : null;
      await storage.updateVehicleExit(exitId, {
        dataHoraRetorno: new Date() as any,
        kmFinal: String(km) as any,
        kmPercorridos: kmPercorridos != null ? String(kmPercorridos) as any : undefined,
        status: "finalizada",
      });
      await storage.updateVehicle(vehicleId, { kmAtual: String(km) as any });
    } catch (err) {
      console.error("[VehicleWA] Erro ao registrar retorno:", err);
      await reply(`❌ Erro ao registrar o retorno. Tente novamente.`, "collecting", {});
      return true;
    }

    await reply(
      `✅ KM registrado: *${km.toLocaleString("pt-BR")}*\n\n` +
      `💬 Há alguma *observação* sobre a viagem?\n_(Ocorrências, danos, problemas, etc.)_\n\nSe não houver, responda *não*.`,
      VEH_STEPS.RETORNO_OBS,
      { ...data, veh_retornoKm: km }
    );
    return true;
  }

  // ── STEP: RETORNO — OBSERVAÇÕES ───────────────────────────────────────────
  if (step === VEH_STEPS.RETORNO_OBS) {
    const vehicleId = data.veh_vehicleId as string;
    const exitId = data.veh_exitId as string;
    const vehicleModelo = data.veh_vehicleModelo as string;
    const vehiclePlaca = data.veh_vehiclePlaca as string;
    const kmFinal = data.veh_retornoKm as number;
    const temObs = !isNao(msgNorm);
    const obsText = temObs ? rawBody.trim() : null;

    if (obsText) {
      try {
        await storage.updateVehicleExit(exitId, { observacoesRetorno: obsText } as any);
        await storage.updateVehicle(vehicleId, { ocorrenciaAberta: true } as any);
        // Criar registro em vehicle_issue_reports para que apareça na aba Ocorrências
        await storage.createIssueReport({
          vehicleId,
          descricao: `[WhatsApp] Observação de retorno: ${obsText}`,
          gravidade: "media",
          status: "aberto",
          dataHora: new Date(),
        } as any);
      } catch (err) {
        console.error("[VehicleWA] Erro ao salvar observação:", err);
      }
    }

    const retornoMsg = vehMessages.retornoSucesso
      ? vehMessages.retornoSucesso
          .replace("{veiculo}", vehicleModelo)
          .replace("{placa}", vehiclePlaca)
          .replace("{km}", kmFinal ? kmFinal.toLocaleString("pt-BR") : "—")
      : `✅ *Retorno registrado!*\n\n` +
        `🚗 *${vehicleModelo}* — ${vehiclePlaca}\n` +
        `📏 KM final: *${kmFinal ? kmFinal.toLocaleString("pt-BR") : "—"}*\n` +
        (obsText ? `⚠️ Ocorrência registrada: _${obsText}_\n\nO responsável será notificado. ` : ``) +
        `\nObrigado! 🙏`;

    await reply(retornoMsg, "collecting", {});
    return true;
  }

  return false;
}
