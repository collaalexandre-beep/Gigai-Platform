import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";

import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Truck,
  Search,
  Eye,
  Pencil,
  Power,
  PowerOff,
  X,
} from "lucide-react";

type Supplier = {
  id: string;
  nome: string;
  tipoPessoa: string;
  cnpjCpf: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  contato: string | null;
  materiaisFornecidos: string[] | null;
  condicaoPagamentoPadrao: string | null;
  prazoMedioEntrega: string | null;
  observacao: string | null;
  ativo: boolean;
  aceitaCotacaoWhatsapp: boolean;
  whatsappAutorizado: boolean;
  templateCotacaoNome: string | null;
  ultimoContatoWhatsapp: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function SuppliersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Supplier | null>(null);

  const [formNome, setFormNome] = useState("");
  const [formTipo, setFormTipo] = useState("pj");
  const [formCnpjCpf, setFormCnpjCpf] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formContato, setFormContato] = useState("");
  const [formMateriais, setFormMateriais] = useState("");
  const [formCondicao, setFormCondicao] = useState("");
  const [formPrazo, setFormPrazo] = useState("");
  const [formObs, setFormObs] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);
  const [formAceitaCotacao, setFormAceitaCotacao] = useState(true);
  const [formWhatsappAutorizado, setFormWhatsappAutorizado] = useState(false);
  const [formTemplate, setFormTemplate] = useState("solicitacao_cotacao_fornecedor");

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "todos") params.set("ativo", statusFilter === "ativos" ? "true" : "false");
    return `/api/suppliers${params.toString() ? "?" + params.toString() : ""}`;
  };

  const { data, isLoading } = useQuery<{ data: Supplier[]; total: number }>({
    queryKey: ["/api/suppliers", { search, ativo: statusFilter }],
    queryFn: () => fetch(buildUrl(), { credentials: "include" }).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return apiRequest("POST", "/api/suppliers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setOpenForm(false);
      resetForm();
      toast({ title: "Fornecedor cadastrado", description: "Novo fornecedor adicionado com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível cadastrar o fornecedor.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/suppliers/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setOpenForm(false);
      setEditingId(null);
      resetForm();
      toast({ title: "Fornecedor atualizado", description: "Dados salvos com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/suppliers/${id}/toggle-active`, {});
    },
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      const s = data?.data.find((x) => x.id === id);
      toast({
        title: s?.ativo ? "Fornecedor desativado" : "Fornecedor reativado",
        description: `O fornecedor foi ${s?.ativo ? "desativado" : "reativado"} com sucesso.`,
      });
    },
  });

  const resetForm = () => {
    setFormNome(""); setFormTipo("pj"); setFormCnpjCpf(""); setFormTelefone("");
    setFormWhatsapp(""); setFormEmail(""); setFormContato(""); setFormMateriais("");
    setFormCondicao(""); setFormPrazo(""); setFormObs(""); setFormAtivo(true);
    setFormAceitaCotacao(true); setFormWhatsappAutorizado(false);
    setFormTemplate("solicitacao_cotacao_fornecedor");
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setFormNome(s.nome);
    setFormTipo(s.tipoPessoa);
    setFormCnpjCpf(s.cnpjCpf ?? "");
    setFormTelefone(s.telefone ?? "");
    setFormWhatsapp(s.whatsapp ?? "");
    setFormEmail(s.email ?? "");
    setFormContato(s.contato ?? "");
    setFormMateriais(s.materiaisFornecidos?.join(", ") ?? "");
    setFormCondicao(s.condicaoPagamentoPadrao ?? "");
    setFormPrazo(s.prazoMedioEntrega ?? "");
    setFormObs(s.observacao ?? "");
    setFormAtivo(s.ativo);
    setFormAceitaCotacao(s.aceitaCotacaoWhatsapp);
    setFormWhatsappAutorizado(s.whatsappAutorizado);
    setFormTemplate(s.templateCotacaoNome ?? "solicitacao_cotacao_fornecedor");
    setOpenForm(true);
  };

  const openViewDialog = (s: Supplier) => {
    setViewing(s);
    setOpenView(true);
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      nome: formNome.trim(),
      tipoPessoa: formTipo,
      cnpjCpf: formCnpjCpf.trim() || null,
      telefone: formTelefone.trim() || null,
      whatsapp: formWhatsapp.trim() || null,
      email: formEmail.trim() || null,
      contato: formContato.trim() || null,
      materiaisFornecidos: formMateriais.split(",").map((m) => m.trim()).filter(Boolean),
      condicaoPagamentoPadrao: formCondicao.trim() || null,
      prazoMedioEntrega: formPrazo.trim() || null,
      observacao: formObs.trim() || null,
      ativo: formAtivo,
      aceitaCotacaoWhatsapp: formAceitaCotacao,
      whatsappAutorizado: formWhatsappAutorizado,
      templateCotacaoNome: formTemplate.trim() || "solicitacao_cotacao_fornecedor",
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const suppliers = data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Truck className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
        </div>
        <p className="text-muted-foreground">
          Cadastro de fornecedores de materiais, serviços e insumos
        </p>
      </div>

      {/* Filters + button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, CNPJ, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-supplier-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew} data-testid="button-novo-fornecedor">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Telefone / WhatsApp</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Materiais</TableHead>
              <TableHead>Condição</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id} data-testid={`row-supplier-${s.id}`} className={!s.ativo ? "opacity-60" : ""}>
                  <TableCell className="text-sm font-medium">{s.nome}</TableCell>
                  <TableCell className="text-xs font-mono">{s.cnpjCpf || "—"}</TableCell>
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
                        <Badge variant="outline" className="text-[10px] py-0">+{(s.materiaisFornecidos!.length - 2)}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{s.condicaoPagamentoPadrao || "—"}</TableCell>
                  <TableCell className="text-xs">{s.prazoMedioEntrega || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.ativo ? "default" : "secondary"} className="text-xs">
                      {s.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openViewDialog(s)} title="Visualizar">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 w-7 p-0 ${s.ativo ? "text-orange-500" : "text-green-600"}`}
                        onClick={() => toggleMutation.mutate(s.id)}
                        title={s.ativo ? "Desativar" : "Reativar"}
                      >
                        {s.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={formNome} onChange={(e) => setFormNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo de pessoa *</Label>
              <Select value={formTipo} onValueChange={setFormTipo}>
                <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                  <SelectItem value="pf">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">{formTipo === "pj" ? "CNPJ" : "CPF"}</Label>
              <Input id="cnpj" value={formCnpjCpf} onChange={(e) => setFormCnpjCpf(e.target.value)} />
            </div>
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
              <Label htmlFor="contato">Contato</Label>
              <Input id="contato" value={formContato} onChange={(e) => setFormContato(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="materiais">Materiais fornecidos (separados por vírgula)</Label>
              <Input id="materiais" value={formMateriais} onChange={(e) => setFormMateriais(e.target.value)} placeholder="Tinta, Papel, Lona..." />
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
              <Textarea id="obs" value={formObs} onChange={(e) => setFormObs(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  id="ativo"
                  type="checkbox"
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="ativo" className="font-normal">Ativo</Label>
              </div>
            </div>
            <Separator className="sm:col-span-2 my-1" />
            <div className="sm:col-span-2">
              <h4 className="text-sm font-semibold text-primary">Cotação por WhatsApp</h4>
              <p className="text-xs text-muted-foreground">Controle se a Lucy pode enviar cotações a este fornecedor</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  id="aceita-cotacao"
                  type="checkbox"
                  checked={formAceitaCotacao}
                  onChange={(e) => setFormAceitaCotacao(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="aceita-cotacao" className="font-normal">Aceita cotação</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  id="whatsapp-autorizado"
                  type="checkbox"
                  checked={formWhatsappAutorizado}
                  onChange={(e) => setFormWhatsappAutorizado(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="whatsapp-autorizado" className="font-normal">WhatsApp autorizado</Label>
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="template">Template de cotação (nome no Meta)</Label>
              <Input
                id="template"
                value={formTemplate}
                onChange={(e) => setFormTemplate(e.target.value)}
                placeholder="solicitacao_cotacao_fornecedor"
              />
              <p className="text-xs text-muted-foreground">Template aprovado no Meta Business para envio fora da janela de 24h</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!formNome.trim() || createMutation.isPending || updateMutation.isPending}
            >
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
              <Truck className="w-5 h-5" />
              {viewing?.nome}
              <Badge variant={viewing?.ativo ? "default" : "secondary"} className="ml-2 text-xs">
                {viewing?.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> {viewing.tipoPessoa === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}</div>
                <div><span className="text-muted-foreground">CNPJ/CPF:</span> {viewing.cnpjCpf || "—"}</div>
                <div><span className="text-muted-foreground">Telefone:</span> {viewing.telefone || "—"}</div>
                <div><span className="text-muted-foreground">WhatsApp:</span> {viewing.whatsapp || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">E-mail:</span> {viewing.email || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Contato:</span> {viewing.contato || "—"}</div>
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground text-sm">Materiais fornecidos:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(viewing.materiaisFornecidos ?? []).map((m, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                  ))}
                  {(!viewing.materiaisFornecidos || viewing.materiaisFornecidos.length === 0) && <span className="text-sm text-muted-foreground">Nenhum informado</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Condição:</span> {viewing.condicaoPagamentoPadrao || "—"}</div>
                <div><span className="text-muted-foreground">Prazo médio:</span> {viewing.prazoMedioEntrega || "—"}</div>
              </div>
              {viewing.observacao && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground text-sm">Observação:</span>
                    <p className="text-sm mt-1">{viewing.observacao}</p>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <span className="text-muted-foreground text-sm">Cotação por WhatsApp:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant={viewing.aceitaCotacaoWhatsapp ? "default" : "secondary"} className="text-xs">
                    {viewing.aceitaCotacaoWhatsapp ? "Aceita cotação" : "Não aceita cotação"}
                  </Badge>
                  <Badge variant={viewing.whatsappAutorizado ? "default" : "destructive"} className="text-xs">
                    {viewing.whatsappAutorizado ? "WhatsApp autorizado" : "WhatsApp não autorizado"}
                  </Badge>
                  {viewing.templateCotacaoNome && (
                    <Badge variant="outline" className="text-xs">Template: {viewing.templateCotacaoNome}</Badge>
                  )}
                  {viewing.ultimoContatoWhatsapp && (
                    <Badge variant="outline" className="text-xs">Últ. contato: {new Date(viewing.ultimoContatoWhatsapp).toLocaleString("pt-BR")}</Badge>
                  )}
                </div>
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
