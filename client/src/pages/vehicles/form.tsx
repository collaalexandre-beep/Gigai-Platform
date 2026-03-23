import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertVehicleSchema } from "@shared/schema";
import type { Vehicle, InsertVehicle } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";

const formSchema = insertVehicleSchema.extend({
  placa: z.string().min(6, "Placa inválida"),
  modelo: z.string().min(1, "Modelo obrigatório"),
  marca: z.string().min(1, "Marca obrigatória"),
});

export default function VehicleFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  const { data: vehicle, isLoading: loadingVehicle } = useQuery<Vehicle>({
    queryKey: ["/api/vehicles", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/vehicles/${id}`);
      return res.json();
    },
    enabled: isEditing,
  });

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      placa: "",
      modelo: "",
      marca: "",
      ano: undefined,
      cor: "",
      tipoCombustivel: undefined,
      kmAtual: undefined,
      consumoMedioKmL: undefined,
      status: "ativo",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (vehicle) {
      form.reset({
        placa: vehicle.placa,
        modelo: vehicle.modelo,
        marca: vehicle.marca,
        ano: vehicle.ano ?? undefined,
        cor: vehicle.cor ?? "",
        tipoCombustivel: vehicle.tipoCombustivel ?? undefined,
        kmAtual: vehicle.kmAtual ?? undefined,
        consumoMedioKmL: vehicle.consumoMedioKmL ?? undefined,
        status: vehicle.status,
        observacoes: vehicle.observacoes ?? "",
      });
    }
  }, [vehicle]);

  const saveMut = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      const res = isEditing
        ? await apiRequest("PATCH", `/api/vehicles/${id}`, data)
        : await apiRequest("POST", "/api/vehicles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: isEditing ? "Veículo atualizado" : "Veículo cadastrado com sucesso" });
      navigate("/vehicles");
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err?.message ?? "Tente novamente", variant: "destructive" });
    },
  });

  if (isEditing && loadingVehicle) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/vehicles"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? "Editar Veículo" : "Novo Veículo"}</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do veículo</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => saveMut.mutate(d))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="placa" render={({ field }) => (
                <FormItem>
                  <FormLabel>Placa *</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC-1234" className="font-mono uppercase" data-testid="input-placa" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="manutencao">Em manutenção</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="marca" render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca *</FormLabel>
                  <FormControl><Input placeholder="Ex: Fiat" data-testid="input-marca" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="modelo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo *</FormLabel>
                  <FormControl><Input placeholder="Ex: Strada" data-testid="input-modelo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ano" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="2023" data-testid="input-ano" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl><Input placeholder="Ex: Branco" data-testid="input-cor" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Combustível e KM</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="tipoCombustivel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Combustível</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-combustivel"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                      <SelectItem value="etanol">Etanol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="flex">Flex</SelectItem>
                      <SelectItem value="gnv">GNV</SelectItem>
                      <SelectItem value="eletrico">Elétrico</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="kmAtual" render={({ field }) => (
                <FormItem>
                  <FormLabel>KM atual</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="0" data-testid="input-km-atual" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="consumoMedioKmL" render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo médio (km/l)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="0" data-testid="input-consumo" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent>
              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Anotações sobre o veículo..." rows={3} data-testid="textarea-observacoes" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href="/vehicles">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saveMut.isPending} data-testid="button-save-vehicle">
              <Save className="w-4 h-4 mr-2" />
              {saveMut.isPending ? "Salvando..." : "Salvar Veículo"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
