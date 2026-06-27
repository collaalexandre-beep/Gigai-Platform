import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wallet, AlertTriangle, CheckCircle2, Clock, TrendingDown, Plus, CheckCheck, Pencil, X,
} from "lucide-react";

type AccountPayable = {
  id: string;
  fornecedorNome: string;
  fornecedorCnpj: string | null;
  numeroDocumento: string | null;
  numeroParcela: string | null;
  descricao: string | null;
  valorTotal: string;
  dataEmissao: string | null;
  dataVencimento: string | null;
  status: string;
  formaPagamento: string | null;
  codigoBarras: string | null;
  pagoEm: string | null;
  pagoValor: string | null;
  pagoFormaPagamento: string | null;
  observacao: string | null;
  nfeImportId: string | null;
};

type Summary = {
  totalPendente: number;
  totalVencido: number;
  totalPagoMes: number;
  countPendente: number;
  countVencido: number;
};

const STATUS_VARIANTS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; cls: string }> = {
  pendente: { label: "Pendente", variant: "secondary", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  vencido:  { label: "Vencido",  variant: "destructive", cls: "" },
  pago:     { label: "Pago",     variant: "default", cls: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  cancelado: { label: "Cancelado", variant: "outline", cls: "" },
};

const fmt = (v: number | string | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const s = String(d).substring(0, 10).split("-");
  return `${s[2]}/${s[1]}/${s[0]}`;
};

const isVencido = (item: AccountPayable) =>
  item.status === "pendente" && item.dataVencimento && item.dataVencimento < new Date().toISOString().substring(0, 10);

export default function AccountsPayablePage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [payDialog, setPayDialog] = useState<AccountPayable | null>(null);
  const [payValor, setPayValor] = useState("");
  const [payForma, setPayForma] = useState("boleto");
  const [editDialog, setEditDialog] = useState<AccountPayable | null>(null);
  const [newDialog, setNewDialog] = useState(false);

  // New/Edit form state
  const [fFornecedor, setFFornecedor] = useState("");
  const [fDescricao, setFDescricao] = useState("");
  const [fValor, setFValor] = useState("");
  const [fVencimento, setFVencimento] = useState("");
  const [fEmissao, setFEmissao] = useState("");
  const [fCodigoBarras, setFCodigoBarras] = useState("");
  const [fForma, setFForma] = useState("boleto");
  const [fObs, setFObs] = useState("");
  const [fNumDoc, setFNumDoc] = useState("");

  const resetForm = () => {
    setFFornecedor(""); setFDescricao(""); setFValor(""); setFVencimento("");
    setFEmissao(""); setFCodigoBarras(""); setFForma("boleto"); setFObs(""); setFNumDoc("");
  };

  const { data: summaryData } = useQuery<Summary>({
    queryKey: ["/api/accounts-payable/summary"],
    queryFn: () => fetch("/api/accounts-payable/summary", { credentials: "include" }).then((r) => r.json()),
  });

  const buildUrl = () => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    return `/api/accounts-payable${p.toString() ? "?" + p.toString() : ""}`;
  };

  const { data, isLoading } = useQuery<{ data: AccountPayable[]; total: number }>({
    queryKey: ["/api/accounts-payable", { status: statusFilter }],
    queryFn: () => fetch(buildUrl(), { credentials: "include" }).then((r) => r.json()),
  });

  const filteredData = (data?.data ?? []).filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.fornecedorNome.toLowerCase().includes(q) ||
      (item.descricao ?? "").toLowerCase().includes(q) ||
      (item.numeroDocumento ?? "").toLowerCase().includes(q);
  }).map((item) => ({
    ...item,
    status: isVencido(item) ? "vencido" : item.status,
  }));

  const payMutation = useMutation({
    mutationFn: async ({ id, pagoValor, pagoFormaPagamento }: { id: string; pagoValor: number; pagoFormaPagamento: string }) =>
      (await apiRequest("POST", `/api/accounts-payable/${id}/pay`, { pagoValor, pagoFormaPagamento })).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] });
      setPayDialog(null);
      toast({ title: "Pagamento registrado!" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await apiRequest("POST", "/api/accounts-payable", payload)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable/summary"] });
      setNewDialog(false);
      resetForm();
      toast({ title: "Conta criada!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      (await apiRequest("PATCH", `/api/accounts-payable/${id}`, payload)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable/summary"] });
      setEditDialog(null);
      toast({ title: "Conta atualizada!" });
    },
  });

  const openEdit = (item: AccountPayable) => {
    setEditDialog(item);
    setFFornecedor(item.fornecedorNome);
    setFDescricao(item.descricao ?? "");
    setFValor(item.valorTotal);
    setFVencimento(item.dataVencimento ?? "");
    setFEmissao(item.dataEmissao ?? "");
    setFCodigoBarras(item.codigoBarras ?? "");
    setFForma(item.formaPagamento ?? "boleto");
    setFObs(item.observacao ?? "");
    setFNumDoc(item.numeroDocumento ?? "");
  };

  const buildPayload = () => ({
    fornecedorNome: fFornecedor,
    descricao: fDescricao || null,
    valorTotal: fValor,
    dataVencimento: fVencimento || null,
    dataEmissao: fEmissao || null,
    codigoBarras: fCodigoBarras || null,
    formaPagamento: fForma || null,
    observacao: fObs || null,
    numeroDocumento: fNumDoc || null,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de pagamentos a fornecedores</p>
        </div>
        <Button onClick={() => { resetForm(); setNewDialog(true); }} data-testid="button-new-payable">
          <Plus className="w-4 h-4 mr-2" /> Nova Conta
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">A Vencer</span>
          </div>
          <p className="text-2xl font-bold">{fmt(summaryData?.totalPendente ?? 0)}</p>
          <p className="text-xs text-muted-foreground">{summaryData?.countPendente ?? 0} títulos</p>
        </div>
        <div className="border rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Vencidas</span>
          </div>
          <p className="text-2xl font-bold">{fmt(summaryData?.totalVencido ?? 0)}</p>
          <p className="text-xs text-muted-foreground">{summaryData?.countVencido ?? 0} títulos</p>
        </div>
        <div className="border rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCheck className="w-4 h-4" />
            <span className="text-sm font-medium">Pago no mês</span>
          </div>
          <p className="text-2xl font-bold">{fmt(summaryData?.totalPagoMes ?? 0)}</p>
          <p className="text-xs text-muted-foreground">mês atual</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          className="h-8 text-sm w-56"
          placeholder="Buscar fornecedor, descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-payable"
        />
        <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor / Descrição</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : !filteredData.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Wallet className="w-10 h-10 opacity-30" />
                  <p>Nenhuma conta encontrada</p>
                </div>
              </TableCell></TableRow>
            ) : filteredData.map((item) => {
              const sv = STATUS_VARIANTS[item.status] ?? STATUS_VARIANTS.pendente;
              return (
                <TableRow key={item.id} data-testid={`row-payable-${item.id}`}
                  className={item.status === "vencido" ? "bg-red-50/50 dark:bg-red-950/20" : ""}
                >
                  <TableCell>
                    <div className="font-medium text-sm">{item.fornecedorNome}</div>
                    {item.descricao && <div className="text-xs text-muted-foreground">{item.descricao}</div>}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {item.numeroDocumento ?? "—"}{item.numeroParcela ? ` / ${item.numeroParcela}` : ""}
                  </TableCell>
                  <TableCell className="text-sm">{fmtDate(item.dataEmissao)}</TableCell>
                  <TableCell className={`text-sm font-medium ${item.status === "vencido" ? "text-red-600 dark:text-red-400" : ""}`}>
                    {fmtDate(item.dataVencimento)}
                  </TableCell>
                  <TableCell className="text-sm font-semibold">{fmt(item.valorTotal)}</TableCell>
                  <TableCell>
                    <Badge variant={sv.variant} className={`text-xs ${sv.cls}`}>{sv.label}</Badge>
                    {item.status === "pago" && item.pagoEm && (
                      <div className="text-xs text-muted-foreground mt-0.5">em {fmtDate(item.pagoEm)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(item.status === "pendente" || item.status === "vencido") && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          onClick={() => { setPayDialog(item); setPayValor(item.valorTotal); setPayForma("boleto"); }}
                          data-testid={`button-pay-${item.id}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pagar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pay Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => !o && setPayDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          {payDialog && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><span className="font-medium">Fornecedor:</span> {payDialog.fornecedorNome}</p>
                {payDialog.descricao && <p><span className="font-medium">Descrição:</span> {payDialog.descricao}</p>}
                <p><span className="font-medium">Vencimento:</span> {fmtDate(payDialog.dataVencimento)}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Valor pago (R$)</Label>
                <Input type="number" step="0.01" value={payValor} onChange={(e) => setPayValor(e.target.value)} data-testid="input-pay-value" />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={payForma} onValueChange={setPayForma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => payMutation.mutate({ id: payDialog!.id, pagoValor: Number(payValor), pagoFormaPagamento: payForma })}
              disabled={payMutation.isPending}
              data-testid="button-confirm-pay"
            >
              {payMutation.isPending ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New/Edit Dialog */}
      {(newDialog || editDialog) && (
        <Dialog open onOpenChange={(o) => { if (!o) { setNewDialog(false); setEditDialog(null); } }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editDialog ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Fornecedor *</Label>
                <Input value={fFornecedor} onChange={(e) => setFFornecedor(e.target.value)} placeholder="Nome do fornecedor" data-testid="input-fornecedor" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nº Documento</Label>
                  <Input value={fNumDoc} onChange={(e) => setFNumDoc(e.target.value)} placeholder="NF, duplicata..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={fValor} onChange={(e) => setFValor(e.target.value)} data-testid="input-valor" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} placeholder="Produto, serviço..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Emissão</Label>
                  <Input type="date" value={fEmissao} onChange={(e) => setFEmissao(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimento</Label>
                  <Input type="date" value={fVencimento} onChange={(e) => setFVencimento(e.target.value)} data-testid="input-vencimento" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={fForma} onValueChange={setFForma}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Código de barras (boleto)</Label>
                <Input value={fCodigoBarras} onChange={(e) => setFCodigoBarras(e.target.value)} placeholder="Linha digitável" data-testid="input-codigo-barras" />
              </div>
              <div className="space-y-1.5">
                <Label>Observação</Label>
                <Input value={fObs} onChange={(e) => setFObs(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setNewDialog(false); setEditDialog(null); }}>Cancelar</Button>
              <Button
                disabled={!fFornecedor || !fValor || createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (editDialog) updateMutation.mutate({ id: editDialog.id, payload: buildPayload() });
                  else createMutation.mutate(buildPayload());
                }}
                data-testid="button-save-payable"
              >
                {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
