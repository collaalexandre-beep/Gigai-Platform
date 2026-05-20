import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, Loader2, User, Phone, MapPin, Percent, CreditCard,
  Search, CheckCircle2, AlertCircle, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Seller, SellerBankAccount } from "@shared/schema";

interface SellerFormData {
  tipoPessoa: "fisica" | "juridica";
  nomeCompleto: string;
  nomeFantasia: string;
  cpf: string;
  cnpj: string;
  rg: string;
  dataNascimento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  cargo: string;
  funcao: string;
  dataEntrada: string;
  status: string;
  percentualComissao: string;
  observacoes: string;
  autorizadoDirigir: boolean;
  autorizadoCompras: boolean;
  cnhCategoria: string;
  cnhValidade: string;
  cnhObservacoes: string;
  whatsappNumber: string;
}

interface BankFormData {
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: string;
  nomeFavorecido: string;
  documentoFavorecido: string;
  pixTipoChave: string;
  pixChave: string;
}

const emptySellerForm: SellerFormData = {
  tipoPessoa: "fisica",
  nomeCompleto: "", nomeFantasia: "", cpf: "", cnpj: "", rg: "", dataNascimento: "",
  telefone: "", whatsapp: "", email: "", instagram: "",
  logradouro: "", numero: "", complemento: "", bairro: "",
  cidade: "", estado: "", cep: "",
  cargo: "", funcao: "", dataEntrada: "", status: "ativo",
  percentualComissao: "", observacoes: "",
  autorizadoDirigir: false, autorizadoCompras: false,
  cnhCategoria: "", cnhValidade: "", cnhObservacoes: "",
  whatsappNumber: "",
};

const emptyBankForm: BankFormData = {
  banco: "", agencia: "", conta: "", tipoConta: "corrente",
  nomeFavorecido: "", documentoFavorecido: "", pixTipoChave: "", pixChave: "",
};

function FormField({ label, id, required, children }: {
  label: string; id: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

type LookupStatus = "idle" | "loading" | "success" | "error";

export default function SellerFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;

  const { data: existingData, isLoading } = useQuery<Seller & { bankAccounts: SellerBankAccount[] }>({
    queryKey: ["/api/sellers", id],
    queryFn: () => fetch(`/api/sellers/${id}`).then((r) => r.json()),
    enabled: isEdit,
  });

  const [form, setForm] = useState<SellerFormData>(emptySellerForm);
  const [bankForm, setBankForm] = useState<BankFormData>(emptyBankForm);
  const [addBankAccount, setAddBankAccount] = useState(false);

  const [cnpjInput, setCnpjInput] = useState("");
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [lookupError, setLookupError] = useState("");
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (existingData) {
      setForm({
        tipoPessoa: (existingData as any).tipoPessoa || "fisica",
        nomeCompleto: existingData.nomeCompleto || "",
        nomeFantasia: (existingData as any).nomeFantasia || "",
        cpf: existingData.cpf || "",
        cnpj: (existingData as any).cnpj || "",
        rg: existingData.rg || "",
        dataNascimento: existingData.dataNascimento || "",
        telefone: existingData.telefone || "",
        whatsapp: existingData.whatsapp || "",
        email: existingData.email || "",
        instagram: existingData.instagram || "",
        logradouro: existingData.logradouro || "",
        numero: existingData.numero || "",
        complemento: existingData.complemento || "",
        bairro: existingData.bairro || "",
        cidade: existingData.cidade || "",
        estado: existingData.estado || "",
        cep: existingData.cep || "",
        cargo: existingData.cargo || "",
        funcao: (existingData as any).funcao || "",
        dataEntrada: existingData.dataEntrada || "",
        status: existingData.status || "ativo",
        percentualComissao: existingData.percentualComissao || "",
        observacoes: existingData.observacoes || "",
        autorizadoDirigir: (existingData as any).autorizadoDirigir ?? false,
        autorizadoCompras: (existingData as any).autorizadoCompras ?? false,
        cnhCategoria: (existingData as any).cnhCategoria || "",
        cnhValidade: (existingData as any).cnhValidade || "",
        cnhObservacoes: (existingData as any).cnhObservacoes || "",
        whatsappNumber: (existingData as any).whatsappNumber || "",
      });
      setCnpjInput((existingData as any).cnpj || "");
      if (existingData.bankAccounts?.[0]) {
        const acc = existingData.bankAccounts[0];
        setBankForm({
          banco: acc.banco || "",
          agencia: acc.agencia || "",
          conta: acc.conta || "",
          tipoConta: acc.tipoConta || "corrente",
          nomeFavorecido: acc.nomeFavorecido || "",
          documentoFavorecido: acc.documentoFavorecido || "",
          pixTipoChave: acc.pixTipoChave || "",
          pixChave: acc.pixChave || "",
        });
        setAddBankAccount(true);
      }
    }
  }, [existingData]);

  const set = (f: keyof SellerFormData, v: string | boolean) => setForm((p) => ({ ...p, [f]: v }));
  const setBank = (f: keyof BankFormData, v: string) => setBankForm((p) => ({ ...p, [f]: v }));

  const isPF = form.tipoPessoa === "fisica";

  function formatCnpj(value: string): string {
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
        const updates: Partial<SellerFormData> = {};
        const fieldMap: Record<string, string | undefined> = {
          nomeCompleto: d.razaoSocial,
          nomeFantasia: d.nomeFantasia,
          logradouro: d.logradouro,
          numero: d.numero,
          bairro: d.bairro,
          cidade: d.cidade,
          estado: d.estado,
          cep: d.cep,
          telefone: d.telefone,
          email: d.email,
        };
        for (const [key, value] of Object.entries(fieldMap)) {
          if (value) { (updates as any)[key] = value; newFields.add(key); }
        }
        setForm((prev) => ({ ...prev, ...updates, cnpj: formatCnpj(clean) }));
        setAutoFilledFields(newFields);
        setLookupStatus("success");
        toast({ title: `Dados obtidos via ${result.provider}` });
      } else {
        setLookupStatus("error");
        setLookupError(result.error || "CNPJ não encontrado.");
        setForm((prev) => ({ ...prev, cnpj: formatCnpj(clean) }));
      }
    } catch {
      setLookupStatus("error");
      setLookupError("Erro ao consultar CNPJ. Verifique sua conexão.");
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (data: SellerFormData) => {
      const payload = {
        ...data,
        percentualComissao: data.percentualComissao || undefined,
        funcao: data.funcao || undefined,
        cpf: isPF ? data.cpf : undefined,
        cnpj: !isPF ? data.cnpj : undefined,
        rg: isPF ? data.rg : undefined,
        dataNascimento: isPF ? data.dataNascimento : undefined,
      };
      let seller: Seller;
      if (isEdit) {
        const r = await apiRequest("PATCH", `/api/sellers/${id}`, payload);
        seller = await r.json();
      } else {
        const r = await apiRequest("POST", "/api/sellers", payload);
        seller = await r.json();
      }

      if (addBankAccount && bankForm.banco) {
        if (isEdit && existingData?.bankAccounts?.[0]) {
          await apiRequest("PATCH", `/api/bank-accounts/${existingData.bankAccounts[0].id}`, bankForm);
        } else {
          await apiRequest("POST", `/api/sellers/${seller.id}/bank-accounts`, bankForm);
        }
      }

      return seller;
    },
    onSuccess: (seller: Seller) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["/api/sellers", id] });
      toast({ title: isEdit ? "Membro atualizado." : "Membro cadastrado com sucesso." });
      setLocation(`/sellers/${isEdit ? id : seller.id}`);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nomeCompleto.trim()) {
      toast({ title: isPF ? "Nome completo é obrigatório." : "Razão social é obrigatória.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  }

  if (isEdit && isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/sellers" className="flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Equipe
        </Link>
        {isEdit && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/sellers/${id}`} className="text-muted-foreground">
              {existingData?.nomeCompleto}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground">{isEdit ? "Editar" : "Novo Membro"}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Editar Membro" : "Novo Membro da Equipe"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Tipo de Pessoa Toggle */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">Tipo de cadastro:</span>
              <div className="flex rounded-lg border border-border overflow-hidden" data-testid="toggle-seller-tipo">
                <button
                  type="button"
                  onClick={() => { set("tipoPessoa", "fisica"); setLookupStatus("idle"); }}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    isPF
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid="button-seller-tipo-fisica"
                >
                  Pessoa Física
                </button>
                <button
                  type="button"
                  onClick={() => { set("tipoPessoa", "juridica"); setLookupStatus("idle"); }}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    !isPF
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid="button-seller-tipo-juridica"
                >
                  Pessoa Jurídica
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CNPJ Lookup — only for PJ */}
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
                <Input
                  value={cnpjInput}
                  onChange={(e) => {
                    const fmt = formatCnpj(e.target.value);
                    setCnpjInput(fmt);
                    set("cnpj", fmt);
                    setLookupStatus("idle");
                  }}
                  placeholder="00.000.000/0000-00"
                  className="font-mono max-w-xs"
                  data-testid="input-seller-cnpj"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCnpjLookup}
                  disabled={lookupStatus === "loading" || cnpjInput.replace(/\D/g, "").length !== 14}
                  data-testid="button-seller-lookup-cnpj"
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
                  <span>Dados preenchidos automaticamente</span>
                  <Badge variant="secondary" className="text-xs no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {autoFilledFields.size} campos
                  </Badge>
                </div>
              )}
              {lookupStatus === "error" && (
                <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{lookupError}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dados Pessoais / Empresa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {isPF ? <User className="w-4 h-4 text-muted-foreground" /> : <Building2 className="w-4 h-4 text-muted-foreground" />}
              {isPF ? "Dados Pessoais" : "Dados da Empresa"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FormField label={isPF ? "Nome Completo" : "Razão Social"} id="nomeCompleto" required>
                  <div className="relative">
                    <Input
                      id="nomeCompleto"
                      value={form.nomeCompleto}
                      onChange={(e) => set("nomeCompleto", e.target.value)}
                      placeholder={isPF ? "Nome completo do vendedor" : "Razão social da empresa"}
                      data-testid="input-seller-nome"
                    />
                    {!isPF && autoFilledFields.has("nomeCompleto") && (
                      <Badge className="absolute right-2 top-1/2 -translate-y-1/2 text-xs no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Auto
                      </Badge>
                    )}
                  </div>
                </FormField>
              </div>

              {isPF ? (
                <>
                  <FormField label="CPF" id="cpf">
                    <Input
                      id="cpf"
                      value={form.cpf}
                      onChange={(e) => set("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      className="font-mono"
                      data-testid="input-seller-cpf"
                    />
                  </FormField>
                  <FormField label="RG" id="rg">
                    <Input
                      id="rg"
                      value={form.rg}
                      onChange={(e) => set("rg", e.target.value)}
                      placeholder="RG do vendedor"
                      data-testid="input-seller-rg"
                    />
                  </FormField>
                  <FormField label="Data de Nascimento" id="dataNascimento">
                    <Input
                      id="dataNascimento"
                      type="date"
                      value={form.dataNascimento}
                      onChange={(e) => set("dataNascimento", e.target.value)}
                      data-testid="input-seller-nascimento"
                    />
                  </FormField>
                  <FormField label="Instagram" id="instagram">
                    <Input
                      id="instagram"
                      value={form.instagram}
                      onChange={(e) => set("instagram", e.target.value)}
                      placeholder="@usuario"
                      data-testid="input-seller-instagram"
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Nome Fantasia" id="nomeFantasia">
                    <Input
                      id="nomeFantasia"
                      value={form.nomeFantasia}
                      onChange={(e) => set("nomeFantasia", e.target.value)}
                      placeholder="Nome fantasia ou marca"
                      data-testid="input-seller-fantasia"
                    />
                  </FormField>
                  <FormField label="Instagram" id="instagram">
                    <Input
                      id="instagram"
                      value={form.instagram}
                      onChange={(e) => set("instagram", e.target.value)}
                      placeholder="@empresa"
                      data-testid="input-seller-instagram"
                    />
                  </FormField>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Telefone" id="telefone">
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => set("telefone", e.target.value)}
                  placeholder="(11) 99999-9999"
                  data-testid="input-seller-telefone"
                />
              </FormField>
              <FormField label="WhatsApp" id="whatsapp">
                <Input
                  id="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="(11) 99999-9999"
                  data-testid="input-seller-whatsapp"
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="E-mail" id="email">
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="vendedor@empresa.com.br"
                    data-testid="input-seller-email"
                  />
                </FormField>
              </div>
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
                    placeholder="Rua..."
                    data-testid="input-seller-logradouro"
                  />
                </FormField>
              </div>
              <FormField label="Número" id="numero">
                <Input
                  id="numero"
                  value={form.numero}
                  onChange={(e) => set("numero", e.target.value)}
                  placeholder="123"
                  data-testid="input-seller-numero"
                />
              </FormField>
              <FormField label="Bairro" id="bairro">
                <Input id="bairro" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="Bairro" />
              </FormField>
              <FormField label="Cidade" id="cidade">
                <Input id="cidade" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Cidade" />
              </FormField>
              <FormField label="Estado" id="estado">
                <Input id="estado" value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} className="uppercase" />
              </FormField>
              <FormField label="CEP" id="cep">
                <Input id="cep" value={form.cep} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" className="font-mono" />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Dados Comerciais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              Dados na Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Função" id="funcao">
                <Select value={form.funcao || ""} onValueChange={(v) => set("funcao", v)}>
                  <SelectTrigger data-testid="select-seller-funcao">
                    <SelectValue placeholder="Selecione a função..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="serralheiro">Serralheiro</SelectItem>
                    <SelectItem value="instalador">Instalador</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="motorista">Motorista</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Cargo / Título" id="cargo">
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={(e) => set("cargo", e.target.value)}
                  placeholder="Ex: Consultor Sênior, Gerente..."
                  data-testid="input-seller-cargo"
                />
              </FormField>
              <FormField label="Data de Entrada" id="dataEntrada">
                <Input
                  id="dataEntrada"
                  type="date"
                  value={form.dataEntrada}
                  onChange={(e) => set("dataEntrada", e.target.value)}
                  data-testid="input-seller-entrada"
                />
              </FormField>
              <FormField label="Status" id="status">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger data-testid="select-seller-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="% Comissão Padrão" id="comissao">
                <Input
                  id="comissao"
                  value={form.percentualComissao}
                  onChange={(e) => set("percentualComissao", e.target.value)}
                  placeholder="5.00"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  data-testid="input-seller-comissao"
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Observações Internas" id="observacoes">
                  <Textarea
                    id="observacoes"
                    value={form.observacoes}
                    onChange={(e) => set("observacoes", e.target.value)}
                    rows={2}
                    placeholder="Observações sobre o vendedor..."
                    data-testid="input-seller-obs"
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Habilitação / Motorista */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>🚗</span>
              Habilitação e Motorista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autorizadoDirigir"
                  checked={form.autorizadoDirigir}
                  onChange={(e) => set("autorizadoDirigir", e.target.checked)}
                  className="w-4 h-4 rounded"
                  data-testid="checkbox-autorizado-dirigir"
                />
                <Label htmlFor="autorizadoDirigir" className="text-sm cursor-pointer">
                  Motorista autorizado a conduzir veículos da empresa
                </Label>
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autorizadoCompras"
                  checked={form.autorizadoCompras}
                  onChange={(e) => set("autorizadoCompras", e.target.checked)}
                  className="w-4 h-4 rounded"
                  data-testid="checkbox-autorizado-compras"
                />
                <Label htmlFor="autorizadoCompras" className="text-sm cursor-pointer">
                  Autorizado a solicitar compras
                </Label>
              </div>
              <div className="md:col-span-2">
                <FormField label="Número WhatsApp (Bot de Frota)" id="whatsappNumber">
                  <div className="space-y-1">
                    <Input
                      id="whatsappNumber"
                      value={form.whatsappNumber}
                      onChange={(e) => set("whatsappNumber", e.target.value.replace(/\D/g, ""))}
                      placeholder="Ex: 5531999990000 (só números, com DDI e DDD)"
                      data-testid="input-whatsapp-number"
                    />
                    <p className="text-xs text-muted-foreground">
                      Número usado pelo funcionário para enviar mensagens ao bot de controle de frota. Informe exatamente como aparece no WhatsApp Business (DDI + DDD + número, sem espaços ou traços). Ex: 5531999990000
                    </p>
                  </div>
                </FormField>
              </div>
              <FormField label="Categoria da CNH" id="cnhCategoria">
                <Select value={form.cnhCategoria} onValueChange={(v) => set("cnhCategoria", v)}>
                  <SelectTrigger data-testid="select-cnh-categoria">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A (moto)</SelectItem>
                    <SelectItem value="B">B (carro)</SelectItem>
                    <SelectItem value="AB">AB (moto + carro)</SelectItem>
                    <SelectItem value="C">C (veículo de carga)</SelectItem>
                    <SelectItem value="D">D (passageiros)</SelectItem>
                    <SelectItem value="E">E (carreta)</SelectItem>
                    <SelectItem value="ACC">ACC (veículo ciclomotor)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Validade da CNH" id="cnhValidade">
                <Input
                  id="cnhValidade"
                  type="date"
                  value={form.cnhValidade}
                  onChange={(e) => set("cnhValidade", e.target.value)}
                  data-testid="input-cnh-validade"
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Observações da CNH / Motorista" id="cnhObservacoes">
                  <Textarea
                    id="cnhObservacoes"
                    value={form.cnhObservacoes}
                    onChange={(e) => set("cnhObservacoes", e.target.value)}
                    rows={2}
                    placeholder="Ex: Restrições, observações sobre a habilitação..."
                    data-testid="input-cnh-obs"
                  />
                </FormField>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados Bancários */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Dados Bancários
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddBankAccount(!addBankAccount)}
                data-testid="button-toggle-bank"
              >
                {addBankAccount ? "Remover dados bancários" : "Adicionar dados bancários"}
              </Button>
            </div>
          </CardHeader>
          {addBankAccount && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Banco" id="banco">
                  <Input id="banco" value={bankForm.banco} onChange={(e) => setBank("banco", e.target.value)} placeholder="Ex: Itaú, Bradesco, Nubank..." data-testid="input-bank-banco" />
                </FormField>
                <FormField label="Tipo de Conta" id="tipoConta">
                  <Select value={bankForm.tipoConta} onValueChange={(v) => setBank("tipoConta", v)}>
                    <SelectTrigger data-testid="select-bank-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Conta Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Agência" id="agencia">
                  <Input id="agencia" value={bankForm.agencia} onChange={(e) => setBank("agencia", e.target.value)} placeholder="0000" className="font-mono" data-testid="input-bank-agencia" />
                </FormField>
                <FormField label="Conta" id="conta">
                  <Input id="conta" value={bankForm.conta} onChange={(e) => setBank("conta", e.target.value)} placeholder="00000-0" className="font-mono" data-testid="input-bank-conta" />
                </FormField>
                <FormField label="Nome Favorecido" id="nomeFavorecido">
                  <Input id="nomeFavorecido" value={bankForm.nomeFavorecido} onChange={(e) => setBank("nomeFavorecido", e.target.value)} placeholder="Nome completo" data-testid="input-bank-favorecido" />
                </FormField>
                <FormField label="Documento Favorecido" id="docFavorecido">
                  <Input id="docFavorecido" value={bankForm.documentoFavorecido} onChange={(e) => setBank("documentoFavorecido", e.target.value)} placeholder="CPF ou CNPJ" className="font-mono" data-testid="input-bank-doc" />
                </FormField>

                <Separator className="md:col-span-2" />

                <FormField label="Tipo de Chave Pix" id="pixTipo">
                  <Select value={bankForm.pixTipoChave || "none"} onValueChange={(v) => setBank("pixTipoChave", v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="select-pix-tipo">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem Pix</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="chave_aleatoria">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                {bankForm.pixTipoChave && bankForm.pixTipoChave !== "none" && (
                  <FormField label="Chave Pix" id="pixChave">
                    <Input id="pixChave" value={bankForm.pixChave} onChange={(e) => setBank("pixChave", e.target.value)} placeholder="Sua chave Pix" data-testid="input-pix-chave" />
                  </FormField>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href={isEdit ? `/sellers/${id}` : "/sellers"}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-seller">
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Salvando...</>
            ) : isEdit ? "Salvar alterações" : "Cadastrar membro"}
          </Button>
        </div>
      </form>
    </div>
  );
}
