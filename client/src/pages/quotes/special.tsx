import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Sparkles, ArrowLeft, Download, Wand2, Settings2, Plus, Trash2,
  AlertTriangle, CheckCircle, Loader2, Pencil, Save, X, ToggleLeft, ToggleRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QuoteRule } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpecialQuoteItem {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  precoTotal: number;
  materialId?: string | null;
  materialNome?: string | null;
  encontrado: boolean;
}

interface SpecialQuoteResult {
  titulo: string;
  itens: SpecialQuoteItem[];
  subtotal: number;
  total: number;
  observacoes: string;
  materiaisNaoEncontrados: string[];
}

// ─── Quote Rules Modal ────────────────────────────────────────────────────────

function QuoteRulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", descricao: "", regra: "", ativa: true });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ nome: "", descricao: "", regra: "", ativa: true });

  const { data: rules = [], isLoading } = useQuery<QuoteRule[]>({
    queryKey: ["/api/quote-rules"],
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: (data: typeof newForm) => apiRequest("POST", "/api/quote-rules", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/quote-rules"] });
      setShowNew(false);
      setNewForm({ nome: "", descricao: "", regra: "", ativa: true });
      toast({ title: "Regra criada com sucesso" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof editForm> }) =>
      apiRequest("PUT", `/api/quote-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/quote-rules"] });
      setEditingId(null);
      toast({ title: "Regra atualizada" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quote-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/quote-rules"] });
      toast({ title: "Regra removida" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, ativa }: { id: string; ativa: boolean }) =>
      apiRequest("PUT", `/api/quote-rules/${id}`, { ativa }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/quote-rules"] }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            Regras de Orçamento
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Defina regras que a IA deve seguir ao gerar orçamentos. Ex: "Instalação em horário especial: acrescentar 50% na hora dos funcionários."
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : rules.length === 0 && !showNew ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma regra cadastrada ainda.</p>
          ) : (
            rules.map((rule) => (
              <Card key={rule.id} className={`border ${rule.ativa ? "" : "opacity-60"}`}>
                <CardContent className="p-3">
                  {editingId === rule.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editForm.nome}
                        onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                        placeholder="Nome da regra"
                        data-testid="input-rule-name-edit"
                      />
                      <Input
                        value={editForm.descricao}
                        onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                        placeholder="Descrição (opcional)"
                      />
                      <Textarea
                        value={editForm.regra}
                        onChange={(e) => setEditForm((f) => ({ ...f, regra: e.target.value }))}
                        placeholder="Instrução para a IA..."
                        rows={3}
                        data-testid="textarea-rule-edit"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                        <Button size="sm" onClick={() => updateMut.mutate({ id: rule.id, data: editForm })} disabled={updateMut.isPending}>
                          <Save className="w-4 h-4 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm">{rule.nome}</span>
                          {!rule.ativa && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                        </div>
                        {rule.descricao && <p className="text-xs text-muted-foreground mb-1">{rule.descricao}</p>}
                        <p className="text-xs text-foreground bg-muted/50 rounded p-2">{rule.regra}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Switch
                          checked={rule.ativa}
                          onCheckedChange={(v) => toggleMut.mutate({ id: rule.id, ativa: v })}
                          data-testid={`toggle-rule-${rule.id}`}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                          setEditingId(rule.id);
                          setEditForm({ nome: rule.nome, descricao: rule.descricao || "", regra: rule.regra, ativa: rule.ativa });
                        }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMut.mutate(rule.id)} disabled={deleteMut.isPending}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {showNew && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-3 space-y-2">
                <Input
                  value={newForm.nome}
                  onChange={(e) => setNewForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome da regra *"
                  data-testid="input-rule-name-new"
                />
                <Input
                  value={newForm.descricao}
                  onChange={(e) => setNewForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descrição (opcional)"
                />
                <Textarea
                  value={newForm.regra}
                  onChange={(e) => setNewForm((f) => ({ ...f, regra: e.target.value }))}
                  placeholder="Instrução para a IA... Ex: Instalação em horário especial (após 18h): acrescentar 50% no valor da mão de obra."
                  rows={3}
                  data-testid="textarea-rule-new"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}><X className="w-4 h-4 mr-1" />Cancelar</Button>
                  <Button size="sm" onClick={() => createMut.mutate(newForm)} disabled={createMut.isPending || !newForm.nome || !newForm.regra}>
                    <Save className="w-4 h-4 mr-1" /> Salvar Regra
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNew(true)} disabled={showNew}>
            <Plus className="w-4 h-4 mr-1" /> Nova Regra
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Result Panel ─────────────────────────────────────────────────────────────

function ResultPanel({
  result,
  nomeCliente,
  pedido,
  onDownload,
  isDownloading,
}: {
  result: SpecialQuoteResult;
  nomeCliente: string;
  pedido: string;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  const hasUnfound = result.materiaisNaoEncontrados && result.materiaisNaoEncontrados.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="font-semibold text-base text-foreground">Resultado</span>
        </div>
        <Button size="sm" onClick={onDownload} disabled={isDownloading} data-testid="button-download-pdf">
          {isDownloading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
          Baixar PDF
        </Button>
      </div>

      {/* Title */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="font-semibold text-sm">{result.titulo}</p>
        {nomeCliente && <p className="text-xs text-muted-foreground mt-0.5">Cliente: {nomeCliente}</p>}
      </div>

      {/* Items Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Descrição</th>
              <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-20">Qtd</th>
              <th className="text-left px-2 py-2 font-medium text-xs text-muted-foreground w-12">Un</th>
              <th className="text-right px-2 py-2 font-medium text-xs text-muted-foreground w-24">Unit. (R$)</th>
              <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground w-24">Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            {result.itens.map((item, i) => (
              <tr key={i} className={`border-b last:border-0 ${!item.encontrado ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {!item.encontrado && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    <span className={`text-sm ${!item.encontrado ? "text-amber-700 dark:text-amber-400" : ""}`}>
                      {item.descricao}
                    </span>
                  </div>
                  {item.materialNome && item.materialNome !== item.descricao && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">↳ {item.materialNome}</p>
                  )}
                </td>
                <td className="px-2 py-2 text-right text-sm tabular-nums">
                  {Number(item.quantidade).toFixed(2)}
                </td>
                <td className="px-2 py-2 text-sm text-muted-foreground">{item.unidade}</td>
                <td className="px-2 py-2 text-right text-sm tabular-nums">
                  {Number(item.precoUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 text-right text-sm font-medium tabular-nums">
                  {Number(item.precoTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subtotal / Total */}
      <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>R$ {Number(result.subtotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-base" data-testid="text-total-value">
          <span>VALOR TOTAL</span>
          <span className="text-primary">R$ {Number(result.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-right">Válido por 7 dias</p>
      </div>

      {/* Observations */}
      {result.observacoes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20 p-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">Obs:</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{result.observacoes}</p>
        </div>
      )}

      {/* Materials not found */}
      {hasUnfound && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/20 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">
              Materiais não encontrados no cadastro:
            </p>
          </div>
          <ul className="space-y-0.5">
            {result.materiaisNaoEncontrados.map((m, i) => (
              <li key={i} className="text-xs text-red-600 dark:text-red-400">• {m}</li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Use o campo de ajuste abaixo para informar o material e seu preço — a IA irá cadastrá-lo automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SpecialQuotePage() {
  const { toast } = useToast();
  const [nomeCliente, setNomeCliente] = useState("");
  const [tituloTrabalho, setTituloTrabalho] = useState("");
  const [pedido, setPedido] = useState("");
  const [ajuste, setAjuste] = useState("");
  const [result, setResult] = useState<SpecialQuoteResult | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [materialAdded, setMaterialAdded] = useState<string | null>(null);

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/special-quotes/generate", { prompt: pedido });
      return res as unknown as SpecialQuoteResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setMaterialAdded(null);
    },
    onError: (err: Error) => toast({ title: "Erro ao gerar orçamento", description: err.message, variant: "destructive" }),
  });

  const adjustMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/special-quotes/adjust", {
        originalPrompt: pedido,
        previousResult: result,
        adjustment: ajuste,
      });
      return res as unknown as SpecialQuoteResult & { novoMaterial?: { nome: string } | null };
    },
    onSuccess: (data) => {
      if (data.novoMaterial?.nome) {
        setMaterialAdded(data.novoMaterial.nome);
        toast({ title: `Material "${data.novoMaterial.nome}" adicionado ao cadastro!` });
      }
      setResult(data);
      setAjuste("");
    },
    onError: (err: Error) => toast({ title: "Erro ao ajustar orçamento", description: err.message, variant: "destructive" }),
  });

  const handleDownload = async () => {
    if (!result) return;
    setIsDownloading(true);
    try {
      const res = await fetch("/api/special-quotes/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: result.titulo || tituloTrabalho,
          nomeCliente,
          pedido,
          itens: result.itens,
          total: result.total,
          observacoes: result.observacoes,
          materiaisNaoEncontrados: result.materiaisNaoEncontrados,
        }),
      });
      if (!res.ok) throw new Error("Falha ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orcamento-especial-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao baixar PDF", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/quotes"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Orçamento Especial IA</h1>
            </div>
            <p className="text-sm text-muted-foreground">Descreva o pedido e a IA monta o orçamento completo</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowRules(true)} data-testid="button-open-rules">
          <Settings2 className="w-4 h-4 mr-1.5" />
          Regras de Orçamento
        </Button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Input Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                Dados do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do Cliente</Label>
                  <Input
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="João da Silva"
                    data-testid="input-client-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Título do Trabalho</Label>
                  <Input
                    value={tituloTrabalho}
                    onChange={(e) => setTituloTrabalho(e.target.value)}
                    placeholder="Fachada loja X"
                    data-testid="input-work-title"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Pedido do Cliente</Label>
                <Textarea
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value)}
                  placeholder="Descreva ou cole aqui o que o cliente quer...&#10;&#10;Ex: Quero uma fachada em policarbonato 300×100cm, adesivada com vinil Mactac e estrutura em metalon 20×20."
                  rows={8}
                  className="resize-none"
                  data-testid="textarea-client-request"
                />
              </div>

              <Button
                className="w-full"
                onClick={() => generateMut.mutate()}
                disabled={!pedido.trim() || generateMut.isPending}
                data-testid="button-generate-quote"
              >
                {generateMut.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculando...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Gerar Orçamento</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Adjust Panel — only visible after result */}
          {result && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Ajustar Orçamento / Ensinar IA
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Se algum material faltou ou o preço está errado, informe abaixo. A IA irá atualizar o cadastro e recalcular.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {materialAdded && (
                  <div className="text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded p-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-700 dark:text-green-400">Material "<strong>{materialAdded}</strong>" adicionado ao cadastro de matérias-primas!</span>
                  </div>
                )}
                <Textarea
                  value={ajuste}
                  onChange={(e) => setAjuste(e.target.value)}
                  placeholder="Ex: O policarbonato 3mm custa R$600,00 o m². Adicione ao cadastro.&#10;Ex: Instalação em horário especial — acrescentar 50%.&#10;Ex: Substituir o metalon por alumínio."
                  rows={4}
                  className="resize-none"
                  data-testid="textarea-adjustment"
                />
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => adjustMut.mutate()}
                  disabled={!ajuste.trim() || adjustMut.isPending}
                  data-testid="button-adjust-quote"
                >
                  {adjustMut.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ajustando...</>
                  ) : (
                    <><Wand2 className="w-4 h-4 mr-2" />Ajustar</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Result Panel */}
        <div>
          {!result && !generateMut.isPending && (
            <div className="h-full min-h-64 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">O resultado aparecerá aqui</p>
                <p className="text-xs mt-1 opacity-70">Descreva o pedido e clique em "Gerar Orçamento"</p>
              </div>
            </div>
          )}

          {generateMut.isPending && (
            <div className="h-full min-h-64 rounded-xl border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-primary" />
                <p className="text-sm font-medium">Analisando materiais e calculando custos...</p>
                <p className="text-xs mt-1 opacity-70">Consultando catálogo e aplicando regras</p>
              </div>
            </div>
          )}

          {result && !generateMut.isPending && (
            <ResultPanel
              result={result}
              nomeCliente={nomeCliente}
              pedido={pedido}
              onDownload={handleDownload}
              isDownloading={isDownloading}
            />
          )}
        </div>
      </div>

      <QuoteRulesModal open={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
