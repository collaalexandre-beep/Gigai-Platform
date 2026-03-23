import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Car, Fuel, Settings, AlertTriangle } from "lucide-react";
import type { Vehicle } from "@shared/schema";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  manutencao: { label: "Manutenção", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  inativo: { label: "Inativo", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

const FUEL_LABELS: Record<string, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  diesel: "Diesel",
  flex: "Flex",
  gnv: "GNV",
  eletrico: "Elétrico",
  hibrido: "Híbrido",
};

export default function VehiclesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles", { search, status: statusFilter !== "todos" ? statusFilter : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "todos") params.set("status", statusFilter);
      const res = await apiRequest("GET", `/api/vehicles?${params}`);
      return res.json();
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Status atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
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
            <Link href="/vehicles/exits">
              <Car className="w-4 h-4 mr-2" />
              Saídas
            </Link>
          </Button>
          <Button asChild>
            <Link href="/vehicles/new" data-testid="button-new-vehicle">
              <Plus className="w-4 h-4 mr-2" />
              Novo Veículo
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Placa, modelo ou marca..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-vehicles"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
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
            return (
              <Card key={v.id} className="hover:shadow-md transition-shadow" data-testid={`card-vehicle-${v.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-semibold">{v.marca} {v.modelo}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{v.ano} · {v.cor}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
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

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <Link href={`/vehicles/${v.id}/edit`} data-testid={`button-edit-vehicle-${v.id}`}>
                        <Settings className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Link>
                    </Button>
                    {v.status !== "inativo" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        asChild
                      >
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
