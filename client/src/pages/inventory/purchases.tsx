import { useState } from "react";
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
import {
  Plus, PackageOpen, Search, Eye, Pencil, XCircle, X, FileText,
} from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
};

const STATUS_VARIANTS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  aguardando_informacoes: { label: "Aguardando informações", variant: "secondary" },
  aguardando_aprovacao:   { label: "Aguardando aprovação",    variant: "secondary" },
  aprovado:               { label: "Aprovado",                    variant: "default" },
  em_cotacao:             { label: "Em cotação",                  variant: "default" },
  comprado:               { label: "Comprado",                    variant: "default" },
  aguardando_entrega:     { label: "Aguardando entrega",        variant: "secondary" },
  recebido:               { label: "Recebido",                    variant: "default" },
  cancelado:              { label: "Cancelado",                   variant: "destructive" },
};

const STATUS_OPTIONS = [
  { value: "aguardando_informacoes", label: "Aguardando informações" },
  { value: "aguardando_aprovacao",   label: "Aguardando aprovação" },
  { value: "aprovado",               label: "Aprovado" },
  { value: "em_cotacao",             label: "Em cotação" },
  { value: "comprado",               label: "Comprado" },
  { value: "aguardando_entrega",     label: "Aguardando entrega" },
  { value: "recebido",               label: "Recebido" },
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

export default function PurchasesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PurchaseRequest | null>(null);

  // Form fields
  const [fSolicitante, setFSolicitante] = useState("");
  const [fTelefone, setFTelefone] = useState("");
  const [fMaterial, setFMaterial] = useState("");
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
    mutationFn: async (payload: Record<string, unknown>) => apiRequest("POST", "/api/purchase-requests", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      setOpenForm(false);
      resetForm();
      toast({ title: "Solicitação criada", description: "Nova solicitação de compra registrada com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar a solicitação.", variant: "destructive" }),
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
      toast({ title: "Solicitação cancelada" });
    },
  });

  const resetForm = () => {
    setFSolicitante(""); setFTelefone(""); setFMaterial(""); setFQuantidade("");
    setFUnidade(""); setFOs(""); setFTipo("estoque"); setFUrgencia("normal"); setFObs("");
    setEditingId(null);
  };

  const openNew = () => { resetForm(); setOpenForm(true); };

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
                  <TableRow key={r.id} data-testid={`row-purchase-${r.id}`} className={r.status === "cancelado" ? "opacity-50" : ""}>
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
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openViewDialog(r)} title="Visualizar">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)} title="Editar" disabled={r.status === "cancelado"}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => cancelMutation.mutate(r.id)} title="Cancelar" disabled={r.status === "cancelado"}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
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
              <Input id="solicitante" value={fSolicitante} onChange={(e) => setFSolicitante(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone do solicitante</Label>
              <Input id="telefone" value={fTelefone} onChange={(e) => setFTelefone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="material">Material *</Label>
              <Input id="material" value={fMaterial} onChange={(e) => setFMaterial(e.target.value)} placeholder="Ex: Tinta vinílica vermelha" />
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
