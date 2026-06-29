import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  Plus, PackageOpen, Search, Eye, Pencil, XCircle, X, FileText, ChevronDown, CheckCircle2, Printer, Bell,
  Send, Truck, PackageCheck, ThumbsDown, CircleCheckBig, AlertTriangle,
} from "lucide-react";
import { Link, useSearch, useLocation } from "wouter";

type PurchaseRequest = {
  id: string;
  codigo: string;
  solicitanteNome: string | null;
  solicitanteTelefone: string | null;
  material: string;
  quantidade: string | null;
  unidade: string | null;
  osRelacionada: string | null;
  tipoCompra: string | null;
  urgencia: string | null;
  observacao: string | null;
  status: string;
  fornecedorId: string | null;
  fornecedorNome: string | null;
  ordemCompraNumero: string | null;
  aprovadoPor: string | null;
  createdAt: string;
  updatedAt: string;
};

type Supplier = { id: string; nome: string; telefone?: string | null; email?: string | null };

const STATUS_VARIANTS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  aguardando_informacoes: { label: "Aguardando informações", variant: "secondary" },
  aguardando_aprovacao:   { label: "Aguardando aprovação",    variant: "secondary" },
  aprovado:               { label: "Aprovado",                    variant: "default" },
  em_cotacao:             { label: "Em cotação",                  variant: "default" },
  pedido_enviado:         { label: "Pedido enviado",             variant: "default" },
  comprado:               { label: "Comprado",                    variant: "default" },
  aguardando_entrega:     { label: "Aguardando entrega",        variant: "secondary" },
  recebido:               { label: "Recebido",                    variant: "default" },
  concluido:              { label: "Concluído",                   variant: "outline" },
  rejeitado:              { label: "Rejeitado",                   variant: "destructive" },
  cancelado:              { label: "Cancelado",                   variant: "destructive" },
};

const STATUS_OPTIONS = [
  { value: "aguardando_informacoes", label: "Aguardando informações" },
  { value: "aguardando_aprovacao",   label: "Aguardando aprovação" },
  { value: "aprovado",               label: "Aprovado" },
  { value: "em_cotacao",             label: "Em cotação" },
  { value: "pedido_enviado",         label: "Pedido enviado" },
  { value: "comprado",               label: "Comprado" },
  { value: "aguardando_entrega",     label: "Aguardando entrega" },
  { value: "recebido",               label: "Recebido" },
  { value: "concluido",              label: "Concluído" },
  { value: "rejeitado",              label: "Rejeitado" },
  { value: "cancelado",              label: "Cancelado" },
];

const TIPO_OPTIONS = [
  { value: "os",          label: "OS" },
  { value: "estoque",     label: "Estoque" },
  { value: "expediente",  label: "Expediente" },
  { value: "manutencao",  label: "Manutenção" },
  { value: "outro",       label: "Outro" },
];

const URGENCIA_OPTIONS = [
  { value: "normal",       label: "Normal" },
  { value: "urgente",      label: "Urgente" },
  { value: "muito_urgente", label: "Muito urgente" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type RawMaterial = { id: string; nome: string; unidade?: string | null };

export default function PurchasesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PurchaseRequest | null>(null);
  const prefillApplied = useRef(false);

  // Approval dialog state
  const [openApprove, setOpenApprove] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PurchaseRequest | null>(null);
  const [approveSupId, setApproveSupId] = useState("");
  const [approveSupNome, setApproveSupNome] = useState("");
  const [approveSupOpen, setApproveSupOpen] = useState(false);
  const approveSupRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [fSolicitante, setFSolicitante] = useState("");
  const [fTelefone, setFTelefone] = useState("");
  const [fMaterial, setFMaterial] = useState("");
  const [materialOpen, setMaterialOpen] = useState(false);
  const materialRef = useRef<HTMLDivElement>(null);

  const { data: rawMatsData } = useQuery<{ data: RawMaterial[] } | RawMaterial[]>({
    queryKey: ["/api/raw-materials"],
  });
  const rawMaterials: RawMaterial[] = Array.isArray(rawMatsData)
    ? rawMatsData
    : (rawMatsData as { data: RawMaterial[] })?.data ?? [];

  const { data: suppliersData } = useQuery<{ data: Supplier[] } | Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
  const suppliers: Supplier[] = Array.isArray(suppliersData)
    ? suppliersData
    : (suppliersData as { data: Supplier[] })?.data ?? [];

  const filteredSuppliers = suppliers.filter((s) =>
    s.nome.toLowerCase().includes(approveSupNome.toLowerCase())
  );

  const filteredMaterials = rawMaterials.filter((m) =>
    m.nome.toLowerCase().includes(fMaterial.toLowerCase())
  );

  useEffect(() => {
    const handlerMat = (e: MouseEvent) => {
      if (materialRef.current && !materialRef.current.contains(e.target as Node)) setMaterialOpen(false);
    };
    const handlerSup = (e: MouseEvent) => {
      if (approveSupRef.current && !approveSupRef.current.contains(e.target as Node)) setApproveSupOpen(false);
    };
    document.addEventListener("mousedown", handlerMat);
    document.addEventListener("mousedown", handlerSup);
    return () => {
      document.removeEventListener("mousedown", handlerMat);
      document.removeEventListener("mousedown", handlerSup);
    };
  }, []);
  const [fQuantidade, setFQuantidade] = useState("");
  const [fUnidade, setFUnidade] = useState("");
  const [fOs, setFOs] = useState("");
  const [fTipo, setFTipo] = useState("estoque");
  const [fUrgencia, setFUrgencia] = useState("normal");
  const [fObs, setFObs] = useState("");

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (tipoFilter) params.set("tipoCompra", tipoFilter);
    return `/api/purchase-requests${params.toString() ? "?" + params.toString() : ""}`;
  };

  const { data, isLoading } = useQuery<{ data: PurchaseRequest[]; total: number }>({
    queryKey: ["/api/purchase-requests", { search, status: statusFilter, tipo: tipoFilter }],
    queryFn: () => fetch(buildUrl(), { credentials: "include" }).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 409) {
        throw new Error(json.error || "Solicitação duplicada");
      }
      if (!res.ok) throw new Error(json.error || "Erro ao criar solicitação");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies/attention"] });
      setOpenForm(false);
      resetForm();
      toast({ title: "Solicitação criada", description: "Nova solicitação de compra registrada com sucesso." });
    },
    onError: (err: Error) => toast({
      title: "Não foi possível criar",
      description: err.message,
      variant: "destructive",
    }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/purchase-requests/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      setOpenForm(false);
      setEditingId(null);
      resetForm();
      toast({ title: "Solicitação atualizada", description: "Dados salvos com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/purchase-requests/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies/attention"] });
      toast({ title: "Solicitação cancelada" });
    },
  });

  // Estado do dialog de confirmação de transição
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
  }>({ open: false, title: "", description: "", onConfirm: () => {}, variant: "default" });

  const openConfirm = (
    title: string,
    description: string,
    onConfirm: () => void,
    variant: "default" | "destructive" = "default"
  ) => setConfirmDialog({ open: true, title, description, onConfirm, variant });

  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));

  const transitionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/purchase-requests/${id}/transition`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies/attention"] });
      closeConfirm();
      toast({ title: "Status atualizado", description: "Processo de compra avançado com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("PATCH", `/api/purchase-requests/${id}/reject`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies/attention"] });
      closeConfirm();
      toast({ title: "Solicitação rejeitada" });
    },
    onError: () => toast({ title: "Erro", variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, fornecedorId, fornecedorNome }: { id: string; fornecedorId?: string; fornecedorNome?: string }) =>
      apiRequest("PATCH", `/api/purchase-requests/${id}/approve`, {
        fornecedorId: fornecedorId || undefined,
        fornecedorNome: fornecedorNome || undefined,
        aprovadoPor: user?.nome || user?.username,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      setOpenApprove(false);
      toast({ title: "Ordem de compra gerada!", description: "Solicitação aprovada. Use o botão de impressão para gerar o PDF." });
    },
  });

  const openApproveDialog = (r: PurchaseRequest) => {
    setApproveTarget(r);
    setApproveSupId("");
    setApproveSupNome("");
    setOpenApprove(true);
  };

  const handleApprove = () => {
    if (!approveTarget) return;
    approveMutation.mutate({ id: approveTarget.id, fornecedorId: approveSupId || undefined, fornecedorNome: approveSupId ? undefined : approveSupNome || undefined });
  };

  const resetForm = () => {
    setFSolicitante(user?.nome || user?.username || "");
    setFTelefone(""); setFMaterial(""); setFQuantidade("");
    setFUnidade(""); setFOs(""); setFTipo("estoque"); setFUrgencia("normal"); setFObs("");
    setEditingId(null);
  };

  // Pré-preenchimento via query params vindos da Central de Suprimentos
  useEffect(() => {
    if (prefillApplied.current) return;
    const params = new URLSearchParams(searchString);
    if (params.get("new") !== "1") return;
    prefillApplied.current = true;
    const mat = params.get("material") || "";
    const qty = params.get("quantidade") || "";
    const un = params.get("unidade") || "";
    const urg = params.get("urgencia") || "normal";
    const obs = params.get("obs") || "";
    setFSolicitante(user?.nome || user?.username || "");
    setFMaterial(mat);
    setFQuantidade(qty);
    setFUnidade(un);
    setFUrgencia(urg);
    setFObs(obs);
    setFTipo("estoque");
    setFTelefone("");
    setFOs("");
    setEditingId(null);
    setOpenForm(true);
    // Limpa os params da URL sem recarregar a página
    setLocation("/inventory/purchases", { replace: true });
  }, [searchString, user]);

  const openNew = () => {
    resetForm();
    setFSolicitante(user?.nome || user?.username || "");
    setOpenForm(true);
  };

  const openEdit = (r: PurchaseRequest) => {
    setEditingId(r.id);
    setFSolicitante(r.solicitanteNome ?? ""); setFTelefone(r.solicitanteTelefone ?? "");
    setFMaterial(r.material); setFQuantidade(r.quantidade ?? ""); setFUnidade(r.unidade ?? "");
    setFOs(r.osRelacionada ?? ""); setFTipo(r.tipoCompra ?? "estoque");
    setFUrgencia(r.urgencia ?? "normal"); setFObs(r.observacao ?? "");
    setOpenForm(true);
  };

  const openViewDialog = (r: PurchaseRequest) => { setViewing(r); setOpenView(true); };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      solicitanteNome: fSolicitante.trim() || null,
      solicitanteTelefone: fTelefone.trim() || null,
      material: fMaterial.trim(),
      quantidade: fQuantidade.trim() || null,
      unidade: fUnidade.trim() || null,
      osRelacionada: fOs.trim() || null,
      tipoCompra: fTipo,
      urgencia: fUrgencia,
      observacao: fObs.trim() || null,
      status: editingId ? undefined : "aguardando_aprovacao",
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  };

  const rows = data?.data ?? [];
  const hasFilters = statusFilter || tipoFilter || search.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PackageOpen className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
        </div>
        <p className="text-muted-foreground">Solicitações de compra e reposição de materiais</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar código, material, solicitante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-purchase-search"
            />
          </div>
          <Select value={statusFilter || undefined} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tipoFilter || undefined} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setTipoFilter(""); setSearch(""); }} className="h-9 px-2">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Button onClick={openNew} data-testid="button-nova-solicitacao">
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Solicitação
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Código</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Urgência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Nenhuma solicitação encontrada.</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const statusMeta = STATUS_VARIANTS[r.status];
                return (
                  <TableRow
                    key={r.id}
                    data-testid={`row-purchase-${r.id}`}
                    className={["cancelado", "rejeitado", "concluido"].includes(r.status) ? "opacity-60" : ""}
                  >
                    <TableCell className="font-mono text-xs font-semibold">{r.codigo}</TableCell>
                    <TableCell className="text-xs">{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="text-sm">{r.solicitanteNome || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{r.material}</TableCell>
                    <TableCell className="text-xs">{r.quantidade || "—"} {r.unidade || ""}</TableCell>
                    <TableCell className="text-xs font-mono">{r.osRelacionada || "—"}</TableCell>
                    <TableCell className="text-xs capitalize">{r.tipoCompra || "—"}</TableCell>
                    <TableCell className="text-xs capitalize">{r.urgencia?.replace("_", " ") || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusMeta?.variant ?? "secondary"} className="text-xs whitespace-nowrap">
                        {statusMeta?.label ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* aguardando_aprovacao: aprovar, rejeitar, cancelar */}
                        {r.status === "aguardando_aprovacao" && (<>
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                            onClick={() => openApproveDialog(r)} title="Aprovar e gerar ordem"
                            data-testid={`button-approve-${r.id}`}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                            onClick={() => openConfirm(
                              "Rejeitar solicitação",
                              `Confirma a rejeição da solicitação ${r.codigo} (${r.material})?`,
                              () => rejectMutation.mutate(r.id),
                              "destructive"
                            )} title="Rejeitar" data-testid={`button-reject-${r.id}`}>
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                        </>)}
                        {/* aprovado: enviar pedido ao fornecedor */}
                        {r.status === "aprovado" && (
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={() => openConfirm(
                              "Enviar pedido ao fornecedor",
                              `Confirma que o pedido de ${r.material} foi enviado ao fornecedor?`,
                              () => transitionMutation.mutate({ id: r.id, status: "pedido_enviado" })
                            )} title="Pedido enviado ao fornecedor" data-testid={`button-send-${r.id}`}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* pedido_enviado: marcar aguardando entrega */}
                        {r.status === "pedido_enviado" && (
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                            onClick={() => openConfirm(
                              "Aguardando entrega",
                              `Confirma que o material ${r.material} está aguardando entrega?`,
                              () => transitionMutation.mutate({ id: r.id, status: "aguardando_entrega" })
                            )} title="Marcar como aguardando entrega" data-testid={`button-awaiting-${r.id}`}>
                            <Truck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* aguardando_entrega: marcar como recebido */}
                        {r.status === "aguardando_entrega" && (
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950"
                            onClick={() => openConfirm(
                              "Confirmar recebimento",
                              `Confirma o recebimento do material ${r.material}?`,
                              () => transitionMutation.mutate({ id: r.id, status: "recebido" })
                            )} title="Marcar como recebido" data-testid={`button-received-${r.id}`}>
                            <PackageCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* recebido: concluir processo */}
                        {r.status === "recebido" && (
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-green-700 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950"
                            onClick={() => openConfirm(
                              "Concluir processo",
                              `Confirma a conclusão do processo de compra de ${r.material}?`,
                              () => transitionMutation.mutate({ id: r.id, status: "concluido" })
                            )} title="Concluir processo" data-testid={`button-conclude-${r.id}`}>
                            <CircleCheckBig className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {r.ordemCompraNumero && (
                          <Link href={`/inventory/purchases/${r.id}/print`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950" title={`Imprimir OC ${r.ordemCompraNumero}`}>
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openViewDialog(r)} title="Visualizar">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => openEdit(r)} title="Editar"
                          disabled={["cancelado","rejeitado","concluido"].includes(r.status)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!["cancelado","rejeitado","concluido","recebido"].includes(r.status) && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                            onClick={() => openConfirm(
                              "Cancelar solicitação",
                              `Confirma o cancelamento da solicitação ${r.codigo}?`,
                              () => cancelMutation.mutate(r.id),
                              "destructive"
                            )} title="Cancelar" data-testid={`button-cancel-${r.id}`}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Solicitação" : "Nova Solicitação de Compra"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="solicitante">Solicitante</Label>
              <Input
                id="solicitante"
                data-testid="input-solicitante"
                value={fSolicitante}
                readOnly={!editingId}
                onChange={(e) => setFSolicitante(e.target.value)}
                className={!editingId ? "bg-muted cursor-default" : ""}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2" ref={materialRef}>
              <Label htmlFor="material">Material *</Label>
              <div className="relative">
                <Input
                  id="material"
                  data-testid="input-material"
                  value={fMaterial}
                  onChange={(e) => { setFMaterial(e.target.value); setMaterialOpen(true); }}
                  onFocus={() => setMaterialOpen(true)}
                  placeholder="Digite ou escolha um material..."
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setMaterialOpen((v) => !v)}
                  tabIndex={-1}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                {materialOpen && filteredMaterials.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredMaterials.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFMaterial(m.nome);
                          if (m.unidade && !fUnidade) setFUnidade(m.unidade);
                          setMaterialOpen(false);
                        }}
                      >
                        <span>{m.nome}</span>
                        {m.unidade && <span className="text-xs text-muted-foreground ml-2">{m.unidade}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input id="quantidade" value={fQuantidade} onChange={(e) => setFQuantidade(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unidade">Unidade</Label>
              <Input id="unidade" value={fUnidade} onChange={(e) => setFUnidade(e.target.value)} placeholder="litros, kg, unidades..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="os">OS relacionada</Label>
              <Input id="os" value={fOs} onChange={(e) => setFOs(e.target.value)} placeholder="Ex: OS-123" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo da compra *</Label>
              <Select value={fTipo} onValueChange={setFTipo}>
                <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.filter((o) => o.value !== "").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="urgencia">Urgência *</Label>
              <Select value={fUrgencia} onValueChange={setFUrgencia}>
                <SelectTrigger id="urgencia"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCIA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea id="observacao" value={fObs} onChange={(e) => setFObs(e.target.value)} placeholder="Detalhes adicionais..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!fMaterial.trim() || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Aprovar e Gerar Ordem de Compra
            </DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><span className="font-medium">Solicitação:</span> {approveTarget.codigo}</p>
                <p><span className="font-medium">Material:</span> {approveTarget.material}</p>
                {approveTarget.quantidade && (
                  <p><span className="font-medium">Quantidade:</span> {approveTarget.quantidade} {approveTarget.unidade || ""}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Fornecedor <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <div className="relative" ref={approveSupRef}>
                  <div className="flex items-center border rounded-md px-3 py-2 gap-2 bg-background cursor-pointer" onClick={() => setApproveSupOpen(true)}>
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      className="flex-1 bg-transparent outline-none text-sm"
                      placeholder="Buscar fornecedor cadastrado..."
                      value={approveSupNome}
                      onChange={(e) => { setApproveSupNome(e.target.value); setApproveSupId(""); setApproveSupOpen(true); }}
                      data-testid="input-approve-supplier"
                    />
                    {approveSupId && <span className="text-xs text-green-600 font-medium">✓</span>}
                  </div>
                  {approveSupOpen && filteredSuppliers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                      {filteredSuppliers.map((s) => (
                        <div
                          key={s.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                          onMouseDown={() => { setApproveSupId(s.id); setApproveSupNome(s.nome); setApproveSupOpen(false); }}
                        >
                          {s.nome}
                        </div>
                      ))}
                    </div>
                  )}
                  {approveSupOpen && filteredSuppliers.length === 0 && approveSupNome && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum fornecedor encontrado. O nome digitado será usado.</div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Se não selecionar um fornecedor cadastrado, o nome digitado será salvo como texto livre.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenApprove(false)}>Cancelar</Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Aprovando..." : "Aprovar e Gerar OC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={closeConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${confirmDialog.variant === "destructive" ? "text-red-500" : "text-primary"}`} />
              {confirmDialog.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{confirmDialog.description}</p>
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirm}>Cancelar</Button>
            <Button
              variant={confirmDialog.variant === "destructive" ? "destructive" : "default"}
              onClick={confirmDialog.onConfirm}
              disabled={transitionMutation.isPending || rejectMutation.isPending || cancelMutation.isPending}
              data-testid="button-confirm-action"
            >
              {(transitionMutation.isPending || rejectMutation.isPending || cancelMutation.isPending) ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {viewing?.codigo}
              <Badge variant={viewing ? STATUS_VARIANTS[viewing.status]?.variant ?? "secondary" : "secondary"} className="text-xs">
                {viewing ? STATUS_VARIANTS[viewing.status]?.label ?? viewing.status : ""}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Solicitante:</span> {viewing.solicitanteNome || "—"}</div>
                <div><span className="text-muted-foreground">Telefone:</span> {viewing.solicitanteTelefone || "—"}</div>
                <div><span className="text-muted-foreground">Material:</span> {viewing.material}</div>
                <div><span className="text-muted-foreground">Quantidade:</span> {viewing.quantidade || "—"} {viewing.unidade || ""}</div>
                <div><span className="text-muted-foreground">OS:</span> {viewing.osRelacionada || "—"}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {viewing.tipoCompra || "—"}</div>
                <div><span className="text-muted-foreground">Urgência:</span> {viewing.urgencia?.replace("_", " ") || "—"}</div>
                <div><span className="text-muted-foreground">Criado em:</span> {formatDate(viewing.createdAt)}</div>
              </div>
              {viewing.observacao && (
                <>
                  <Separator />
                  <div><span className="text-muted-foreground text-sm">Observação:</span><p className="text-sm mt-1">{viewing.observacao}</p></div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenView(false)}>Fechar</Button>
            {viewing && viewing.status !== "cancelado" && (
              <Button onClick={() => { setOpenView(false); openEdit(viewing); }}>
                <Pencil className="w-4 h-4 mr-1.5" /> Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
