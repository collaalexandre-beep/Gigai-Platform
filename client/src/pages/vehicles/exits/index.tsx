import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Car, User, MapPin, Clock, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import type { VehicleExit, Vehicle } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ExitWithRelations = VehicleExit & {
  vehicle: Vehicle;
  driver: { id: string; nomeCompleto: string };
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  em_rota: {
    label: "Em rota",
    icon: Car,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  finalizada: {
    label: "Finalizada",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelada: {
    label: "Cancelada",
    icon: XCircle,
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export default function VehicleExitsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const { data: exits = [], isLoading } = useQuery<ExitWithRelations[]>({
    queryKey: ["/api/vehicle-exits", { status: statusFilter !== "todos" ? statusFilter : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "todos") params.set("status", statusFilter);
      const res = await apiRequest("GET", `/api/vehicle-exits?${params}`);
      return res.json();
    },
  });

  const filtered = exits.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.vehicle.placa.toLowerCase().includes(s) ||
      e.vehicle.modelo.toLowerCase().includes(s) ||
      e.driver.nomeCompleto.toLowerCase().includes(s) ||
      (e.destino ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vehicles"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saídas de Veículos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Histórico e controle de uso da frota</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/vehicles/exits/new" data-testid="button-new-exit">
            <Plus className="w-4 h-4 mr-2" />
            Registrar Saída
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Em rota", status: "em_rota", color: "text-blue-600" },
          { label: "Finalizadas", status: "finalizada", color: "text-green-600" },
          { label: "Canceladas", status: "cancelada", color: "text-gray-500" },
        ].map(({ label, status, color }) => {
          const count = exits.filter((e) => e.status === status).length;
          return (
            <Card key={status} className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === status ? "todos" : status)}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Placa, motorista ou destino..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-exits"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="em_rota">Em rota</SelectItem>
            <SelectItem value="finalizada">Finalizadas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Car className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Nenhuma saída encontrada</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Registre a primeira saída de veículo</p>
          <Button className="mt-4" asChild>
            <Link href="/vehicles/exits/new">
              <Plus className="w-4 h-4 mr-2" />
              Registrar saída
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exit) => {
            const cfg = STATUS_CONFIG[exit.status] ?? STATUS_CONFIG.em_rota;
            const StatusIcon = cfg.icon;
            const isOpen = exit.status === "em_rota";
            return (
              <Link key={exit.id} href={`/vehicles/exits/${exit.id}`}>
                <Card
                  className={`cursor-pointer hover:shadow-md transition-shadow ${isOpen ? "border-blue-200 dark:border-blue-800" : ""}`}
                  data-testid={`card-exit-${exit.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${isOpen ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted"}`}>
                          <StatusIcon className={`w-4 h-4 ${isOpen ? "text-blue-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {exit.vehicle.placa}
                            </span>
                            <span className="font-medium text-sm truncate">
                              {exit.vehicle.marca} {exit.vehicle.modelo}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {exit.driver.nomeCompleto}
                            </span>
                            {exit.destino && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3" />
                                {exit.destino}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground justify-end">
                          <Clock className="w-3 h-3" />
                          {formatDate(exit.dataHoraSaida)}
                        </div>
                        {exit.kmPercorridos && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {Number(exit.kmPercorridos).toLocaleString("pt-BR")} km rodados
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
