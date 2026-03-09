import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Info,
  Save,
  ArrowLeft,
  Search,
  Check,
  Package,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  insertProductSchema,
  insertProductComponentSchema,
  type InsertProduct,
  type Product,
  type RawMaterial,
  type ProductComponent,
} from "@shared/schema";
import { z } from "zod";

const formSchema = insertProductSchema.extend({
  components: z.array(insertProductComponentSchema.omit({ productId: true })),
});

type FormValues = z.infer<typeof formSchema>;

const CALC_TYPES = [
  { value: "m2", label: "M²" },
  { value: "unidade", label: "Unidade" },
  { value: "metro_linear", label: "Metro Linear" },
  { value: "perimetro", label: "Perímetro" },
  { value: "projeto", label: "Projeto" },
  { value: "fixo_variavel", label: "Fixo + Variável" },
];

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  const isEdit = !!id && id !== "new";

  const { data: product, isLoading: loadingProduct } = useQuery<Product>({
    queryKey: ["/api/products", id],
    enabled: isEdit,
  });

  const { data: components = [], isLoading: loadingComponents } = useQuery<ProductComponent[]>({
    queryKey: ["/api/products", id, "components"],
    enabled: isEdit,
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["/api/raw-materials"],
    queryFn: () => fetch("/api/raw-materials?limit=100").then((r) => r.json()).then(res => res.data || []),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      categoria: "",
      descricaoComercial: "",
      descricaoTecnica: "",
      unidadeVenda: "unidade",
      tipoCalculo: "unidade",
      aceitaMedidasVariaveis: false,
      requerInstalacao: false,
      requerArte: false,
      observacoesInternas: "",
      ativo: true,
      components: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "components",
  });

  useEffect(() => {
    if (product && components) {
      form.reset({
        ...product,
        components: components.map(({ productId, ...rest }) => rest),
      });
    }
  }, [product, components, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const { components, ...productData } = data;
      let productId = id;

      if (isEdit) {
        await apiRequest("PATCH", `/api/products/${id}`, productData);
      } else {
        const res = await apiRequest("POST", "/api/products", productData);
        const newProduct = await res.json();
        productId = newProduct.id;
      }

      await apiRequest("PUT", `/api/products/${productId}/components`, { components });
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: `Produto ${isEdit ? "atualizado" : "criado"} com sucesso.` });
      setLocation("/products");
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao salvar produto.", description: err.message, variant: "destructive" }),
  });

  function onSubmit(data: FormValues) {
    saveMutation.mutate(data);
  }

  const filteredMaterials = rawMaterials.filter((m) =>
    m.nome.toLowerCase().includes(materialSearch.toLowerCase()) ||
    m.codigoInterno?.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const isLoading = loadingProduct || loadingComponents;

  if (isEdit && isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          <div className="h-40 bg-muted animate-pulse rounded" />
          <div className="h-40 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-20">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/products" data-testid="link-breadcrumb-products">Produtos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{isEdit ? "Editar Produto" : "Novo Produto"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/products")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {isEdit ? `Editar: ${product?.nome}` : "Novo Produto"}
            </h1>
          </div>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={saveMutation.isPending} data-testid="button-save-product">
            <Save className="w-4 h-4 mr-1.5" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Produto"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Seção 1 - Dados Gerais */}
          <Card className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Dados Gerais
              </CardTitle>
              <CardDescription>Informações básicas do produto no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Banner 440g com acabamento" {...field} data-testid="input-product-nome" />
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
                      <FormLabel>Categoria <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Comunicação Visual" {...field} data-testid="input-product-categoria" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unidadeVenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade de Venda <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: m2, unidade, par" {...field} data-testid="input-product-unidade" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipoCalculo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cálculo <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-product-calctype">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CALC_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricaoComercial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Comercial</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição que aparece no orçamento para o cliente"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-product-descricao-comercial"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricaoTecnica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Técnica / Interna</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes técnicos para produção"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-product-descricao-tecnica"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Seção 2 - Características */}
          <Card className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Características e Regras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="aceitaMedidasVariaveis"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-product-medidas"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Medidas Variáveis</FormLabel>
                        <p className="text-xs text-muted-foreground">Permite digitar LxH no orçamento</p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requerInstalacao"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-product-instalacao"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requer Instalação</FormLabel>
                        <p className="text-xs text-muted-foreground">Sinaliza necessidade de equipe externa</p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requerArte"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-product-arte"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requer Arte</FormLabel>
                        <p className="text-xs text-muted-foreground">Sinaliza necessidade de designer</p>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-product-ativo"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Produto Ativo</FormLabel>
                        <p className="text-xs text-muted-foreground">Disponível para novos orçamentos</p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacoesInternas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anotações para equipe comercial"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-product-observacoes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Seção 3 - Composição (Componentes) */}
          <Card className="hover-elevate overflow-visible">
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Box className="w-5 h-5 text-primary" />
                  Composição do Produto
                </CardTitle>
                <CardDescription>Matérias-primas e serviços necessários para este produto.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComponentDialogOpen(true)}
                data-testid="button-add-component"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Componente
              </Button>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="py-12 border-2 border-dashed rounded-lg text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground">Nenhum componente adicionado à composição.</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setComponentDialogOpen(true)}
                    className="mt-1"
                  >
                    Adicionar o primeiro componente
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const material = rawMaterials.find(m => m.id === field.rawMaterialId);
                    return (
                      <div
                        key={field.id}
                        className="group flex items-start gap-4 p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors"
                        data-testid={`component-item-${index}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {material?.nome || "Materia-prima não encontrada"}
                            </span>
                            {field.opcional && <Badge variant="secondary" className="text-[10px] h-4">Opcional</Badge>}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                            <span>Tipo: <span className="font-medium text-foreground">{field.tipoConsumo}</span></span>
                            <span>Qtd Base: <span className="font-medium text-foreground">{field.quantidadeBase}</span></span>
                            {Number(field.perdaAdicional) > 0 && (
                              <span>Perda: <span className="font-medium text-destructive">{field.perdaAdicional}%</span></span>
                            )}
                          </div>
                          {field.formula && (
                            <p className="text-[11px] font-mono mt-1 text-primary bg-primary/5 inline-block px-1.5 rounded">
                              Formula: {field.formula}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-component-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Component Dialog */}
      <Dialog open={componentDialogOpen} onOpenChange={setComponentDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Componente</DialogTitle>
            <DialogDescription>Selecione a matéria-prima e defina as regras de consumo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Matéria-prima <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar matéria-prima..."
                  className="pl-9"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  data-testid="input-search-material"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-md mt-2 divide-y">
                {filteredMaterials.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between group"
                    onClick={() => {
                      append({
                        rawMaterialId: m.id,
                        tipoConsumo: "m2",
                        formula: "",
                        quantidadeBase: "1",
                        perdaAdicional: "0",
                        opcional: false,
                        observacaoTecnica: "",
                        ordem: fields.length,
                      });
                      setComponentDialogOpen(false);
                      setMaterialSearch("");
                    }}
                    data-testid={`material-option-${m.id}`}
                  >
                    <div>
                      <span className="font-medium">{m.nome}</span>
                      <p className="text-xs text-muted-foreground">{m.categoria} • {m.unidadeCompra}</p>
                    </div>
                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </button>
                ))}
                {filteredMaterials.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma matéria-prima encontrada.</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComponentDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Box(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
