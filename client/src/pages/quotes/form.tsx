import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, Search, Loader2, CheckCircle2, ChevronRight,
  User, FileText, Calendar, Clock, DollarSign, Plus, Trash2,
  Sparkles, Layers, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quote, QuoteItem, Client, Contact, Seller, PaymentTerm, Product, Company } from "@shared/schema";
import { format, addDays } from "date-fns";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface QuoteItemForm {
  productId: string | null;
  descricao: string;
  largura: string;
  altura: string;
  area: string;
  quantidade: string;
  unidade: string;
  custoCalculado: string;
  precoUnitario: string;
  precoTotal: string;
  observacoes: string;
}

interface QuoteFormData {
  clientId: string;
  contactId: string;
  sellerId: string;
  companyId: string;
  data: string;
  validade: string;
  status: string;
  prazoProd: string;
  prazosPagamentoId: string;
  formaPagamento: string;
  observacoes: string;
  desconto: string;
  impostos: string;
  items: QuoteItemForm[];
}

const emptyForm: QuoteFormData = {
  clientId: "",
  contactId: "",
  sellerId: "",
  companyId: "",
  data: new Date().toISOString().split("T")[0],
  validade: addDays(new Date(), 7).toISOString().split("T")[0],
  status: "rascunho",
  prazoProd: "",
  prazosPagamentoId: "",
  formaPagamento: "",
  observacoes: "",
  desconto: "0",
  impostos: "0",
  items: [],
};

export default function QuoteFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;

  const { data: existingQuote, isLoading: loadingQuote } = useQuery<Quote & { items: QuoteItem[] }>({
    queryKey: ["/api/quotes", id],
    queryFn: async () => {
      const q = await fetch(`/api/quotes/${id}`).then(r => r.json());
      const items = await fetch(`/api/quotes/${id}/items`).then(r => r.json());
      return { ...q, items };
    },
    enabled: isEdit,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => fetch("/api/clients?limit=100").then(r => r.json()).then(d => d.data),
  });

  const { data: sellers = [] } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
    queryFn: () => fetch("/api/sellers?limit=100").then(r => r.json()).then(d => d.data),
  });

  const { data: paymentTerms = [] } = useQuery<PaymentTerm[]>({
    queryKey: ["/api/payment-terms"],
  });

  const { data: paymentMethods = [] } = useQuery<{ id: string; nome: string; ativo: boolean }[]>({
    queryKey: ["/api/payment-methods"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => fetch("/api/products?limit=100").then(r => r.json()).then(d => d.data),
  });

  const { data: companiesData } = useQuery<{ data: Company[] }>({
    queryKey: ["/api/companies"],
    queryFn: () => fetch("/api/companies?status=ativa&limit=100").then(r => r.json()),
  });
  const companies = companiesData?.data ?? [];

  const [form, setForm] = useState<QuoteFormData>(emptyForm);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (existingQuote) {
      setForm({
        clientId: existingQuote.clientId || "",
        contactId: existingQuote.contactId || "",
        sellerId: existingQuote.sellerId || "",
        companyId: (existingQuote as any).companyId || "",
        data: existingQuote.data ? new Date(existingQuote.data).toISOString().split("T")[0] : "",
        validade: existingQuote.validade ? new Date(existingQuote.validade).toISOString().split("T")[0] : "",
        status: existingQuote.status || "rascunho",
        prazoProd: existingQuote.prazoProd || "",
        prazosPagamentoId: existingQuote.prazosPagamentoId || "",
        formaPagamento: existingQuote.formaPagamento || "",
        observacoes: existingQuote.observacoes || "",
        desconto: String(existingQuote.desconto || 0),
        impostos: String(existingQuote.impostos || 0),
        items: existingQuote.items.map(item => ({
          productId: item.productId,
          descricao: item.descricao || "",
          largura: String(item.largura || ""),
          altura: String(item.altura || ""),
          area: String(item.area || ""),
          quantidade: String(item.quantidade || ""),
          unidade: item.unidade || "un",
          custoCalculado: String(item.custoCalculado || 0),
          precoUnitario: String(item.precoUnitario || 0),
          precoTotal: String(item.precoTotal || 0),
          observacoes: item.observacoes || "",
        })),
      });
    }
  }, [existingQuote]);

  const set = (field: keyof QuoteFormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addItem = () => {
    set("items", [
      ...form.items,
      {
        productId: null,
        descricao: "",
        largura: "",
        altura: "",
        area: "",
        quantidade: "1",
        unidade: "un",
        custoCalculado: "0",
        precoUnitario: "0",
        precoTotal: "0",
        observacoes: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    set("items", form.items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItemForm, value: string) => {
    const newItems = [...form.items];
    const item = { ...newItems[index], [field]: value };

    if (field === "largura" || field === "altura") {
      const l = parseFloat(field === "largura" ? value : item.largura);
      const a = parseFloat(field === "altura" ? value : item.altura);
      if (!isNaN(l) && !isNaN(a)) {
        item.area = (l * a).toFixed(4);
      }
    }

    if (field === "quantidade" || field === "precoUnitario" || field === "largura" || field === "altura") {
      const q = parseFloat(field === "quantidade" ? value : item.quantidade);
      const p = parseFloat(field === "precoUnitario" ? value : item.precoUnitario);
      if (!isNaN(q) && !isNaN(p)) {
        item.precoTotal = (q * p).toFixed(2);
      }
    }

    newItems[index] = item;
    set("items", newItems);
  };

  const calculateSubtotal = () => {
    return form.items.reduce((acc, item) => acc + parseFloat(item.precoTotal || "0"), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const desconto = subtotal * (parseFloat(form.desconto || "0") / 100);
    const impostos = subtotal * (parseFloat(form.impostos || "0") / 100);
    return subtotal - desconto + impostos;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      const payload = {
        ...data,
        desconto: parseFloat(data.desconto),
        impostos: parseFloat(data.impostos),
        valorTotal: calculateTotal(),
        items: data.items.map(i => ({
          ...i,
          descricao: i.descricao || "",
          largura: i.largura ? parseFloat(i.largura) : null,
          altura: i.altura ? parseFloat(i.altura) : null,
          area: i.area ? parseFloat(i.area) : null,
          quantidade: parseFloat(i.quantidade) || 1,
          custoCalculado: parseFloat(i.custoCalculado) || 0,
          precoUnitario: parseFloat(i.precoUnitario) || 0,
          precoTotal: parseFloat(i.precoTotal) || 0,
        })),
      };

      if (isEdit) {
        await apiRequest("PATCH", `/api/quotes/${id}`, payload);
        await apiRequest("PUT", `/api/quotes/${id}/items`, { items: payload.items });
        return { id };
      } else {
        const res = await apiRequest("POST", "/api/quotes", payload);
        const quote = await res.json();
        await apiRequest("PUT", `/api/quotes/${quote.id}/items`, { items: payload.items });
        return quote;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: isEdit ? "Orçamento atualizado." : "Orçamento criado." });
      setLocation(`/quotes/${data.id}`);
    },
    onError: (err: Error) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
  });

  const handleAiItem = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      // Note: Endpoint for AI item suggestion needs to be implemented or matched
      const res = await apiRequest("POST", "/api/ai/suggest-quote-item", { prompt: aiPrompt });
      const suggested = await res.json();
      
      set("items", [
        ...form.items,
        {
          productId: suggested.productId || null,
          descricao: suggested.descricao || "",
          largura: String(suggested.largura || ""),
          altura: String(suggested.altura || ""),
          area: String(suggested.area || ""),
          quantidade: String(suggested.quantidade || "1"),
          unidade: suggested.unidade || "un",
          custoCalculado: String(suggested.custoCalculado || 0),
          precoUnitario: String(suggested.precoUnitario || 0),
          precoTotal: String(suggested.precoTotal || 0),
          observacoes: suggested.observacoes || "Sugerido por IA",
        }
      ]);
      
      setIsAiDialogOpen(false);
      setAiPrompt("");
      toast({ title: "Item montado pela IA com sucesso!" });
    } catch (err) {
      toast({ title: "Erro na IA", description: "Não foi possível gerar a sugestão.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isEdit && loadingQuote) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/quotes")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? `Editar Orçamento ${existingQuote?.numero}` : "Novo Orçamento"}</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados do orçamento e adicione os itens.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/quotes")}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Orçamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-sm font-semibold">Informações Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Empresa Emissora
              </Label>
              <Select value={form.companyId || "none"} onValueChange={(v) => set("companyId", v === "none" ? "" : v)} data-testid="select-company">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem empresa vinculada</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nomeFantasia || c.razaoSocial}
                      {c.isPadrao && " ★"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companies.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma empresa ativa cadastrada. <Link href="/companies/new" className="text-primary underline">Cadastrar empresa</Link>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.clientId} onValueChange={(v) => set("clientId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={form.sellerId} onValueChange={(v) => set("sellerId", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                  <SelectContent>
                    {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.nomeCompleto}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input type="date" value={form.validade} onChange={(e) => set("validade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commercial Info */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Comercial</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prazo Produção</Label>
              <Input placeholder="Ex: 5 dias úteis" value={form.prazoProd} onChange={(e) => set("prazoProd", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Condição de Pagamento</Label>
              <Select value={form.prazosPagamentoId} onValueChange={(v) => set("prazosPagamentoId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {paymentTerms.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={form.formaPagamento} onValueChange={(v) => set("formaPagamento", v)}>
                <SelectTrigger data-testid="select-forma-pagamento">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.filter(m => m.ativo).map(m => (
                    <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                  ))}
                  {paymentMethods.filter(m => m.ativo).length === 0 && (
                    <SelectItem value="_none" disabled>Nenhuma forma cadastrada</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              Itens do Orçamento
            </CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAiDialogOpen(true)}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Montar com IA
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-2 py-2 font-medium">Produto / Descrição</th>
                    <th className="text-left px-2 py-2 font-medium w-20">Larg (m)</th>
                    <th className="text-left px-2 py-2 font-medium w-20">Alt (m)</th>
                    <th className="text-left px-2 py-2 font-medium w-24">Área (m²)</th>
                    <th className="text-left px-2 py-2 font-medium w-20">Qtd</th>
                    <th className="text-left px-2 py-2 font-medium w-32">P. Unitário</th>
                    <th className="text-right px-2 py-2 font-medium w-32">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 space-y-1">
                        <Select
                          value={item.productId || "none"}
                          onValueChange={(v) => {
                            const newItems = [...form.items];
                            const current = { ...newItems[idx] };
                            const selectedId = v === "none" ? "" : v;
                            current.productId = selectedId;
                            if (selectedId) {
                              const prod = products.find(p => p.id === selectedId);
                              if (prod && !current.descricao) {
                                current.descricao = prod.nome;
                              }
                            }
                            newItems[idx] = current;
                            set("items", newItems);
                          }}
                        >
                          <SelectTrigger className="h-8"><SelectValue placeholder="Produto" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Item Personalizado</SelectItem>
                            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Descrição do item"
                          className="h-8"
                          value={item.descricao}
                          onChange={(e) => updateItem(idx, "descricao", e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input className="h-8" type="number" step="0.01" value={item.largura} onChange={(e) => updateItem(idx, "largura", e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="h-8" type="number" step="0.01" value={item.altura} onChange={(e) => updateItem(idx, "altura", e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="h-8 bg-muted" readOnly value={item.area} />
                      </td>
                      <td className="p-2">
                        <Input className="h-8" type="number" value={item.quantidade} onChange={(e) => updateItem(idx, "quantidade", e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="h-8" type="number" step="0.01" value={item.precoUnitario} onChange={(e) => updateItem(idx, "precoUnitario", e.target.value)} />
                      </td>
                      <td className="p-2 text-right font-medium">
                        R$ {parseFloat(item.precoTotal || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {form.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground italic">
                        Nenhum item adicionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div className="mt-6 flex flex-col items-end space-y-2 border-t pt-4">
              <div className="flex justify-between w-64 text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">R$ {calculateSubtotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between w-64 text-sm items-center gap-2">
                <span className="text-muted-foreground">Desconto (%):</span>
                <Input className="h-7 w-20 text-right" type="number" value={form.desconto} onChange={(e) => set("desconto", e.target.value)} />
              </div>
              <div className="flex justify-between w-64 text-sm items-center gap-2">
                <span className="text-muted-foreground">Impostos (%):</span>
                <Input className="h-7 w-20 text-right" type="number" value={form.impostos} onChange={(e) => set("impostos", e.target.value)} />
              </div>
              <div className="flex justify-between w-64 text-lg font-bold border-t pt-2 mt-2">
                <span>Total Geral:</span>
                <span className="text-primary">R$ {calculateTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observations */}
        <Card className="md:col-span-3">
          <CardHeader><CardTitle className="text-sm font-semibold">Observações do Orçamento</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              placeholder="Notas internas ou observações para o cliente..."
              className="min-h-[100px]"
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* AI Dialog */}
      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Montar item com IA
            </DialogTitle>
            <DialogDescription>
              Descreva o que o cliente deseja e a IA irá sugerir o produto, medidas e preços.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ex: Painel de lona 3x2m com acabamento em ilhós para evento promocional..."
              className="min-h-[120px]"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAiDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAiItem} disabled={isGenerating || !aiPrompt.trim()}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Gerar Sugestão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
