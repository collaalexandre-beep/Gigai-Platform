import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Car, Fuel, Settings, AlertTriangle, CheckCircle2, Eye, Wrench } from "lucide-react";
import type { Vehicle } from "@shared/schema";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface VehicleDashboard extends Vehicle {
  manutencaoStatus: "verde" | "amarelo" | "vermelho";
  hasOcorrencia: boolean;
  countItens: number;
  countVermelho: number;
  countAmarelo: number;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  manutencao: { label: "Manutenção", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  inativo: { label: "Inativo", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

const FUEL_LABELS: Record<string, string> = {
  gasolina: "Gasolina", etanol: "Etanol", diesel: "Diesel",
  flex: "Flex", gnv: "GNV", eletrico: "Elétrico", hibrido: "Híbrido",
};

const MANUT_STATUS = {
  verde:    { dot: "bg-green-500 shadow-green-300",   label: "OK" },
  amarelo:  { dot: "bg-yellow-400 shadow-yellow-200", label: "Manutenção próxima" },
  vermelho: { dot: "bg-red-500 shadow-red-300",       label: "Manutenção vencida" },
};

// ─── Componente ──────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  // Usa o endpoint de dashboard para obter status de manutenção por veículo
  const { data: allVehicles = [], isLoading } = useQuery<VehicleDashboard[]>({
    queryKey: ["/api/vehicles/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vehicles/dashboard");
      const data = await res.json();
      // O endpoint retorna { total, veiculos: [...] } — extraímos o array
      return Array.isArray(data) ? data : (data.veiculos ?? []);
    },
    refetchInterval: 60000,
  });

  // Filtro client-side (busca e status)
  const vehicles = allVehicles.filter((v) => {
    if (statusFilter !== "todos" && v.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        v.marca.toLowerCase().includes(s) ||
        v.modelo.toLowerCase().includes(s) ||
        v.placa.toLowerCase().includes(s) ||
        (v.numeroInterno ?? "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const resolverMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/vehicles/${id}/resolver-ocorrencia`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles/dashboard"] });
      toast({ title: "Ocorrência resolvida", description: "O sinal voltou para verde." });
    },
    onError: () => toast({ title: "Erro ao resolver ocorrência", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Veículos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Frota da empresa — cadastro e rastreabilidade</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/vehicles/exits" data-testid="link-exits">
              <Car className="w-4 h-4 mr-2" />
              Saídas
            </Link>
          </Button>
          <Button asChild>
            <Link href="/vehicles/new" data-testid="link-new-vehicle">
              <Plus className="w-4 h-4 mr-2" />
              Novo veículo
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por marca, modelo, placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-vehicle"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="select-vehicle-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="manutencao">Em manutenção</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Car className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Nenhum veículo encontrado</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Cadastre o primeiro veículo da frota</p>
          <Button className="mt-4" asChild>
            <Link href="/vehicles/new">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar veículo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const statusInfo = STATUS_LABELS[v.status] ?? STATUS_LABELS.ativo;
            const temOcorrencia = v.hasOcorrencia;
            const manutStatus = v.manutencaoStatus ?? "verde";
            const manutInfo = MANUT_STATUS[manutStatus];

            // Cor da borda do card: vermelho se tem ocorrência, amarelo se manutenção próxima/vencida
            const borderCls = temOcorrencia
              ? "border-red-400 dark:border-red-600 shadow-red-100 dark:shadow-red-950/20"
              : manutStatus === "vermelho"
              ? "border-red-300 dark:border-red-700"
              : manutStatus === "amarelo"
              ? "border-yellow-300 dark:border-yellow-700"
              : "";

            return (
              <Card
                key={v.id}
                className={`hover:shadow-md transition-shadow ${borderCls}`}
                data-testid={`card-vehicle-${v.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Dot composto: vermelho se ocorrência, senão reflete manutenção */}
                      <span
                        className={`flex-shrink-0 w-3 h-3 rounded-full shadow-sm ${
                          temOcorrencia ? "bg-red-500 shadow-red-300" : manutInfo.dot
                        }`}
                        title={
                          temOcorrencia
                            ? "Ocorrência em aberto"
                            : manutStatus === "verde"
                            ? "Sem alertas"
                            : manutInfo.label
                        }
                        data-testid={`status-light-${v.id}`}
                      />
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold truncate">{v.marca} {v.modelo}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.ano} · {v.cor}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Banner de ocorrência aberta */}
                  {temOcorrencia && (
                    <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-xs text-red-700 dark:text-red-400 font-medium flex-1">Ocorrência em aberto</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                        onClick={() => resolverMut.mutate(v.id)}
                        disabled={resolverMut.isPending}
                        data-testid={`button-resolver-ocorrencia-${v.id}`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Resolver
                      </Button>
                    </div>
                  )}

                  {/* Banner de manutenção vencida */}
                  {!temOcorrencia && manutStatus === "vermelho" && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                      <Wrench className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                        {v.countVermelho} item(s) de manutenção vencido(s)
                      </span>
                    </div>
                  )}

                  {/* Banner de manutenção próxima */}
                  {!temOcorrencia && manutStatus === "amarelo" && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1.5 bg-yellow-50 dark:bg-yellow-950/30 rounded-md border border-yellow-200 dark:border-yellow-800">
                      <Wrench className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                      <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                        {v.countAmarelo} item(s) de manutenção próximo(s)
                      </span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {v.placa}
                    </span>
                    {v.tipoCombustivel && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Fuel className="w-3.5 h-3.5" />
                        {FUEL_LABELS[v.tipoCombustivel] ?? v.tipoCombustivel}
                      </span>
                    )}
                  </div>

                  {v.kmAtual && (
                    <p className="text-sm text-muted-foreground">
                      KM atual: <span className="font-medium text-foreground">{Number(v.kmAtual).toLocaleString("pt-BR")} km</span>
                    </p>
                  )}
                  {v.consumoMedioKmL && (
                    <p className="text-sm text-muted-foreground">
                      Consumo: <span className="font-medium text-foreground">{v.consumoMedioKmL} km/l</span>
                    </p>
                  )}

                  {/* Resumo de itens de manutenção */}
                  {v.countItens > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      {v.countItens} item(s) no plano
                      {v.countVermelho > 0 && (
                        <span className="ml-1 text-red-600 dark:text-red-400 font-medium">· {v.countVermelho} vencido(s)</span>
                      )}
                      {v.countAmarelo > 0 && v.countVermelho === 0 && (
                        <span className="ml-1 text-yellow-600 dark:text-yellow-400 font-medium">· {v.countAmarelo} próximo(s)</span>
                      )}
                    </p>
                  )}

                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <Link href={`/vehicles/${v.id}`} data-testid={`button-view-vehicle-${v.id}`}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild className="px-2">
                      <Link href={`/vehicles/${v.id}/edit`} data-testid={`button-edit-vehicle-${v.id}`}>
                        <Settings className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                    {v.status !== "inativo" && (
                      <Button size="sm" variant="default" className="flex-1" asChild>
                        <Link href={`/vehicles/exits/new?vehicleId=${v.id}`} data-testid={`button-exit-vehicle-${v.id}`}>
                          <Car className="w-3.5 h-3.5 mr-1" />
                          Saída
                        </Link>
                      </Button>
                    )}
                    {v.status === "inativo" && (
                      <div className="flex-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Inativo
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
