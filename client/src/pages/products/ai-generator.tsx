import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Sparkles,
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  Info,
  Box,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { AiProductGeneration, RawMaterial } from "@shared/schema";

interface SuggestedComponent {
  rawMaterialId?: string | null;
  nomeSugerido: string;
  tipoConsumo: string;
  quantidadeBase: string;
  perdaAdicional: string;
  observacaoTecnica?: string;
}

interface ProductSuggestion {
  id?: string;
  nome: string;
  categoria: string;
  descricaoComercial: string;
  descricaoTecnica: string;
  unidadeVenda: string;
  tipoCalculo: string;
  componentes: SuggestedComponent[];
  duvidas: string[];
  confianca: number;
}

export default function AiGeneratorPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState<ProductSuggestion | null>(null);

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ["/api/raw-materials"],
    queryFn: () => fetch("/api/raw-materials?limit=1000").then((r) => r.json()).then(res => res.data || []),
  });

  const { data: history = [] } = useQuery<AiProductGeneration[]>({
    queryKey: ["/api/ai-generations"],
  });

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/ai/generate-product", { prompt });
      return res.json();
    },
    onSuccess: (data: ProductSuggestion) => {
      setSuggestion(data);
      toast({ title: "Sugestão gerada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-generations"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao gerar sugestão",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProductSuggestion) => {
      const productRes = await apiRequest("POST", "/api/products", {
        nome: data.nome,
        categoria: data.categoria,
        descricaoComercial: data.descricaoComercial,
        descricaoTecnica: data.descricaoTecnica,
        unidadeVenda: data.unidadeVenda,
        tipoCalculo: data.tipoCalculo,
        ativo: true,
      });
      const product = await productRes.json();

      await apiRequest("PUT", `/api/products/${product.id}/components`, {
        components: data.componentes.map(c => ({
          rawMaterialId: c.rawMaterialId,
          tipoConsumo: c.tipoConsumo,
          quantidadeBase: c.quantidadeBase,
          perdaAdicional: c.perdaAdicional,
          formula: "",
          opcional: false,
          observacaoTecnica: c.observacaoTecnica,
        }))
      });

      return product.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produto salvo com sucesso!" });
      setLocation("/products");
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao salvar produto",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateSuggestion = (field: keyof ProductSuggestion, value: any) => {
    if (!suggestion) return;
    setSuggestion({ ...suggestion, [field]: value });
  };

  const handleUpdateComponent = (index: number, field: keyof SuggestedComponent, value: any) => {
    if (!suggestion) return;
    const newComponentes = [...suggestion.componentes];
    newComponentes[index] = { ...newComponentes[index], [field]: value };
    setSuggestion({ ...suggestion, componentes: newComponentes });
  };

  const removeComponent = (index: number) => {
    if (!suggestion) return;
    const newComponentes = suggestion.componentes.filter((_, i) => i !== index);
    setSuggestion({ ...suggestion, componentes: newComponentes });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/products" data-testid="link-breadcrumb-products">Produtos</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Gerador IA</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/products")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Gerador de Produto com IA
            </h1>
          </div>
        </div>
      </div>

      <Card className="hover-elevate">
        <CardHeader>
          <CardTitle>O que você deseja fabricar?</CardTitle>
          <CardDescription>
            Descreva o produto, materiais e acabamentos. A IA sugerirá a configuração completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Ex: Um banner de 1x1m com acabamento em bastão e cordão, impresso em lona 440g..."
            className="min-h-[120px] resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            data-testid="textarea-ai-prompt"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => generateMutation.mutate(prompt)}
              disabled={!prompt || generateMutation.isPending}
              data-testid="button-generate-ai"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando e Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Sugestão
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {suggestion && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confiança da IA</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        suggestion.confianca > 80 ? "bg-green-500" : suggestion.confianca > 50 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${suggestion.confianca}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">{suggestion.confianca}%</span>
                </div>
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate(suggestion)} disabled={saveMutation.isPending} data-testid="button-save-ai-product">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar como Produto"}
            </Button>
          </div>

          {suggestion.duvidas.length > 0 && (
            <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Alertas e Dúvidas</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                  {suggestion.duvidas.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Dados Sugeridos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome</label>
                      <Input
                        value={suggestion.nome}
                        onChange={(e) => handleUpdateSuggestion("nome", e.target.value)}
                        data-testid="input-ai-nome"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categoria</label>
                      <Input
                        value={suggestion.categoria}
                        onChange={(e) => handleUpdateSuggestion("categoria", e.target.value)}
                        data-testid="input-ai-categoria"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unidade de Venda</label>
                      <Input
                        value={suggestion.unidadeVenda}
                        onChange={(e) => handleUpdateSuggestion("unidadeVenda", e.target.value)}
                        data-testid="input-ai-unidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de Cálculo</label>
                      <Input
                        value={suggestion.tipoCalculo}
                        onChange={(e) => handleUpdateSuggestion("tipoCalculo", e.target.value)}
                        data-testid="input-ai-tipo-calculo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição Comercial</label>
                    <Textarea
                      className="min-h-[80px] resize-none"
                      value={suggestion.descricaoComercial}
                      onChange={(e) => handleUpdateSuggestion("descricaoComercial", e.target.value)}
                      data-testid="textarea-ai-comercial"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição Técnica</label>
                    <Textarea
                      className="min-h-[80px] resize-none"
                      value={suggestion.descricaoTecnica}
                      onChange={(e) => handleUpdateSuggestion("descricaoTecnica", e.target.value)}
                      data-testid="textarea-ai-tecnica"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Box className="w-5 h-5 text-primary" />
                    Composição Sugerida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {suggestion.componentes.map((comp, idx) => (
                      <div key={idx} className="p-4 border rounded-lg space-y-3 bg-card/50 relative group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeComponent(idx)}
                          data-testid={`button-remove-ai-comp-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Matéria-prima</label>
                            <select
                              className="w-full bg-background border rounded px-2 py-1 text-sm h-9"
                              value={comp.rawMaterialId || ""}
                              onChange={(e) => handleUpdateComponent(idx, "rawMaterialId", e.target.value)}
                              data-testid={`select-ai-material-${idx}`}
                            >
                              <option value="">-- Sugestão: {comp.nomeSugerido} --</option>
                              {rawMaterials.map(m => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                              ))}
                            </select>
                            {!comp.rawMaterialId && (
                              <p className="text-[10px] text-yellow-600 font-medium">IA sugeriu: {comp.nomeSugerido}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo Consumo</label>
                            <Input
                              className="h-9 text-sm"
                              value={comp.tipoConsumo}
                              onChange={(e) => handleUpdateComponent(idx, "tipoConsumo", e.target.value)}
                              data-testid={`input-ai-tipo-consumo-${idx}`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Qtd Base</label>
                            <Input
                              className="h-9 text-sm"
                              type="number"
                              value={comp.quantidadeBase}
                              onChange={(e) => handleUpdateComponent(idx, "quantidadeBase", e.target.value)}
                              data-testid={`input-ai-qtd-${idx}`}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Perda (%)</label>
                            <Input
                              className="h-9 text-sm"
                              type="number"
                              value={comp.perdaAdicional}
                              onChange={(e) => handleUpdateComponent(idx, "perdaAdicional", e.target.value)}
                              data-testid={`input-ai-perda-${idx}`}
                            />
                          </div>
                          <div className="sm:col-span-1 space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Obs Técnica</label>
                            <Input
                              className="h-9 text-sm"
                              value={comp.observacaoTecnica || ""}
                              onChange={(e) => handleUpdateComponent(idx, "observacaoTecnica", e.target.value)}
                              data-testid={`input-ai-obs-${idx}`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Histórico Recente</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {history.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">Nenhuma geração anterior.</div>
                    ) : (
                      history.slice(0, 5).map((h) => (
                        <AccordionItem key={h.id} value={h.id}>
                          <AccordionTrigger className="px-4 text-xs font-medium text-left">
                            {h.promptOriginal.slice(0, 40)}...
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-2">
                              <p className="text-[10px] text-muted-foreground italic">"{h.promptOriginal}"</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-7"
                                onClick={() => {
                                  const parsed = JSON.parse(h.respostaRaw as string);
                                  setSuggestion({ ...parsed, id: h.id });
                                  setPrompt(h.promptOriginal);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                data-testid={`button-restore-ai-${h.id}`}
                              >
                                Restaurar esta versão
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))
                    )}
                  </Accordion>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">Dicas do Especialista</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>• Seja específico sobre as medidas, mesmo que o produto seja variável.</p>
                  <p>• Mencione o tipo de acabamento (ex: ilhós, bainha, verniz).</p>
                  <p>• A IA tentará encontrar as matérias-primas equivalentes no seu cadastro.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
