import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { VehicleExit, Vehicle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Car, User, MapPin, Clock, CheckCircle2, Fuel, Navigation,
  ArrowDownToLine, XCircle, AlertCircle, Camera, Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

type ExitWithRelations = VehicleExit & {
  vehicle: Vehicle;
  driver: { id: string; nomeCompleto: string };
};

const returnSchema = z.object({
  dataHoraRetorno: z.string().min(1, "Informe a data/hora de retorno"),
  kmFinal: z.string().min(1, "KM final obrigatório"),
  combustivelFinal: z.enum(["vazio", "quarto", "metade", "tres_quartos", "cheio"]),
  fotoFinalUrl: z.string().optional(),
  observacoesRetorno: z.string().optional(),
});

type ReturnData = z.infer<typeof returnSchema>;

const FUEL_LEVEL_LABELS: Record<string, string> = {
  vazio: "Vazio",
  quarto: "1/4",
  metade: "1/2",
  tres_quartos: "3/4",
  cheio: "Cheio",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  em_rota: { label: "Em rota", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Car },
  finalizada: { label: "Finalizada", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: XCircle },
};

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}

export default function VehicleExitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showReturnForm, setShowReturnForm] = useState(false);

  const { data: exit, isLoading } = useQuery<ExitWithRelations>({
    queryKey: ["/api/vehicle-exits", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/vehicle-exits/${id}`);
      return res.json();
    },
  });

  const now = new Date();
  const localDatetime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const returnForm = useForm<ReturnData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      dataHoraRetorno: localDatetime,
      kmFinal: "",
      combustivelFinal: "metade",
      fotoFinalUrl: "",
      observacoesRetorno: "",
    },
  });

  const returnMut = useMutation({
    mutationFn: async (data: ReturnData) => {
      const payload = {
        ...data,
        dataHoraRetorno: new Date(data.dataHoraRetorno).toISOString(),
        kmInicial: exit?.kmInicial,
        status: "finalizada",
      };
      const res = await apiRequest("PATCH", `/api/vehicle-exits/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-exits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: "Retorno registrado com sucesso" });
      navigate("/vehicles/exits");
    },
    onError: () => toast({ title: "Erro ao registrar retorno", variant: "destructive" }),
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/vehicle-exits/${id}`, { status: "cancelada" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-exits"] });
      toast({ title: "Saída cancelada" });
      navigate("/vehicles/exits");
    },
    onError: () => toast({ title: "Erro ao cancelar", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!exit) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Saída não encontrada</p>
        <Button className="mt-4" asChild><Link href="/vehicles/exits">Voltar</Link></Button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[exit.status];
  const StatusIcon = cfg.icon;
  const isOpen = exit.status === "em_rota";
  const kmPercorridos = exit.kmFinal && exit.kmInicial
    ? Number(exit.kmPercorridos ?? (Number(exit.kmFinal) - Number(exit.kmInicial))).toFixed(1)
    : null;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/vehicles/exits"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Saída de Veículo</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
              <StatusIcon className="inline w-3 h-3 mr-1" />
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Registrado em {fmt(exit.createdAt)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4" />
            Veículo
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <InfoRow label="Placa" value={exit.vehicle.placa} />
          <InfoRow label="Modelo" value={`${exit.vehicle.marca} ${exit.vehicle.modelo}`} />
          {exit.vehicle.ano && <InfoRow label="Ano" value={String(exit.vehicle.ano)} />}
          {exit.vehicle.cor && <InfoRow label="Cor" value={exit.vehicle.cor} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Motorista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{exit.driver.nomeCompleto}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Dados da Saída
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <InfoRow label="Saída" value={fmt(exit.dataHoraSaida)} />
          <InfoRow label="KM na saída" value={exit.kmInicial ? `${Number(exit.kmInicial).toLocaleString("pt-BR")} km` : undefined} />
          <InfoRow label="Combustível na saída" value={exit.combustivelInicial ? FUEL_LEVEL_LABELS[exit.combustivelInicial] : undefined} />
          {exit.destino && <InfoRow label="Destino" value={exit.destino} />}
          {exit.motivoSaida && (
            <div className="col-span-2">
              <InfoRow label="Motivo" value={exit.motivoSaida} />
            </div>
          )}
          {exit.orderId && <InfoRow label="OS vinculada" value={exit.orderId} />}
        </CardContent>
      </Card>

      {/* Fotos */}
      {(exit.fotoInicialUrl || exit.fotoFinalUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Fotos do Painel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {exit.fotoInicialUrl ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">📸 Saída</p>
                  <a href={exit.fotoInicialUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={exit.fotoInicialUrl}
                      alt="Foto do painel na saída"
                      className="w-full rounded-lg border object-cover max-h-56 hover:opacity-90 transition-opacity cursor-pointer"
                      data-testid="img-foto-inicial"
                    />
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 bg-muted/30 rounded-lg border border-dashed">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40 mb-1" />
                  <p className="text-xs text-muted-foreground">Sem foto de saída</p>
                </div>
              )}
              {exit.fotoFinalUrl ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">📸 Retorno</p>
                  <a href={exit.fotoFinalUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={exit.fotoFinalUrl}
                      alt="Foto do painel no retorno"
                      className="w-full rounded-lg border object-cover max-h-56 hover:opacity-90 transition-opacity cursor-pointer"
                      data-testid="img-foto-final"
                    />
                  </a>
                </div>
              ) : exit.dataHoraRetorno ? (
                <div className="flex flex-col items-center justify-center h-32 bg-muted/30 rounded-lg border border-dashed">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40 mb-1" />
                  <p className="text-xs text-muted-foreground">Sem foto de retorno</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {exit.dataHoraRetorno && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Retorno
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow label="Retorno" value={fmt(exit.dataHoraRetorno)} />
            <InfoRow label="KM no retorno" value={exit.kmFinal ? `${Number(exit.kmFinal).toLocaleString("pt-BR")} km` : undefined} />
            <InfoRow label="Combustível no retorno" value={exit.combustivelFinal ? FUEL_LEVEL_LABELS[exit.combustivelFinal] : undefined} />
            {kmPercorridos && (
              <InfoRow label="KM percorridos" value={`${Number(kmPercorridos).toLocaleString("pt-BR")} km`} />
            )}
            {exit.observacoesRetorno && (
              <div className="col-span-2">
                <InfoRow label="Observações do retorno" value={exit.observacoesRetorno} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isOpen && !showReturnForm && (
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => setShowReturnForm(true)} data-testid="button-register-return">
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Registrar Retorno
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => cancelMut.mutate()}
            disabled={cancelMut.isPending}
            data-testid="button-cancel-exit"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancelar Saída
          </Button>
        </div>
      )}

      {isOpen && showReturnForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4" />
              Registrar Retorno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...returnForm}>
              <form onSubmit={returnForm.handleSubmit((d) => returnMut.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={returnForm.control} name="dataHoraRetorno" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Data e hora do retorno *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" data-testid="input-retorno-datetime" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={returnForm.control} name="kmFinal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>KM final *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="0" data-testid="input-km-final" {...field} />
                      </FormControl>
                      {exit.kmInicial && field.value && (
                        <p className="text-xs text-muted-foreground">
                          KM percorridos: {(Number(field.value) - Number(exit.kmInicial)).toLocaleString("pt-BR")} km
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={returnForm.control} name="combustivelFinal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Combustível no retorno *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-fuel-final"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(FUEL_LEVEL_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={returnForm.control} name="observacoesRetorno" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Incidentes, problemas, observações gerais..."
                          rows={3}
                          data-testid="textarea-obs-retorno"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowReturnForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={returnMut.isPending} data-testid="button-confirm-return">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {returnMut.isPending ? "Salvando..." : "Confirmar Retorno"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
