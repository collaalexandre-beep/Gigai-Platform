import { useState, useEffect, useRef } from "react";
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
  Plus, Truck, Search, Eye, Pencil, Power, PowerOff,
  MessageCircle, MessageSquareOff, X, Loader2, RefreshCw,
} from "lucide-react";

type Supplier = {
  id: string;
  nome: string;
  tipoPessoa: string;
  cnpjCpf: string | null;
  nomeFantasia: string | null;
  inscricaoEstadual: string | null;
  situacaoCadastral: string | null;
  dataAbertura: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  contato: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  materiaisFornecidos: string[] | null;
  condicaoPagamentoPadrao: string | null;
  prazoMedioEntrega: string | null;
  observacao: string | null;
  ativo: boolean;
  aceitaCotacaoWhatsapp: boolean;
  whatsappAutorizado: boolean;
  templateCotacaoNome: string | null;
  idiomaTemplateCotacao: string | null;
  ultimoContatoWhatsapp: string | null;
  observacaoWhatsapp: string | null;
  createdAt: string;
  updatedAt: string;
};

function whatsappStatus(s: Supplier): "ok" | "pendente" | "nao" {
  if (!s.aceitaCotacaoWhatsapp) return "nao";
  if (s.whatsappAutorizado && s.templateCotacaoNome) return "ok";
  return "pendente";
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [cotacaoFilter, setCotacaoFilter] = useState<string>("todos");
  const [autorizadoFilter, setAutorizadoFilter] = useState<string>("todos");
  const [materialFilter, setMaterialFilter] = useState<string>("");
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Supplier | null>(null);

  // Form fields
  const [formNome, setFormNome] = useState("");
  const [formTipo, setFormTipo] = useState("pj");
  const [formCnpjCpf, setFormCnpjCpf] = useState("");
  const [formNomeFantasia, setFormNomeFantasia] = useState("");
  const [formInscricaoEstadual, setFormInscricaoEstadual] = useState("");
  const [formSituacaoCadastral, setFormSituacaoCadastral] = useState("");
  const [formDataAbertura, setFormDataAbertura] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formContato, setFormContato] = useState("");
  const [formLogradouro, setFormLogradouro] = useState("");
  const [formNumero, setFormNumero] = useState("");
  const [formComplemento, setFormComplemento] = useState("");
  const [formBairro, setFormBairro] = useState("");
  const [formCidade, setFormCidade] = useState("");
  const [formEstado, setFormEstado] = useState("");
  const [formCep, setFormCep] = useState("");
  const [formMateriais, setFormMateriais] = useState("");
  const [formCondicao, setFormCondicao] = useState("");
  const [formPrazo, setFormPrazo] = useState("");
  const [formObs, setFormObs] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);
  const [formAceitaCotacao, setFormAceitaCotacao] = useState(false);
  const [formWhatsappAutorizado, setFormWhatsappAutorizado] = useState(false);
  const [formTemplate, setFormTemplate] = useState("");
  const [formIdioma, setFormIdioma] = useState("pt_BR");
  const [formObsWhatsapp, setFormObsWhatsapp] = useState("");

  const [cnpjLoading, setCnpjLoading] = useState(false);
  const lastLookedUp = useRef<string>("");

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "todos") params.set("ativo", statusFilter === "ativos" ? "true" : "false");
    if (cotacaoFilter !== "todos") params.set("aceitaCotacaoWhatsapp", cotacaoFilter === "sim" ? "true" : "false");
    if (autorizadoFilter !== "todos") params.set("whatsappAutorizado", autorizadoFilter === "sim" ? "true" : "false");
    if (materialFilter.trim()) params.set("material", materialFilter.trim());
    return `/api/suppliers${params.toString() ? "?" + params.toString() : ""}`;
  };

  const { data, isLoading } = useQuery<{ data: Supplier[]; total: number }>({
    queryKey: ["/api/suppliers", { search, ativo: statusFilter, cotacao: cotacaoFilter, autorizado: autorizadoFilter, material: materialFilter }],
    queryFn: () => fetch(buildUrl(), { credentials: "include" }).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => apiRequest("POST", "/api/suppliers", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setOpenForm(false);
      resetForm();
      toast({ title: "Fornecedor cadastrado", description: "Novo fornecedor adicionado com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível cadastrar o fornecedor.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/suppliers/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setOpenForm(false);
      setEditingId(null);
      resetForm();
      toast({ title: "Fornecedor atualizado", description: "Dados salvos com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/suppliers/${id}/toggle-active`, {}),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      const s = data?.data.find((x) => x.id === id);
      toast({ title: s?.ativo ? "Fornecedor desativado" : "Fornecedor reativado" });
    },
  });

  const resetForm = () => {
    setFormNome(""); setFormTipo("pj"); setFormCnpjCpf(""); setFormNomeFantasia("");
    setFormInscricaoEstadual(""); setFormSituacaoCadastral(""); setFormDataAbertura("");
    setFormTelefone(""); setFormWhatsapp(""); setFormEmail(""); setFormContato("");
    setFormLogradouro(""); setFormNumero(""); setFormComplemento(""); setFormBairro("");
    setFormCidade(""); setFormEstado(""); setFormCep("");
    setFormMateriais(""); setFormCondicao(""); setFormPrazo(""); setFormObs("");
    setFormAtivo(true); setFormAceitaCotacao(false); setFormWhatsappAutorizado(false);
    setFormTemplate(""); setFormIdioma("pt_BR"); setFormObsWhatsapp("");
    setEditingId(null);
    lastLookedUp.current = "";
  };

  const openNew = () => { resetForm(); setOpenForm(true); };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setFormNome(s.nome); setFormTipo(s.tipoPessoa); setFormCnpjCpf(s.cnpjCpf ?? "");
    setFormNomeFantasia(s.nomeFantasia ?? ""); setFormInscricaoEstadual(s.inscricaoEstadual ?? "");
    setFormSituacaoCadastral(s.situacaoCadastral ?? ""); setFormDataAbertura(s.dataAbertura ?? "");
    setFormTelefone(s.telefone ?? ""); setFormWhatsapp(s.whatsapp ?? "");
    setFormEmail(s.email ?? ""); setFormContato(s.contato ?? "");
    setFormLogradouro(s.logradouro ?? ""); setFormNumero(s.numero ?? "");
    setFormComplemento(s.complemento ?? ""); setFormBairro(s.bairro ?? "");
    setFormCidade(s.cidade ?? ""); setFormEstado(s.estado ?? ""); setFormCep(s.cep ?? "");
    setFormMateriais(s.materiaisFornecidos?.join(", ") ?? "");
    setFormCondicao(s.condicaoPagamentoPadrao ?? ""); setFormPrazo(s.prazoMedioEntrega ?? "");
    setFormObs(s.observacao ?? ""); setFormAtivo(s.ativo);
    setFormAceitaCotacao(s.aceitaCotacaoWhatsapp); setFormWhatsappAutorizado(s.whatsappAutorizado);
    setFormTemplate(s.templateCotacaoNome ?? ""); setFormIdioma(s.idiomaTemplateCotacao ?? "pt_BR");
    setFormObsWhatsapp(s.observacaoWhatsapp ?? "");
    lastLookedUp.current = (s.cnpjCpf ?? "").replace(/\D/g, "");
    setOpenForm(true);
  };

  const openViewDialog = (s: Supplier) => { setViewing(s); setOpenView(true); };

  // CNPJ auto-fill: dispara quando chega a 14 dígitos
  const handleCnpjChange = (raw: string) => {
    const formatted = formTipo === "pj" ? formatCnpj(raw) : formatCpf(raw);
    setFormCnpjCpf(formatted);
    const digits = raw.replace(/\D/g, "");
    if (formTipo === "pj" && digits.length === 14 && digits !== lastLookedUp.current) {
      lookupAndFill(digits);
    }
  };

  const lookupAndFill = async (digits: string) => {
    lastLookedUp.current = digits;
    setCnpjLoading(true);
    try {
      const res = await fetch(`/api/cnpj/${digits}`, { credentials: "include" });
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        if (d.razaoSocial) setFormNome(d.razaoSocial);
        if (d.nomeFantasia) setFormNomeFantasia(d.nomeFantasia);
        if (d.inscricaoEstadual) setFormInscricaoEstadual(d.inscricaoEstadual);
        if (d.situacaoCadastral) setFormSituacaoCadastral(d.situacaoCadastral);
        if (d.dataAbertura) setFormDataAbertura(d.dataAbertura);
        if (d.telefone) setFormTelefone(d.telefone);
        if (d.email) setFormEmail(d.email.toLowerCase());
        if (d.logradouro) setFormLogradouro(d.logradouro);
        if (d.numero) setFormNumero(d.numero);
        if (d.complemento) setFormComplemento(d.complemento);
        if (d.bairro) setFormBairro(d.bairro);
        if (d.cidade) setFormCidade(d.cidade);
        if (d.estado) setFormEstado(d.estado);
        if (d.cep) setFormCep(d.cep);
        toast({
          title: "CNPJ encontrado",
          description: `Dados preenchidos via ${result.provider}.${!d.inscricaoEstadual ? " IE não disponível — preencha manualmente." : ""}`,
        });
      } else {
        toast({ title: "CNPJ não encontrado", description: result.error || "Verifique o número e tente novamente.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao consultar CNPJ", description: "Não foi possível buscar os dados.", variant: "destructive" });
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      nome: formNome.trim(), tipoPessoa: formTipo,
      cnpjCpf: formCnpjCpf.trim() || null,
      nomeFantasia: formNomeFantasia.trim() || null,
      inscricaoEstadual: formInscricaoEstadual.trim() || null,
      situacaoCadastral: formSituacaoCadastral.trim() || null,
      dataAbertura: formDataAbertura.trim() || null,
      telefone: formTelefone.trim() || null,
      whatsapp: formWhatsapp.trim() || null,
      email: formEmail.trim() || null,
      contato: formContato.trim() || null,
      logradouro: formLogradouro.trim() || null,
      numero: formNumero.trim() || null,
      complemento: formComplemento.trim() || null,
      bairro: formBairro.trim() || null,
      cidade: formCidade.trim() || null,
      estado: formEstado.trim() || null,
      cep: formCep.trim() || null,
      materiaisFornecidos: formMateriais.split(",").map((m) => m.trim()).filter(Boolean),
      condicaoPagamentoPadrao: formCondicao.trim() || null,
      prazoMedioEntrega: formPrazo.trim() || null,
      observacao: formObs.trim() || null, ativo: formAtivo,
      aceitaCotacaoWhatsapp: formAceitaCotacao,
      whatsappAutorizado: formWhatsappAutorizado,
      templateCotacaoNome: formTemplate.trim() || null,
      idiomaTemplateCotacao: formIdioma.trim() || "pt_BR",
      observacaoWhatsapp: formObsWhatsapp.trim() || null,
    };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  };

  const suppliers = data?.data ?? [];
  const hasFilters = statusFilter !== "todos" || cotacaoFilter !== "todos" || autorizadoFilter !== "todos" || materialFilter.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter("todos"); setCotacaoFilter("todos"); setAutorizadoFilter("todos");
    setMaterialFilter(""); setSearch("");
  };

  const endereco = (s: Supplier) => {
    const parts = [s.logradouro, s.numero, s.bairro, s.cidade, s.estado].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Truck className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
        </div>
        <p className="text-muted-foreground">Cadastro de fornecedores de materiais, serviços e insumos</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar nome, CNPJ, telefone..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-supplier-search" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cotacaoFilter} onValueChange={setCotacaoFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Cotação WA" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Cotação: todos</SelectItem>
                <SelectItem value="sim">Aceita cotação</SelectItem>
                <SelectItem value="nao">Não aceita</SelectItem>
              </SelectContent>
            </Select>
            <Select value={autorizadoFilter} onValueChange={setAutorizadoFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="WA autorizado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">WA: todos</SelectItem>
                <SelectItem value="sim">Autorizado</SelectItem>
                <SelectItem value="nao">Não autorizado</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Filtrar por material..." value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)} className="w-44" />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button onClick={openNew} data-testid="button-novo-fornecedor">
            <Plus className="w-4 h-4 mr-1.5" /> Novo Fornecedor
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome / Fantasia</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>IE</TableHead>
              <TableHead>Telefone / WhatsApp</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Materiais</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Nenhum fornecedor encontrado.</TableCell></TableRow>
            ) : suppliers.map((s) => {
              const wa = whatsappStatus(s);
              return (
                <TableRow key={s.id} data-testid={`row-supplier-${s.id}`} className={!s.ativo ? "opacity-60" : ""}>
                  <TableCell className="text-sm">
                    <div className="font-medium">{s.nome}</div>
                    {s.nomeFantasia && <div className="text-xs text-muted-foreground">{s.nomeFantasia}</div>}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{s.cnpjCpf || "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{s.inscricaoEstadual || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {s.telefone || s.whatsapp ? (
                      <div className="flex flex-col gap-0.5">
                        {s.telefone && <span>{s.telefone}</span>}
                        {s.whatsapp && <span className="text-green-600">WA: {s.whatsapp}</span>}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{s.email || "—"}</TableCell>
                  <TableCell className="text-xs">{s.contato || "—"}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-wrap gap-1">
                      {(s.materiaisFornecidos ?? []).slice(0, 2).map((m, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] py-0">{m}</Badge>
                      ))}
                      {(s.materiaisFornecidos?.length ?? 0) > 2 && (
                        <Badge variant="outline" className="text-[10px] py-0">+{s.materiaisFornecidos!.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.ativo ? "default" : "secondary"} className="text-xs">{s.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    {wa === "ok" ? (
                      <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-700 gap-1"><MessageCircle className="w-3 h-3" /> OK</Badge>
                    ) : wa === "pendente" ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 gap-1"><MessageSquareOff className="w-3 h-3" /> Pendente</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] gap-1"><MessageSquareOff className="w-3 h-3" /> Não</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openViewDialog(s)} title="Visualizar">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        className={`h-7 w-7 p-0 ${s.ativo ? "text-orange-500" : "text-green-600"}`}
                        onClick={() => toggleMutation.mutate(s.id)} title={s.ativo ? "Desativar" : "Reativar"}>
                        {s.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ── Tipo + CNPJ ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tipo">Tipo de pessoa *</Label>
                <Select value={formTipo} onValueChange={(v) => { setFormTipo(v); setFormCnpjCpf(""); lastLookedUp.current = ""; }}>
                  <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                    <SelectItem value="pf">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">{formTipo === "pj" ? "CNPJ" : "CPF"}</Label>
                <div className="relative">
                  <Input
                    id="cnpj"
                    value={formCnpjCpf}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder={formTipo === "pj" ? "00.000.000/0000-00" : "000.000.000-00"}
                    data-testid="input-supplier-cnpj"
                    className={cnpjLoading ? "pr-8" : ""}
                  />
                  {cnpjLoading && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {formTipo === "pj" && !cnpjLoading && formCnpjCpf.replace(/\D/g, "").length === 14 && (
                  <button
                    type="button"
                    className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline"
                    onClick={() => lookupAndFill(formCnpjCpf.replace(/\D/g, ""))}
                  >
                    <RefreshCw className="w-3 h-3" /> Rebuscar dados do CNPJ
                  </button>
                )}
              </div>
            </div>

            {/* ── Razão Social + Nome Fantasia ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Razão Social / Nome *</Label>
                <Input id="nome" value={formNome} onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Preenchido automaticamente pelo CNPJ" data-testid="input-supplier-nome" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input id="nomeFantasia" value={formNomeFantasia} onChange={(e) => setFormNomeFantasia(e.target.value)}
                  placeholder="Preenchido automaticamente pelo CNPJ" />
              </div>
            </div>

            {/* ── IE + Situação + Data Abertura ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input id="ie" value={formInscricaoEstadual} onChange={(e) => setFormInscricaoEstadual(e.target.value)}
                  placeholder="Preenchido pelo CNPJ ou manual" data-testid="input-supplier-ie" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="situacao">Situação Cadastral</Label>
                <Input id="situacao" value={formSituacaoCadastral} onChange={(e) => setFormSituacaoCadastral(e.target.value)}
                  placeholder="Ex: Ativa" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="abertura">Data de Abertura</Label>
                <Input id="abertura" value={formDataAbertura} onChange={(e) => setFormDataAbertura(e.target.value)}
                  placeholder="Ex: 2005-03-15" />
              </div>
            </div>

            <Separator />

            {/* ── Endereço ── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Endereço</h4>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input id="logradouro" value={formLogradouro} onChange={(e) => setFormLogradouro(e.target.value)} placeholder="Rua, Av..." />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" value={formNumero} onChange={(e) => setFormNumero(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" value={formComplemento} onChange={(e) => setFormComplemento(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" value={formBairro} onChange={(e) => setFormBairro(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" value={formCidade} onChange={(e) => setFormCidade(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="estado">UF</Label>
                  <Input id="estado" value={formEstado} onChange={(e) => setFormEstado(e.target.value.toUpperCase().slice(0,2))} maxLength={2} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" value={formCep} onChange={(e) => setFormCep(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Contato ── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Contato</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={formTelefone} onChange={(e) => setFormTelefone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contato">Pessoa de contato</Label>
                  <Input id="contato" value={formContato} onChange={(e) => setFormContato(e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Comercial ── */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Informações Comerciais</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="materiais">Materiais fornecidos (separados por vírgula)</Label>
                  <Input id="materiais" value={formMateriais} onChange={(e) => setFormMateriais(e.target.value)}
                    placeholder="Tinta, Papel, Lona..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="condicao">Condição de pagamento padrão</Label>
                  <Input id="condicao" value={formCondicao} onChange={(e) => setFormCondicao(e.target.value)} placeholder="30/60/90 dias" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prazo">Prazo médio de entrega</Label>
                  <Input id="prazo" value={formPrazo} onChange={(e) => setFormPrazo(e.target.value)} placeholder="3 dias úteis" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="obs">Observação</Label>
                  <Textarea id="obs" value={formObs} onChange={(e) => setFormObs(e.target.value)} rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="ativo" type="checkbox" checked={formAtivo} onChange={(e) => setFormAtivo(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <Label htmlFor="ativo" className="font-normal">Ativo</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── WhatsApp Cotação ── */}
            <div>
              <h4 className="text-sm font-semibold text-primary">Cotação por WhatsApp</h4>
              <p className="text-xs text-muted-foreground mb-3">Controle se a Lucy pode enviar cotações a este fornecedor</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input id="aceita-cotacao" type="checkbox" checked={formAceitaCotacao} onChange={(e) => setFormAceitaCotacao(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <Label htmlFor="aceita-cotacao" className="font-normal">Aceita cotação por WhatsApp</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="whatsapp-autorizado" type="checkbox" checked={formWhatsappAutorizado} onChange={(e) => setFormWhatsappAutorizado(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <Label htmlFor="whatsapp-autorizado" className="font-normal">WhatsApp autorizado</Label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="template">Nome do template de cotação</Label>
                  <Input id="template" value={formTemplate} onChange={(e) => setFormTemplate(e.target.value)} placeholder="solicitacao_cotacao_fornecedor" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idioma">Idioma do template</Label>
                  <Input id="idioma" value={formIdioma} onChange={(e) => setFormIdioma(e.target.value)} placeholder="pt_BR" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="obs-whatsapp">Observação WhatsApp</Label>
                  <Textarea id="obs-whatsapp" value={formObsWhatsapp} onChange={(e) => setFormObsWhatsapp(e.target.value)} rows={2}
                    placeholder="Informações internas sobre o contato WhatsApp deste fornecedor..." />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formNome.trim() || createMutation.isPending || updateMutation.isPending || cnpjLoading}>
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Truck className="w-5 h-5" />
              {viewing?.nome}
              <Badge variant={viewing?.ativo ? "default" : "secondary"} className="ml-2 text-xs">
                {viewing?.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Tipo:</span> {viewing.tipoPessoa === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}</div>
                <div><span className="text-muted-foreground">CNPJ/CPF:</span> <span className="font-mono">{viewing.cnpjCpf || "—"}</span></div>
                {viewing.nomeFantasia && <div className="col-span-2"><span className="text-muted-foreground">Fantasia:</span> {viewing.nomeFantasia}</div>}
                <div><span className="text-muted-foreground">IE:</span> <span className="font-mono">{viewing.inscricaoEstadual || "—"}</span></div>
                <div><span className="text-muted-foreground">Situação:</span> {viewing.situacaoCadastral || "—"}</div>
                {viewing.dataAbertura && <div><span className="text-muted-foreground">Abertura:</span> {viewing.dataAbertura}</div>}
              </div>

              {(viewing.logradouro || viewing.cidade) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Endereço</p>
                    <p>
                      {[viewing.logradouro, viewing.numero, viewing.complemento].filter(Boolean).join(", ")}
                      {viewing.bairro && ` — ${viewing.bairro}`}
                    </p>
                    <p className="text-muted-foreground">
                      {[viewing.cidade, viewing.estado].filter(Boolean).join(" / ")}
                      {viewing.cep && ` — CEP ${viewing.cep}`}
                    </p>
                  </div>
                </>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Telefone:</span> {viewing.telefone || "—"}</div>
                <div><span className="text-muted-foreground">WhatsApp:</span> {viewing.whatsapp || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">E-mail:</span> {viewing.email || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Contato:</span> {viewing.contato || "—"}</div>
              </div>

              <Separator />
              <div>
                <span className="text-muted-foreground">Materiais fornecidos:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(viewing.materiaisFornecidos ?? []).map((m, i) => <Badge key={i} variant="outline" className="text-xs">{m}</Badge>)}
                  {(!viewing.materiaisFornecidos || viewing.materiaisFornecidos.length === 0) && <span className="text-muted-foreground">Nenhum informado</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Condição:</span> {viewing.condicaoPagamentoPadrao || "—"}</div>
                <div><span className="text-muted-foreground">Prazo médio:</span> {viewing.prazoMedioEntrega || "—"}</div>
              </div>
              {viewing.observacao && (
                <>
                  <Separator />
                  <div><span className="text-muted-foreground">Observação:</span><p className="mt-1">{viewing.observacao}</p></div>
                </>
              )}

              <Separator />
              <div>
                <span className="text-muted-foreground">Cotação por WhatsApp:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant={viewing.aceitaCotacaoWhatsapp ? "default" : "secondary"} className="text-xs">
                    {viewing.aceitaCotacaoWhatsapp ? "Aceita cotação" : "Não aceita cotação"}
                  </Badge>
                  <Badge variant={viewing.whatsappAutorizado ? "default" : "destructive"} className="text-xs">
                    {viewing.whatsappAutorizado ? "WA autorizado" : "WA não autorizado"}
                  </Badge>
                  {viewing.templateCotacaoNome && <Badge variant="outline" className="text-xs">Template: {viewing.templateCotacaoNome}</Badge>}
                </div>
                {viewing.observacaoWhatsapp && <p className="text-xs text-muted-foreground mt-2">{viewing.observacaoWhatsapp}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenView(false)}>Fechar</Button>
            {viewing && (
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
