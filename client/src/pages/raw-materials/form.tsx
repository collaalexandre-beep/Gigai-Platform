import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, Save, Loader2, FlaskConical, Ruler } from "lucide-react";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Formulário real — só renderiza quando tem dados (ou para criação)
function RawMaterialForm({ id, initial }: { id?: string; initial?: RawMaterial }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = !!id;

  const form = useForm<InsertRawMaterial>({
    resolver: zodResolver(insertRawMaterialSchema),
    defaultValues: initial
      ? {
          ...initial,
          largura: initial.largura?.toString() || "",
          comprimento: initial.comprimento?.toString() || "",
          custoUnitario: initial.custoUnitario?.toString() || "0",
          perdaPadrao: initial.perdaPadrao?.toString() || "0",
        } as any
      : {
          nome: "",
          categoria: "outros",
          codigoInterno: "",
          descricao: "",
          unidadeCompra: "",
          unidadeUso: "",
          largura: "",
          comprimento: "",
          custoUnitario: "0",
          perdaPadrao: "0",
          fornecedor: "",
          marca: "",
          observacoes: "",
          ativo: true,
        },
  });

  // Cálculos automáticos de área e custo/m²
  const [watchLargura, watchComprimento, watchCusto, watchUnidadeUso] = useWatch({
    control: form.control,
    name: ["largura", "comprimento", "custoUnitario", "unidadeUso"],
  });
  const areaM2 = Number(watchLargura) > 0 && Number(watchComprimento) > 0
    ? Number(watchLargura) * Number(watchComprimento)
    : null;
  const custoM2 = areaM2 && Number(watchCusto) > 0
    ? Number(watchCusto) / areaM2
    : null;
  const mostrarDimensoes = String(watchUnidadeUso || "").toLowerCase().replace("²", "2").includes("m2") ||
    String(watchUnidadeUso || "").toLowerCase() === "m²";

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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/raw-materials">Matérias-primas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isEditing ? (initial?.nome || "Editar") : "Nova Matéria-prima"}</BreadcrumbPage>
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
                          <Input placeholder="PC, KG, M2, UN" {...field} data-testid="input-unidade-compra" />
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
                          <Input placeholder="M2, G, UN" {...field} value={field.value || ""} data-testid="input-unidade-uso" />
                        </FormControl>
                        <FormDescription>Como você usa</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Dimensões físicas — sempre visíveis para calcular área */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Ruler className="w-3.5 h-3.5" />
                    Dimensões físicas (metros)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="largura"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Largura (m)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="Ex: 1.3"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-largura"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="comprimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Comprimento (m)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="Ex: 2.0"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-comprimento"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {areaM2 && (
                    <div className="flex items-center justify-between rounded-md bg-background border px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Área calculada</span>
                      <span className="font-semibold tabular-nums">
                        {areaM2.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²
                      </span>
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="custoUnitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo por Unidade de Compra (R$)</FormLabel>
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
                      {custoM2 && (
                        <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm mt-1">
                          <span className="text-muted-foreground">Custo por m²</span>
                          <span className="font-bold text-primary tabular-nums">
                            {custoM2.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                        </div>
                      )}
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

export default function RawMaterialFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const isEditing = !!id;

  // Tenta achar o item no cache da lista (evita fetch separado e problemas de sessão)
  const fromListCache = (): RawMaterial | undefined => {
    const allListData = queryClient.getQueriesData<{ data: RawMaterial[]; total: number }>({
      queryKey: ["/api/raw-materials"],
    });
    for (const [, qData] of allListData) {
      if (qData?.data) {
        const found = qData.data.find((m) => m.id === id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const { data: rawMaterial } = useQuery<RawMaterial>({
    queryKey: ["/api/raw-materials", id],
    queryFn: async () => {
      const res = await fetch(`/api/raw-materials/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    enabled: isEditing,
    initialData: isEditing ? fromListCache : undefined,
  });

  // Em modo edição: aguarda o dado (do cache ou do fetch)
  if (isEditing && !rawMaterial) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Usa o id como key para forçar re-mount ao trocar de item
  return <RawMaterialForm key={id || "new"} id={id} initial={rawMaterial} />;
}
