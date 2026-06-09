import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Bot, ArrowLeft, Sparkles, Loader2, CheckCircle, User, Calendar,
  AlertTriangle, Trash2, ChevronRight, FileText, Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Seller } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedItem {
  descricao: string;
  largura: number | null;
  altura: number | null;
  area: number | null;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  precoTotal: number;
  observacoes: string;
}

interface ParseResult {
  titulo: string;
  itens: ParsedItem[];
  total: number;
  observacoes: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const today = () => new Date().toISOString().slice(0, 10);
const in30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

// ─── Item Row (editable) ──────────────────────────────────────────────────────

function ItemRow({
  item,
  idx,
  onUpdate,
  onDelete,
}: {
  item: ParsedItem;
  idx: number;
  onUpdate: (idx: number, item: ParsedItem) => void;
  onDelete: (idx: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);

  const save = () => {
    const precoTotal = Math.round(Number(draft.quantidade) * Number(draft.precoUnitario) * 100) / 100;
    onUpdate(idx, { ...draft, precoTotal });
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="border-b bg-primary/5">
        <td className="px-3 py-2" colSpan={6}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <div className="col-span-2">
              <Label className="text-xs">Descrição</Label>
              <Input value={draft.descricao} onChange={(e) => setDraft((d) => ({ ...d, descricao: e.target.value }))} className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" value={draft.quantidade} onChange={(e) => setDraft((d) => ({ ...d, quantidade: Number(e.target.value) }))} className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Unidade</Label>
              <Input value={draft.unidade} onChange={(e) => setDraft((d) => ({ ...d, unidade: e.target.value }))} className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Largura (m)</Label>
              <Input type="number" value={draft.largura ?? ""} onChange={(e) => setDraft((d) => ({ ...d, largura: e.target.value ? Number(e.target.value) : null }))} className="h-7 text-sm" placeholder="—" />
            </div>
            <div>
              <Label className="text-xs">Altura (m)</Label>
              <Input type="number" value={draft.altura ?? ""} onChange={(e) => setDraft((d) => ({ ...d, altura: e.target.value ? Number(e.target.value) : null }))} className="h-7 text-sm" placeholder="—" />
            </div>
            <div>
              <Label className="text-xs">Preço Unitário (R$)</Label>
              <Input type="number" value={draft.precoUnitario} onChange={(e) => setDraft((d) => ({ ...d, precoUnitario: Number(e.target.value) }))} className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input value={draft.observacoes} onChange={(e) => setDraft((d) => ({ ...d, observacoes: e.target.value }))} className="h-7 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button size="sm" onClick={save}>Salvar</Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 group">
      <td className="px-3 py-2.5 text-sm">
        <span className="font-medium">{item.descricao}</span>
        {item.observacoes && <p className="text-xs text-muted-foreground">{item.observacoes}</p>}
        {(item.largura || item.altura) && (
          <p className="text-xs text-muted-foreground">
            {item.largura}m × {item.altura}m
            {item.area ? ` = ${item.area.toFixed(2)}m²` : ""}
          </p>
        )}
      </td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums">{item.quantidade}</td>
      <td className="px-3 py-2.5 text-sm text-center text-muted-foreground">{item.unidade}</td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums">{formatCurrency(item.precoUnitario)}</td>
      <td className="px-3 py-2.5 text-sm text-right tabular-nums font-medium">{formatCurrency(item.precoTotal)}</td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setDraft(item); setEditing(true); }}>
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(idx)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuoteAgentPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Step state
  const [step, setStep] = useState<"input" | "preview">("input");
  const [itemListText, setItemListText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);

  // Quote metadata
  const [clientId, setClientId] = useState("");
  const [sellerId, setSellerId] = useState("none");
  const [quoteDate, setQuoteDate] = useState(today());
  const [validade, setValidade] = useState(in30Days());

  // Data queries
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => fetch("/api/clients?limit=200").then((r) => r.json()).then((d) => d.data),
  });

  const { data: sellers = [] } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
    queryFn: () => fetch("/api/sellers").then((r) => r.json()).then((d) => d.data ?? d),
  });

  // Parse mutation
  const parseMut = useMutation({
    mutationFn: () =>
      fetch("/api/quotes/agent-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemListText }),
      }).then((r) => {
        if (!r.ok) throw new Error("Falha ao processar lista");
        return r.json() as Promise<ParseResult>;
      }),
    onSuccess: (data) => {
      setParseResult(data);
      setItems(data.itens);
      setStep("preview");
    },
    onError: () => toast({ title: "Erro ao processar lista", variant: "destructive" }),
  });

  // Create quote mutation
  const createMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/quotes/agent-create", {
        clientId,
        sellerId: sellerId === "none" ? null : sellerId,
        data: quoteDate,
        validade,
        titulo: parseResult?.titulo,
        itens: items,
        total: items.reduce((acc, i) => acc + i.precoTotal, 0),
        observacoes: parseResult?.observacoes,
      }),
    onSuccess: (data: any) => {
      toast({ title: "Orçamento criado com sucesso!" });
      navigate(`/quotes/${data.id}`);
    },
    onError: () => toast({ title: "Erro ao criar orçamento", variant: "destructive" }),
  });

  const totalCalc = items.reduce((acc, i) => acc + i.precoTotal, 0);

  const handleItemUpdate = (idx: number, updated: ParsedItem) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? updated : it)));
  };

  const handleItemDelete = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const exampleText = `1200 bandeiras P 100x070 - R$19,90un
600 bandeira M 140x100 - R$29,85un
600 bandeira G 200x140 - R$75,00un
800 windbanner 250x070 - R$158,00 unit (com base de concreto)`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quotes"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Agente de Orçamento</h1>
            <p className="text-sm text-muted-foreground">Cole sua lista e o agente monta o orçamento automaticamente</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Steps */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors ${step === "input" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">1</span>
          Lista de Itens
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors ${step === "preview" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">2</span>
          Revisar e Salvar
        </div>
      </div>

      {/* STEP 1: Input */}
      {step === "input" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Cole a lista de itens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={itemListText}
                  onChange={(e) => setItemListText(e.target.value)}
                  placeholder={exampleText}
                  rows={12}
                  className="font-mono text-sm resize-none"
                  data-testid="textarea-item-list"
                />
                <Button
                  onClick={() => parseMut.mutate()}
                  disabled={parseMut.isPending || !itemListText.trim()}
                  className="w-full"
                  data-testid="button-parse-list"
                >
                  {parseMut.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Processar com IA</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados do Orçamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Cliente <span className="text-destructive">*</span></Label>
                  <Select value={clientId} onValueChange={setClientId} data-testid="select-client">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nomeFantasia || c.razaoSocial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Vendedor</Label>
                  <Select value={sellerId} onValueChange={setSellerId} data-testid="select-seller">
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nomeCompleto}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Data</Label>
                    <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} data-testid="input-date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Validade</Label>
                    <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} data-testid="input-validade" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Exemplos de formatos aceitos:</p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{exampleText}</pre>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  O agente entende: quantidade, descrição, dimensões (LxA em cm ou m), preço unitário e total.
                  Se o preço não estiver informado, o agente estimará pelo mercado.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* STEP 2: Preview */}
      {step === "preview" && parseResult && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">{parseResult.titulo}</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {items.length} ite{items.length !== 1 ? "ns" : "m"} · Total: {formatCurrency(totalCalc)}
              </p>
            </div>
            <Button variant="outline" onClick={() => setStep("input")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Editar Lista
            </Button>
          </div>

          {/* Client / seller summary */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              {clients.find((c) => c.id === clientId)?.nomeFantasia ||
                clients.find((c) => c.id === clientId)?.razaoSocial ||
                <span className="text-destructive font-medium">Cliente não selecionado</span>}
            </div>
            {sellerId && sellerId !== "none" && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {sellers.find((s) => s.id === sellerId)?.nomeCompleto}
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {new Date(quoteDate + "T12:00:00").toLocaleDateString("pt-BR")} → {new Date(validade + "T12:00:00").toLocaleDateString("pt-BR")}
            </div>
          </div>

          {!clientId && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Selecione um cliente antes de salvar o orçamento.
            </div>
          )}

          {/* Items table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Descrição</th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Qtd</th>
                      <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Un</th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Preço Unit.</th>
                      <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Total</th>
                      <th className="px-3 py-2.5 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <ItemRow
                        key={idx}
                        item={item}
                        idx={idx}
                        onUpdate={handleItemUpdate}
                        onDelete={handleItemDelete}
                      />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={4} className="px-3 py-3 text-right font-semibold">Total Geral:</td>
                      <td className="px-3 py-3 text-right font-bold text-primary text-base">{formatCurrency(totalCalc)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {parseResult.observacoes && (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span className="font-medium">Obs. do Agente:</span> {parseResult.observacoes}
            </p>
          )}

          {/* Metadata form for step 2 (compact) */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Confirmar dados do orçamento</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Cliente <span className="text-destructive">*</span></Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Vendedor</Label>
                  <Select value={sellerId} onValueChange={setSellerId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nomeCompleto}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Validade</Label>
                  <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !clientId || items.length === 0}
              data-testid="button-create-quote"
            >
              {createMut.isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><CheckCircle className="w-5 h-5 mr-2" /> Criar Orçamento</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
