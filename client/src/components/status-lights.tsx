import { DollarSign, Factory, Package, Truck, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Vehicle } from "@shared/schema";

export type LightStatus = "verde" | "amarelo" | "vermelho" | "critico";

export interface StatusLight {
  id: string;
  label: string;
  status: LightStatus;
  detail?: string;
  icon: React.ElementType;
  href?: string;
}

export const STATUS_CONFIG: Record<LightStatus, { color: string; glow: string; dotClass: string; label: string; textClass: string }> = {
  verde:    { color: "#22c55e", glow: "0 0 8px 2px rgba(34,197,94,0.8)",   dotClass: "bg-green-500",  label: "Tudo OK",  textClass: "text-green-400" },
  amarelo:  { color: "#eab308", glow: "0 0 8px 2px rgba(234,179,8,0.8)",   dotClass: "bg-yellow-400", label: "Atenção",  textClass: "text-yellow-400" },
  vermelho: { color: "#ef4444", glow: "0 0 8px 2px rgba(239,68,68,0.85)",  dotClass: "bg-red-500",    label: "Urgente",  textClass: "text-red-400" },
  critico:  { color: "#a855f7", glow: "0 0 10px 3px rgba(168,85,247,0.9)", dotClass: "bg-purple-500", label: "Crítico",  textClass: "text-purple-400" },
};

const STATUS_ORDER: LightStatus[] = ["verde", "amarelo", "vermelho", "critico"];

function worstStatus(lights: StatusLight[]): LightStatus {
  return lights.reduce<LightStatus>(
    (worst, l) => STATUS_ORDER.indexOf(l.status) > STATUS_ORDER.indexOf(worst) ? l.status : worst,
    "verde"
  );
}

interface MaintenanceSummary {
  hasVermelho: boolean;
  hasAmarelo: boolean;
  countVermelho: number;
  countAmarelo: number;
  hasOpenIssues: boolean;
  countOpenIssues: number;
}

export function StatusLightsBar() {
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vehicles");
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const { data: maintSummary } = useQuery<MaintenanceSummary>({
    queryKey: ["/api/maintenance/summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/maintenance/summary");
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const ocorrenciasAbertas = vehicles.filter(v => v.ocorrenciaAberta);
  const hasOcorrencia = ocorrenciasAbertas.length > 0 || (maintSummary?.hasOpenIssues ?? false);
  const hasManutVermelho = maintSummary?.hasVermelho ?? false;
  const hasManutAmarelo = maintSummary?.hasAmarelo ?? false;

  let veiculoStatus: LightStatus = "verde";
  if (hasOcorrencia || hasManutVermelho) veiculoStatus = "vermelho";
  else if (hasManutAmarelo) veiculoStatus = "amarelo";

  const veiculoDetailParts: string[] = [];
  if (ocorrenciasAbertas.length > 0 || (maintSummary?.countOpenIssues ?? 0) > 0) {
    const total = Math.max(ocorrenciasAbertas.length, maintSummary?.countOpenIssues ?? 0);
    veiculoDetailParts.push(`${total} ocorrência${total > 1 ? "s" : ""} em aberto`);
  }
  if (hasManutVermelho && (maintSummary?.countVermelho ?? 0) > 0) {
    veiculoDetailParts.push(`${maintSummary!.countVermelho} manutenção${maintSummary!.countVermelho > 1 ? "ções" : ""} vencida${maintSummary!.countVermelho > 1 ? "s" : ""}`);
  }
  if (hasManutAmarelo && !hasManutVermelho && (maintSummary?.countAmarelo ?? 0) > 0) {
    veiculoDetailParts.push(`${maintSummary!.countAmarelo} manutenção${maintSummary!.countAmarelo > 1 ? "ções" : ""} próxima${maintSummary!.countAmarelo > 1 ? "s" : ""} do vencimento`);
  }

  const lights: StatusLight[] = [
    { id: "financeiro", label: "Financeiro", status: "verde", icon: DollarSign },
    { id: "producao",   label: "Produção",   status: "verde", icon: Factory    },
    { id: "estoque",    label: "Estoque",    status: "verde", icon: Package    },
    {
      id: "veiculos",
      label: "Veículos",
      status: veiculoStatus,
      detail: veiculoDetailParts.join(" · "),
      icon: Truck,
      href: "/vehicles",
    },
    { id: "equipe", label: "Equipe", status: "verde", icon: Users },
  ];

  const worst = worstStatus(lights);
  const hasAlert = worst !== "verde";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          title="Painel de controle"
          data-testid="button-status-lights"
        >
          <span className="flex items-center justify-center gap-[3px]">
            {lights.map((l) => {
              const cfg = STATUS_CONFIG[l.status];
              return (
                <span
                  key={l.id}
                  className={`w-2 h-2 rounded-full ${cfg.dotClass} ${l.status === "critico" ? "animate-pulse" : ""}`}
                  style={{ boxShadow: cfg.glow }}
                />
              );
            })}
          </span>
          {hasAlert && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div
          className="px-4 pt-3 pb-2 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasAlert ? "bg-red-400 animate-pulse" : "bg-green-400"}`} />
            <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest">
              Painel de Controle
            </span>
          </div>
          {!hasAlert && (
            <span className="text-[10px] text-green-400 font-medium">Tudo normal</span>
          )}
          {hasAlert && (
            <span className="text-[10px] text-red-400 font-medium">Há alertas</span>
          )}
        </div>

        <div
          className="px-4 py-4 grid grid-cols-5 gap-2"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}
        >
          {lights.map((light) => {
            const cfg = STATUS_CONFIG[light.status];
            const Icon = light.icon;
            const inner = (
              <div
                className={`flex flex-col items-center gap-2 ${light.href ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                data-testid={`status-light-${light.id}`}
                title={light.detail}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ring-1 ring-white/10 ${light.status === "critico" ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: cfg.color, boxShadow: cfg.glow }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold text-white leading-tight">{light.label}</p>
                  <p className={`text-[10px] font-medium ${cfg.textClass}`}>{cfg.label}</p>
                  {light.detail && (
                    <p className="text-[9px] text-red-300 leading-tight mt-0.5 max-w-[60px] break-words">{light.detail}</p>
                  )}
                </div>
              </div>
            );
            return light.href ? (
              <Link key={light.id} href={light.href}>{inner}</Link>
            ) : (
              <div key={light.id}>{inner}</div>
            );
          })}
        </div>

        <div
          className="px-4 py-2 border-t border-white/10 flex items-center gap-3 flex-wrap"
          style={{ background: "#0f172a" }}
        >
          {(["verde", "amarelo", "vermelho", "critico"] as LightStatus[]).map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <div key={s} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-[10px] text-gray-500">{c.label}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
