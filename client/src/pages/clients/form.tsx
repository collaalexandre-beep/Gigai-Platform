import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, Search, Loader2, CheckCircle2, AlertCircle, ChevronRight,
  Building2, MapPin, Phone, Globe, Tag, FileText, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, PaymentTerm } from "@shared/schema";

interface ClientFormData {
  tipoPessoa: "fisica" | "juridica";
  cpf: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  situacaoCadastral: string;
  dataAbertura: string;
  naturezaJuridica: string;
  regimeTributario: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  status: string;
  origemLead: string;
  segmento: string;
  potencialCompra: string;
  observacoes: string;
  prazosPagamentoId: string;
  cnpjFonteConsulta: string;
  cnpjConsultaBemSucedida: boolean | null;
  cnpjConsultadoEm: string;
}

const emptyForm: ClientFormData = {
  tipoPessoa: "juridica",
  cpf: "",
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  situacaoCadastral: "",
  dataAbertura: "",
  naturezaJuridica: "",
  regimeTributario: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  telefone: "",
  whatsapp: "",
  email: "",
  site: "",
  instagram: "",
  status: "prospect",
  origemLead: "",
  segmento: "",
  potencialCompra: "",
  observacoes: "",
  prazosPagamentoId: "",
  cnpjFonteConsulta: "",
  cnpjConsultaBemSucedida: null,
  cnpjConsultadoEm: "",
};

function clientToForm(c: Client): ClientFormData {
  return {
    tipoPessoa: (c as any).tipoPessoa || "juridica",
    cpf: (c as any).cpf || "",
    cnpj: c.cnpj || "",
    razaoSocial: c.razaoSocial || "",
    nomeFantasia: c.nomeFantasia || "",
    inscricaoEstadual: c.inscricaoEstadual || "",
    inscricaoMunicipal: c.inscricaoMunicipal || "",
    situacaoCadastral: c.situacaoCadastral || "",
    dataAbertura: c.dataAbertura || "",
    naturezaJuridica: c.naturezaJuridica || "",
    regimeTributario: c.regimeTributario || "",
    cep: c.cep || "",
    logradouro: c.logradouro || "",
    numero: c.numero || "",
    complemento: c.complemento || "",
    bairro: c.bairro || "",
    cidade: c.cidade || "",
    estado: c.estado || "",
    telefone: c.telefone || "",
    whatsapp: c.whatsapp || "",
    email: c.email || "",
    site: c.site || "",
    instagram: c.instagram || "",
    status: c.status || "prospect",
    origemLead: c.origemLead || "",
    segmento: c.segmento || "",
    potencialCompra: c.potencialCompra || "",
    observacoes: c.observacoes || "",
    prazosPagamentoId: c.prazosPagamentoId || "",
    cnpjFonteConsulta: c.cnpjFonteConsulta || "",
    cnpjConsultaBemSucedida: c.cnpjConsultaBemSucedida ?? null,
    cnpjConsultadoEm: c.cnpjConsultadoEm ? new Date(c.cnpjConsultadoEm).toISOString() : "",
  };
}

type CnpjLookupStatus = "idle" | "loading" | "success" | "error";

function SectionLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{title}</span>
      <Separator className="flex-1" />
    </div>
  );
}

const inputCls = "h-8 text-sm placeholder:text-muted-foreground/50 bg-background";
const selectCls = "h-8 text-sm";

export default function ClientFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;

  const { data: existingClient, isLoading: loadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", id],
    queryFn: () => fetch(`/api/clients/${id}`).then((r) => r.json()),
    enabled: isEdit,
  });

  const { data: paymentTermsList = [] } = useQuery<PaymentTerm[]>({
    queryKey: ["/api/payment-terms"],
  });

  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [cnpjInput, setCnpjInput] = useState("");
  const [lookupStatus, setLookupStatus] = useState<CnpjLookupStatus>("idle");
  const [lookupError, setLookupError] = useState<string>("");
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (existingClient) {
      setForm(clientToForm(existingClient));
      setCnpjInput(existingClient.cnpj || "");
    }
  }, [existingClient]);

  const set = (field: keyof ClientFormData, value: string | boolean | null) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const isPF = form.tipoPessoa === "fisica";

  function formatCnpjInput(value: string): string {
    const clean = value.replace(/\D/g, "").slice(0, 14);
    return clean
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  async function handleCnpjLookup() {
    const clean = cnpjInput.replace(/\D/g, "");
    if (clean.length !== 14) {
      toast({ title: "CNPJ deve ter 14 dígitos.", variant: "destructive" });
      return;
    }
    setLookupStatus("loading");
    setLookupError("");
    try {
      const res = await fetch(`/api/cnpj/${clean}`);
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        const newFields = new Set<string>();
        const updates: Partial<ClientFormData> = {};
        const fieldMap: Record<string, string | undefined> = {
          razaoSocial: d.razaoSocial, nomeFantasia: d.nomeFantasia,
          inscricaoEstadual: d.inscricaoEstadual, situacaoCadastral: d.situacaoCadastral,
          dataAbertura: d.dataAbertura, naturezaJuridica: d.naturezaJuridica,
          logradouro: d.logradouro, numero: d.numero, complemento: d.complemento,
          bairro: d.bairro, cidade: d.cidade, estado: d.estado, cep: d.cep,
          telefone: d.telefone, email: d.email,
        };
        for (const [key, value] of Object.entries(fieldMap)) {
          if (value) { (updates as any)[key] = value; newFields.add(key); }
        }
        setForm((prev) => ({
          ...prev, ...updates, cnpj: formatCnpjInput(clean),
          cnpjFonteConsulta: result.provider, cnpjConsultaBemSucedida: true,
          cnpjConsultadoEm: new Date().toISOString(),
        }));
        setAutoFilledFields(newFields);
        setLookupStatus("success");
        toast({ title: `Dados obtidos via ${result.provider}` });
      } else {
        setLookupStatus("error");
        setLookupError(result.error || "CNPJ não encontrado.");
        setForm((prev) => ({
          ...prev, cnpj: formatCnpjInput(clean),
          cnpjFonteConsulta: result.provider, cnpjConsultaBemSucedida: false,
          cnpjConsultadoEm: new Date().toISOString(),
        }));
      }
    } catch {
      setLookupStatus("error");
      setLookupError("Erro ao consultar CNPJ. Verifique sua conexão.");
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ClientFormData>) => {
      const payload = {
        ...data,
        cnpj: data.tipoPessoa === "juridica" && data.cnpj?.replace(/\D/g, "") ? data.cnpj : undefined,
        cpf: data.tipoPessoa === "fisica" ? data.cpf : undefined,
        cnpjConsultadoEm: data.cnpjConsultadoEm ? new Date(data.cnpjConsultadoEm) : undefined,
        regimeTributario: data.regimeTributario || undefined,
        origemLead: data.origemLead || undefined,
        prazosPagamentoId: data.prazosPagamentoId || undefined,
      };
      if (isEdit) return apiRequest("PATCH", `/api/clients/${id}`, payload).then((r) => r.json());
      return apiRequest("POST", "/api/clients", payload).then((r) => r.json());
    },
    onSuccess: (data: Client) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["/api/clients", id] });
      toast({ title: isEdit ? "Cliente atualizado." : "Cliente cadastrado." });
      setLocation(`/clients/${isEdit ? id : data.id}`);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razaoSocial.trim()) {
      toast({ title: isPF ? "Nome é obrigatório." : "Razão social é obrigatória.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  }

  if (isEdit && loadingClient) {
    return (
      <div className="p-6 space-y-3 max-w-5xl mx-auto">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[480px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-5 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
        <Link href="/clients" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Clientes
        </Link>
        {isEdit && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/clients/${id}`} className="hover:text-foreground">
              {existingClient?.nomeFantasia || existingClient?.razaoSocial}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{isEdit ? "Editar" : "Novo Cliente"}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border rounded-xl bg-card p-5 space-y-4">

          {/* Row 0: Tipo de Pessoa + CNPJ Lookup side by side */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0" data-testid="toggle-tipo-pessoa">
              <button
                type="button"
                onClick={() => { set("tipoPessoa", "juridica"); setLookupStatus("idle"); }}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !isPF ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                data-testid="button-tipo-juridica"
              >
                Pessoa Jurídica
              </button>
              <button
                type="button"
                onClick={() => { set("tipoPessoa", "fisica"); setLookupStatus("idle"); }}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isPF ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                }`}
                data-testid="button-tipo-fisica"
              >
                Pessoa Física
              </button>
            </div>

            {/* CNPJ / CPF inline */}
            {!isPF ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Input
                  value={cnpjInput}
                  onChange={(e) => {
                    const fmt = formatCnpjInput(e.target.value);
                    setCnpjInput(fmt);
                    set("cnpj", fmt);
                    setLookupStatus("idle");
                  }}
                  placeholder="CNPJ: 00.000.000/0000-00"
                  className={`${inputCls} font-mono w-52 flex-shrink-0`}
                  data-testid="input-cnpj"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCnpjLookup}
                  disabled={lookupStatus === "loading" || cnpjInput.replace(/\D/g, "").length !== 14}
                  className="h-8 px-3 text-xs flex-shrink-0"
                  data-testid="button-lookup-cnpj"
                >
                  {lookupStatus === "loading"
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Search className="w-3.5 h-3.5" />}
                  <span className="ml-1.5">{lookupStatus === "loading" ? "Buscando..." : "Consultar CNPJ"}</span>
                </Button>
                {lookupStatus === "success" && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {autoFilledFields.size} campos preenchidos
                  </span>
                )}
                {lookupStatus === "error" && (
                  <span className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {lookupError}
                  </span>
                )}
              </div>
            ) : (
              <Input
                value={form.cpf}
                onChange={(e) => set("cpf", e.target.value)}
                placeholder="CPF: 000.000.000-00"
                className={`${inputCls} font-mono w-48`}
                data-testid="input-client-cpf"
              />
            )}
          </div>

          <Separator />

          {/* Section: Dados Principais */}
          <SectionLabel icon={isPF ? User : Building2} title={isPF ? "Dados Pessoais" : "Dados Fiscais"} />
          {isPF ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input
                  value={form.razaoSocial}
                  onChange={(e) => set("razaoSocial", e.target.value)}
                  placeholder="Nome Completo *"
                  className={inputCls}
                  data-testid="input-razao-social"
                />
              </div>
              <Input
                value={form.nomeFantasia}
                onChange={(e) => set("nomeFantasia", e.target.value)}
                placeholder="Apelido / Nome Social"
                className={inputCls}
                data-testid="input-nome-fantasia"
              />
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12">
                <div className="relative">
                  <Input
                    value={form.razaoSocial}
                    onChange={(e) => set("razaoSocial", e.target.value)}
                    placeholder="Razão Social *"
                    className={inputCls}
                    data-testid="input-razao-social"
                  />
                  {autoFilledFields.has("razaoSocial") && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] py-0 h-4 no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Auto
                    </Badge>
                  )}
                </div>
              </div>
              <div className="col-span-5">
                <Input
                  value={form.nomeFantasia}
                  onChange={(e) => set("nomeFantasia", e.target.value)}
                  placeholder="Nome Fantasia"
                  className={inputCls}
                  data-testid="input-nome-fantasia"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={form.inscricaoEstadual}
                  onChange={(e) => set("inscricaoEstadual", e.target.value)}
                  placeholder="Inscrição Estadual"
                  className={inputCls}
                  data-testid="input-ie"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={form.inscricaoMunicipal}
                  onChange={(e) => set("inscricaoMunicipal", e.target.value)}
                  placeholder="Insc. Municipal"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={form.situacaoCadastral}
                  onChange={(e) => set("situacaoCadastral", e.target.value)}
                  placeholder="Situação"
                  className={inputCls}
                  data-testid="input-situacao"
                />
              </div>
              <div className="col-span-5">
                <Input
                  value={form.naturezaJuridica}
                  onChange={(e) => set("naturezaJuridica", e.target.value)}
                  placeholder="Natureza Jurídica"
                  className={inputCls}
                  data-testid="input-natureza"
                />
              </div>
              <div className="col-span-4">
                <Select value={form.regimeTributario || "none"} onValueChange={(v) => set("regimeTributario", v === "none" ? "" : v)}>
                  <SelectTrigger className={selectCls} data-testid="select-regime">
                    <SelectValue placeholder="Regime Tributário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Regime Tributário</SelectItem>
                    <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                    <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="lucro_real">Lucro Real</SelectItem>
                    <SelectItem value="mei">MEI</SelectItem>
                    <SelectItem value="isento">Isento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Input
                  type="date"
                  value={form.dataAbertura}
                  onChange={(e) => set("dataAbertura", e.target.value)}
                  placeholder="Data Abertura"
                  className={`${inputCls} text-muted-foreground`}
                  title="Data de Abertura"
                  data-testid="input-data-abertura"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Section: Endereço */}
          <SectionLabel icon={MapPin} title="Endereço" />
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-2">
              <Input
                value={form.cep}
                onChange={(e) => set("cep", e.target.value)}
                placeholder="CEP"
                className={inputCls}
                data-testid="input-cep"
              />
            </div>
            <div className="col-span-6">
              <Input
                value={form.logradouro}
                onChange={(e) => set("logradouro", e.target.value)}
                placeholder="Logradouro (Rua, Av...)"
                className={inputCls}
                data-testid="input-logradouro"
              />
            </div>
            <div className="col-span-2">
              <Input
                value={form.numero}
                onChange={(e) => set("numero", e.target.value)}
                placeholder="Número"
                className={inputCls}
                data-testid="input-numero"
              />
            </div>
            <div className="col-span-2">
              <Input
                value={form.complemento}
                onChange={(e) => set("complemento", e.target.value)}
                placeholder="Complemento"
                className={inputCls}
                data-testid="input-complemento"
              />
            </div>
            <div className="col-span-4">
              <Input
                value={form.bairro}
                onChange={(e) => set("bairro", e.target.value)}
                placeholder="Bairro"
                className={inputCls}
                data-testid="input-bairro"
              />
            </div>
            <div className="col-span-5">
              <Input
                value={form.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                placeholder="Cidade"
                className={inputCls}
                data-testid="input-cidade"
              />
            </div>
            <div className="col-span-3">
              <Input
                value={form.estado}
                onChange={(e) => set("estado", e.target.value)}
                placeholder="Estado (UF)"
                className={inputCls}
                data-testid="input-estado"
              />
            </div>
          </div>

          <Separator />

          {/* Section: Contato */}
          <SectionLabel icon={Phone} title="Contato" />
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3">
              <Input
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                placeholder="Telefone"
                className={inputCls}
                data-testid="input-telefone"
              />
            </div>
            <div className="col-span-3">
              <Input
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="WhatsApp"
                className={inputCls}
                data-testid="input-whatsapp"
              />
            </div>
            <div className="col-span-3">
              <Input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="E-mail"
                className={inputCls}
                data-testid="input-email"
              />
            </div>
            <div className="col-span-3">
              <Input
                value={form.site}
                onChange={(e) => set("site", e.target.value)}
                placeholder="Site"
                className={inputCls}
                data-testid="input-site"
              />
            </div>
            <div className="col-span-3">
              <Input
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="Instagram (@)"
                className={inputCls}
                data-testid="input-instagram"
              />
            </div>
          </div>

          <Separator />

          {/* Section: Comercial */}
          <SectionLabel icon={Tag} title="Comercial" />
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-2">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className={selectCls} data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Select value={form.origemLead || "none"} onValueChange={(v) => set("origemLead", v === "none" ? "" : v)}>
                <SelectTrigger className={selectCls} data-testid="select-origem">
                  <SelectValue placeholder="Origem do Lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Origem do Lead</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="prospeccao_ativa">Prospecção Ativa</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Input
                value={form.segmento}
                onChange={(e) => set("segmento", e.target.value)}
                placeholder="Segmento de atuação"
                className={inputCls}
                data-testid="input-segmento"
              />
            </div>
            <div className="col-span-2">
              <Select value={form.potencialCompra || "none"} onValueChange={(v) => set("potencialCompra", v === "none" ? "" : v)}>
                <SelectTrigger className={selectCls} data-testid="select-potencial">
                  <SelectValue placeholder="Potencial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Potencial</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Select value={form.prazosPagamentoId || "none"} onValueChange={(v) => set("prazosPagamentoId", v === "none" ? "" : v)}>
                <SelectTrigger className={selectCls} data-testid="select-prazo">
                  <SelectValue placeholder="Prazo de Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Prazo de Pagamento</SelectItem>
                  {paymentTermsList.filter(p => p.ativo).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Section: Observações */}
          <SectionLabel icon={FileText} title="Observações" />
          <Textarea
            value={form.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            placeholder="Observações gerais sobre o cliente..."
            className="text-sm placeholder:text-muted-foreground/50 min-h-[60px] resize-none"
            rows={2}
            data-testid="textarea-observacoes"
          />

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href={isEdit ? `/clients/${id}` : "/clients"}>Cancelar</Link>
            </Button>
            <Button type="submit" size="sm" disabled={saveMutation.isPending} data-testid="button-submit">
              {saveMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...</>
              ) : (
                isEdit ? "Salvar Alterações" : "Cadastrar Cliente"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
