import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, Search, Loader2, CheckCircle2, AlertCircle, ChevronRight,
  Building2, MapPin, Phone, Globe, Tag, FileText, User,
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

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <Separator className="flex-1" />
    </div>
  );
}

function FormField({
  label, id, required, children, hint,
}: {
  label: string;
  id: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

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
          razaoSocial: d.razaoSocial,
          nomeFantasia: d.nomeFantasia,
          inscricaoEstadual: d.inscricaoEstadual,
          situacaoCadastral: d.situacaoCadastral,
          dataAbertura: d.dataAbertura,
          naturezaJuridica: d.naturezaJuridica,
          logradouro: d.logradouro,
          numero: d.numero,
          complemento: d.complemento,
          bairro: d.bairro,
          cidade: d.cidade,
          estado: d.estado,
          cep: d.cep,
          telefone: d.telefone,
          email: d.email,
        };

        for (const [key, value] of Object.entries(fieldMap)) {
          if (value) {
            (updates as any)[key] = value;
            newFields.add(key);
          }
        }

        setForm((prev) => ({
          ...prev,
          ...updates,
          cnpj: formatCnpjInput(clean),
          cnpjFonteConsulta: result.provider,
          cnpjConsultaBemSucedida: true,
          cnpjConsultadoEm: new Date().toISOString(),
        }));
        setAutoFilledFields(newFields);
        setLookupStatus("success");
        toast({ title: `Dados obtidos via ${result.provider}` });
      } else {
        setLookupStatus("error");
        setLookupError(result.error || "CNPJ não encontrado.");
        setForm((prev) => ({
          ...prev,
          cnpj: formatCnpjInput(clean),
          cnpjFonteConsulta: result.provider,
          cnpjConsultaBemSucedida: false,
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
      if (isEdit) {
        return apiRequest("PATCH", `/api/clients/${id}`, payload).then((r) => r.json());
      } else {
        return apiRequest("POST", "/api/clients", payload).then((r) => r.json());
      }
    },
    onSuccess: (data: Client) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", id] });
      }
      toast({
        title: isEdit ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.",
      });
      setLocation(`/clients/${isEdit ? id : data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: `Erro: ${err.message}`, variant: "destructive" });
    },
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
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/clients" className="flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Clientes
        </Link>
        {isEdit && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/clients/${id}`} className="text-muted-foreground">
              {existingClient?.nomeFantasia || existingClient?.razaoSocial}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground">{isEdit ? "Editar" : "Novo Cliente"}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Editar Cliente" : "Novo Cliente"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isEdit ? "Atualize os dados do cliente" : "Preencha os dados para cadastrar um novo cliente"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo de Pessoa Toggle */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Tipo de cadastro:</span>
              <div className="flex rounded-lg border border-border overflow-hidden" data-testid="toggle-tipo-pessoa">
                <button
                  type="button"
                  onClick={() => { set("tipoPessoa", "juridica"); setLookupStatus("idle"); }}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    !isPF
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid="button-tipo-juridica"
                >
                  Pessoa Jurídica
                </button>
                <button
                  type="button"
                  onClick={() => { set("tipoPessoa", "fisica"); setLookupStatus("idle"); }}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    isPF
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid="button-tipo-fisica"
                >
                  Pessoa Física
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CNPJ Lookup Card — only for PJ */}
        {!isPF && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                Busca por CNPJ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Input
                    value={cnpjInput}
                    onChange={(e) => {
                      const fmt = formatCnpjInput(e.target.value);
                      setCnpjInput(fmt);
                      set("cnpj", fmt);
                      setLookupStatus("idle");
                    }}
                    placeholder="00.000.000/0000-00"
                    className="font-mono"
                    data-testid="input-cnpj"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCnpjLookup}
                  disabled={lookupStatus === "loading" || cnpjInput.replace(/\D/g, "").length !== 14}
                  data-testid="button-lookup-cnpj"
                >
                  {lookupStatus === "loading" ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-1.5" />
                  )}
                  {lookupStatus === "loading" ? "Consultando..." : "Consultar"}
                </Button>
              </div>

              {lookupStatus === "success" && (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dados obtidos automaticamente via <strong>{form.cnpjFonteConsulta}</strong></span>
                  <Badge variant="secondary" className="text-xs no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {autoFilledFields.size} campos preenchidos
                  </Badge>
                </div>
              )}
              {lookupStatus === "error" && (
                <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{lookupError} Você pode preencher os dados manualmente.</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Digite o CNPJ para buscar automaticamente os dados da empresa
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dados Principais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {isPF ? <User className="w-4 h-4 text-muted-foreground" /> : <Building2 className="w-4 h-4 text-muted-foreground" />}
              {isPF ? "Dados Pessoais" : "Dados Fiscais"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isPF ? (
                <>
                  <div className="md:col-span-2">
                    <FormField label="Nome Completo" id="razaoSocial" required>
                      <Input
                        id="razaoSocial"
                        value={form.razaoSocial}
                        onChange={(e) => set("razaoSocial", e.target.value)}
                        placeholder="Nome completo do cliente"
                        data-testid="input-razao-social"
                      />
                    </FormField>
                  </div>
                  <FormField label="Apelido / Nome Social" id="nomeFantasia">
                    <Input
                      id="nomeFantasia"
                      value={form.nomeFantasia}
                      onChange={(e) => set("nomeFantasia", e.target.value)}
                      placeholder="Como é conhecido"
                      data-testid="input-nome-fantasia"
                    />
                  </FormField>
                  <FormField label="CPF" id="cpf">
                    <Input
                      id="cpf"
                      value={form.cpf}
                      onChange={(e) => set("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      className="font-mono"
                      data-testid="input-client-cpf"
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <FormField label="Razão Social" id="razaoSocial" required>
                      <div className="relative">
                        <Input
                          id="razaoSocial"
                          value={form.razaoSocial}
                          onChange={(e) => set("razaoSocial", e.target.value)}
                          placeholder="Razão Social da empresa"
                          data-testid="input-razao-social"
                        />
                        {autoFilledFields.has("razaoSocial") && (
                          <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-xs no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Auto
                          </Badge>
                        )}
                      </div>
                    </FormField>
                  </div>
                  <FormField label="Nome Fantasia" id="nomeFantasia">
                    <Input
                      id="nomeFantasia"
                      value={form.nomeFantasia}
                      onChange={(e) => set("nomeFantasia", e.target.value)}
                      placeholder="Como a empresa é conhecida"
                      data-testid="input-nome-fantasia"
                    />
                  </FormField>
                  <FormField label="Inscrição Estadual" id="inscricaoEstadual">
                    <Input
                      id="inscricaoEstadual"
                      value={form.inscricaoEstadual}
                      onChange={(e) => set("inscricaoEstadual", e.target.value)}
                      placeholder="IE da empresa"
                      data-testid="input-ie"
                    />
                  </FormField>
                  <FormField label="Situação Cadastral" id="situacaoCadastral">
                    <Input
                      id="situacaoCadastral"
                      value={form.situacaoCadastral}
                      onChange={(e) => set("situacaoCadastral", e.target.value)}
                      placeholder="ATIVA, BAIXADA..."
                      data-testid="input-situacao"
                    />
                  </FormField>
                  <FormField label="Data de Abertura" id="dataAbertura">
                    <Input
                      id="dataAbertura"
                      type="date"
                      value={form.dataAbertura}
                      onChange={(e) => set("dataAbertura", e.target.value)}
                      data-testid="input-data-abertura"
                    />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Natureza Jurídica" id="naturezaJuridica">
                      <Input
                        id="naturezaJuridica"
                        value={form.naturezaJuridica}
                        onChange={(e) => set("naturezaJuridica", e.target.value)}
                        placeholder="Ex: Sociedade Limitada"
                        data-testid="input-natureza"
                      />
                    </FormField>
                  </div>
                  <FormField label="Regime Tributário" id="regimeTributario">
                    <Select value={form.regimeTributario || "none"} onValueChange={(v) => set("regimeTributario", v === "none" ? "" : v)}>
                      <SelectTrigger id="regimeTributario" data-testid="select-regime">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não informado</SelectItem>
                        <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                        <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="lucro_real">Lucro Real</SelectItem>
                        <SelectItem value="mei">MEI</SelectItem>
                        <SelectItem value="isento">Isento</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <FormField label="Logradouro" id="logradouro">
                  <Input
                    id="logradouro"
                    value={form.logradouro}
                    onChange={(e) => set("logradouro", e.target.value)}
                    placeholder="Rua / Avenida..."
                    data-testid="input-logradouro"
                  />
                </FormField>
              </div>
              <FormField label="Número" id="numero">
                <Input
                  id="numero"
                  value={form.numero}
                  onChange={(e) => set("numero", e.target.value)}
                  placeholder="123"
                  data-testid="input-numero"
                />
              </FormField>
              <FormField label="Complemento" id="complemento">
                <Input
                  id="complemento"
                  value={form.complemento}
                  onChange={(e) => set("complemento", e.target.value)}
                  placeholder="Sala, Andar..."
                  data-testid="input-complemento"
                />
              </FormField>
              <FormField label="Bairro" id="bairro">
                <Input
                  id="bairro"
                  value={form.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                  placeholder="Bairro"
                  data-testid="input-bairro"
                />
              </FormField>
              <FormField label="CEP" id="cep">
                <Input
                  id="cep"
                  value={form.cep}
                  onChange={(e) => set("cep", e.target.value)}
                  placeholder="00000-000"
                  className="font-mono"
                  data-testid="input-cep"
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Cidade" id="cidade">
                  <Input
                    id="cidade"
                    value={form.cidade}
                    onChange={(e) => set("cidade", e.target.value)}
                    placeholder="São Paulo"
                    data-testid="input-cidade"
                  />
                </FormField>
              </div>
              <FormField label="Estado (UF)" id="estado">
                <Input
                  id="estado"
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  maxLength={2}
                  className="uppercase"
                  data-testid="input-estado"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Informações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Telefone Principal" id="telefone">
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => set("telefone", e.target.value)}
                  placeholder="(11) 99999-9999"
                  data-testid="input-telefone"
                />
              </FormField>
              <FormField label="WhatsApp" id="whatsapp">
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="(11) 99999-9999"
                  data-testid="input-whatsapp"
                />
              </FormField>
              <FormField label="E-mail Principal" id="email">
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="contato@empresa.com.br"
                  data-testid="input-email"
                />
              </FormField>
              <FormField label="Site" id="site">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    id="site"
                    value={form.site}
                    onChange={(e) => set("site", e.target.value)}
                    placeholder="https://www.empresa.com.br"
                    className="pl-8"
                    data-testid="input-site"
                  />
                </div>
              </FormField>
              <FormField label="Instagram" id="instagram">
                <Input
                  id="instagram"
                  value={form.instagram}
                  onChange={(e) => set("instagram", e.target.value)}
                  placeholder="@empresa"
                  data-testid="input-instagram"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Classificação e CRM */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              Classificação e CRM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Status do Cliente" id="status">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger id="status" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Origem do Lead" id="origemLead">
                <Select value={form.origemLead || "none"} onValueChange={(v) => set("origemLead", v === "none" ? "" : v)}>
                  <SelectTrigger id="origemLead" data-testid="select-origem">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="prospeccao_ativa">Prospecção Ativa</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Potencial de Compra" id="potencialCompra">
                <Select value={form.potencialCompra || "none"} onValueChange={(v) => set("potencialCompra", v === "none" ? "" : v)}>
                  <SelectTrigger id="potencialCompra" data-testid="select-potencial">
                    <SelectValue placeholder="Não avaliado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não avaliado</SelectItem>
                    <SelectItem value="baixo">Baixo</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Prazo de Pagamento" id="prazosPagamentoId" hint="Será utilizado nos orçamentos e pedidos futuros">
                <Select value={form.prazosPagamentoId || "none"} onValueChange={(v) => set("prazosPagamentoId", v === "none" ? "" : v)}>
                  <SelectTrigger id="prazosPagamentoId" data-testid="select-prazo-pagamento">
                    <SelectValue placeholder="Selecione um prazo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não definido</SelectItem>
                    {(paymentTermsList as PaymentTerm[]).filter((t) => t.ativo).map((term) => (
                      <SelectItem key={term.id} value={term.id} data-testid={`option-prazo-${term.id}`}>
                        {term.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="md:col-span-3">
                <FormField label="Segmento" id="segmento">
                  <Input
                    id="segmento"
                    value={form.segmento}
                    onChange={(e) => set("segmento", e.target.value)}
                    placeholder="Ex: Varejo, Indústria, Saúde, Educação..."
                    data-testid="input-segmento"
                  />
                </FormField>
              </div>
              <div className="md:col-span-3">
                <FormField label="Observações Internas" id="observacoes">
                  <Textarea
                    id="observacoes"
                    value={form.observacoes}
                    onChange={(e) => set("observacoes", e.target.value)}
                    rows={3}
                    placeholder="Informações relevantes sobre o cliente para a equipe..."
                    data-testid="input-observacoes"
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href={isEdit ? `/clients/${id}` : "/clients"}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-client">
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Salvando...</>
            ) : isEdit ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </div>
      </form>
    </div>
  );
}
