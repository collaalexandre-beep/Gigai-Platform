import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, Save, Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insertRawMaterialSchema, type RawMaterial, type InsertRawMaterial } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function RawMaterialFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  const { data: rawMaterial, isLoading: isLoadingData } = useQuery<RawMaterial>({
    queryKey: [`/api/raw-materials/${id}`],
    enabled: isEditing,
  });

  const form = useForm<InsertRawMaterial>({
    resolver: zodResolver(insertRawMaterialSchema),
    defaultValues: {
      nome: "",
      categoria: "outros",
      codigoInterno: "",
      descricao: "",
      unidadeCompra: "",
      unidadeUso: "",
      custoUnitario: "0",
      perdaPadrao: "0",
      fornecedor: "",
      marca: "",
      observacoes: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (rawMaterial) {
      form.reset({
        ...rawMaterial,
        custoUnitario: rawMaterial.custoUnitario?.toString() || "0",
        perdaPadrao: rawMaterial.perdaPadrao?.toString() || "0",
      } as any);
    }
  }, [rawMaterial, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertRawMaterial) => {
      const formattedData = {
        ...data,
        custoUnitario: data.custoUnitario?.toString(),
        perdaPadrao: data.perdaPadrao?.toString(),
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/raw-materials/${id}`, formattedData).then((r) => r.json());
      } else {
        return apiRequest("POST", "/api/raw-materials", formattedData).then((r) => r.json());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] });
      toast({
        title: isEditing ? "Matéria-prima atualizada" : "Matéria-prima cadastrada",
        description: "Os dados foram salvos com sucesso.",
      });
      setLocation("/raw-materials");
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: InsertRawMaterial) {
    mutation.mutate(data);
  }

  if (isEditing && isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/raw-materials">Matérias-primas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isEditing ? (rawMaterial?.nome || "Editar") : "Nova Matéria-prima"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setLocation("/raw-materials")} data-testid="button-back">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Editar Matéria-prima" : "Nova Matéria-prima"}
          </h1>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending} data-testid="button-save">
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-primary" />
                  Dados Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nome da Matéria-prima *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Chapa de PS 2mm" {...field} data-testid="input-nome" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-categoria">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="chapas">Chapas</SelectItem>
                          <SelectItem value="impressao">Impressão</SelectItem>
                          <SelectItem value="estruturas">Estruturas</SelectItem>
                          <SelectItem value="iluminacao">Iluminação</SelectItem>
                          <SelectItem value="fixacao">Fixação</SelectItem>
                          <SelectItem value="adesivos">Adesivos</SelectItem>
                          <SelectItem value="tintas">Tintas</SelectItem>
                          <SelectItem value="acabamento">Acabamento</SelectItem>
                          <SelectItem value="instalacao">Instalação</SelectItem>
                          <SelectItem value="servicos_terceirizados">Serviços Terceirizados</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codigoInterno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Interno / SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: MAT-001" {...field} value={field.value || ""} data-testid="input-codigo-interno" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Descrição Técnica</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalhes técnicos, dimensões, etc."
                          className="resize-none h-20"
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-descricao"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Unidades e Custos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unidadeCompra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Un. de Compra *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: M2, KG, UN" {...field} data-testid="input-unidade-compra" />
                        </FormControl>
                        <FormDescription>Como você compra</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unidadeUso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Un. de Uso</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: M2, G, UN" {...field} value={field.value || ""} data-testid="input-unidade-uso" />
                        </FormControl>
                        <FormDescription>Como você usa</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="custoUnitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo Unitário (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0,0000"
                          {...field}
                          value={field.value || "0"}
                          data-testid="input-custo-unitario"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="perdaPadrao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perda Padrão (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          value={field.value || "0"}
                          data-testid="input-perda-padrao"
                        />
                      </FormControl>
                      <FormDescription>Margem de desperdício comum</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações de Mercado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="fornecedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor Preferencial</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do fornecedor" {...field} value={field.value || ""} data-testid="input-fornecedor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="marca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca / Fabricante</FormLabel>
                      <FormControl>
                        <Input placeholder="Marca do produto" {...field} value={field.value || ""} data-testid="input-marca" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Status Ativo</FormLabel>
                        <FormDescription>Define se pode ser usado em produtos</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-ativo"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Observações Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Notas sobre armazenamento, manuseio ou negociação."
                          className="resize-none h-24"
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-observacoes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
