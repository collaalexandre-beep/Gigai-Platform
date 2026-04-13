import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import type { Vehicle, Seller } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, AlertTriangle, Car } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";

const formSchema = z.object({
  vehicleId: z.string().min(1, "Selecione o veículo"),
  driverId: z.string().min(1, "Selecione o motorista"),
  dataHoraSaida: z.string().min(1, "Informe a data/hora"),
  kmInicial: z.string().min(1, "KM inicial obrigatório"),
  combustivelInicial: z.enum(["vazio", "quarto", "metade", "tres_quartos", "cheio"]),
  fotoInicialUrl: z.string().optional(),
  motivoSaida: z.string().min(1, "Informe o motivo da saída"),
  destino: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const FUEL_LEVEL_LABELS = {
  vazio: "Vazio",
  quarto: "1/4",
  metade: "1/2",
  tres_quartos: "3/4",
  cheio: "Cheio",
};

export default function VehicleExitFormPage() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const preselectedVehicleId = params.get("vehicleId") ?? "";
  const { toast } = useToast();

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vehicles?status=ativo");
      return res.json();
    },
  });

  const { data: drivers = [] } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sellers?status=ativo&limit=100");
      return res.json().then((d: any) => d.data ?? []);
    },
  });

  const now = new Date();
  const localDatetime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: preselectedVehicleId,
      driverId: "",
      dataHoraSaida: localDatetime,
      kmInicial: "",
      combustivelInicial: "metade",
      fotoInicialUrl: "",
      motivoSaida: "",
      destino: "",
    },
  });

  const selectedVehicleId = form.watch("vehicleId");
  const selectedDriverId = form.watch("driverId");
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  useEffect(() => {
    if (selectedVehicle?.kmAtual) {
      form.setValue("kmInicial", String(selectedVehicle.kmAtual));
    }
  }, [selectedVehicle]);

  const createMut = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        dataHoraSaida: new Date(data.dataHoraSaida).toISOString(),
        fotoInicialUrl: data.fotoInicialUrl || undefined,
      };
      const res = await apiRequest("POST", "/api/vehicle-exits", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (data._aviso) {
        toast({ title: "Saída registrada com aviso", description: data._aviso, variant: "destructive" });
      } else {
        toast({ title: "Saída registrada com sucesso" });
      }
      navigate("/vehicles/exits");
    },
    onError: async (err: any) => {
      try {
        const body = await err?.response?.json?.();
        toast({ title: "Erro ao registrar", description: body?.message ?? "Tente novamente", variant: "destructive" });
      } catch {
        toast({ title: "Erro ao registrar saída", variant: "destructive" });
      }
    },
  });

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/vehicles/exits"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registrar Saída</h1>
          <p className="text-sm text-muted-foreground">Nova saída de veículo da empresa</p>
        </div>
      </div>

      {selectedDriver && !selectedDriver.autorizadoDirigir && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Atenção: <strong>{selectedDriver.nomeCompleto}</strong> não está marcado como motorista autorizado no cadastro.
            A saída pode ser registrada, mas verifique a habilitação.
          </AlertDescription>
        </Alert>
      )}

      {selectedVehicle?.status === "manutencao" && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Este veículo está em manutenção. Confirme antes de registrar a saída.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => createMut.mutate(d))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Veículo e Motorista</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-vehicle"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} — {v.marca} {v.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="driverId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Motorista *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-driver"><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nomeCompleto}
                          {!d.autorizadoDirigir && " ⚠"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Saída</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="dataHoraSaida" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Data e hora da saída *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" data-testid="input-saida-datetime" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="kmInicial" render={({ field }) => (
                <FormItem>
                  <FormLabel>KM inicial *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="0" data-testid="input-km-inicial" {...field} />
                  </FormControl>
                  {selectedVehicle?.kmAtual && (
                    <FormDescription>Odômetro atual do veículo: {Number(selectedVehicle.kmAtual).toLocaleString("pt-BR")} km</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="combustivelInicial" render={({ field }) => (
                <FormItem>
                  <FormLabel>Combustível inicial *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-fuel-level"><SelectValue /></SelectTrigger>
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
              <FormField control={form.control} name="destino" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Destino / Rota</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Cliente ABC — Av. Paulista" data-testid="input-destino" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Motivo da saída</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="motivoSaida" render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da saída <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Entrega de banner para cliente, visita comercial, coleta de material..."
                      rows={3}
                      data-testid="textarea-motivo"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href="/vehicles/exits">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={createMut.isPending} data-testid="button-save-exit">
              <Car className="w-4 h-4 mr-2" />
              {createMut.isPending ? "Registrando..." : "Registrar Saída"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
