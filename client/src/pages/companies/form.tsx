import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, Loader2, Building2, MapPin, Phone,
  Globe, FileText, Image as ImageIcon, Lock, Upload, X, Star,
  Info, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";

type Tab = "informacoes" | "imagens" | "nota_fiscal";

interface CompanyForm {
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  suframa: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  endereco: string;
  numero: string;
  complemento: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  telefone: string;
  fax: string;
  site: string;
  email: string;
  status: string;
  isPadrao: boolean;
  logo: string;
  observacoes: string;
}

const emptyForm: CompanyForm = {
  codigo: "", razaoSocial: "", nomeFantasia: "", cnpj: "", suframa: "",
  inscricaoEstadual: "", inscricaoMunicipal: "", endereco: "", numero: "",
  complemento: "", cep: "", estado: "", cidade: "", bairro: "", telefone: "",
  fax: "", site: "", email: "", status: "ativa", isPadrao: false, logo: "",
  observacoes: "",
};

function toForm(c: Company): CompanyForm {
  return {
    codigo: c.codigo || "",
    razaoSocial: c.razaoSocial || "",
    nomeFantasia: c.nomeFantasia || "",
    cnpj: c.cnpj || "",
    suframa: c.suframa || "",
    inscricaoEstadual: c.inscricaoEstadual || "",
    inscricaoMunicipal: c.inscricaoMunicipal || "",
    endereco: c.endereco || "",
    numero: c.numero || "",
    complemento: c.complemento || "",
    cep: c.cep || "",
    estado: c.estado || "",
    cidade: c.cidade || "",
    bairro: c.bairro || "",
    telefone: c.telefone || "",
    fax: c.fax || "",
    site: c.site || "",
    email: c.email || "",
    status: c.status || "ativa",
    isPadrao: c.isPadrao ?? false,
    logo: c.logo || "",
    observacoes: c.observacoes || "",
  };
}

function formatCnpj(value: string): string {
  const c = value.replace(/\D/g, "").slice(0, 14);
  return c
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(value: string): string {
  const c = value.replace(/\D/g, "").slice(0, 11);
  if (c.length <= 10) {
    return c.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return c.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
}

function formatCep(value: string): string {
  const c = value.replace(/\D/g, "").slice(0, 8);
  return c.replace(/^(\d{5})(\d)/, "$1-$2");
}

function SectionLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
        {title}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

const inp = "h-8 text-sm placeholder:text-muted-foreground/50 bg-background";
const sel = "h-8 text-sm";

export default function CompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("informacoes");
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoError, setLogoError] = useState("");

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies", id],
    queryFn: () => fetch(`/api/companies/${id}`).then((r) => r.json()),
    enabled: isEdit,
  });

  useEffect(() => {
    if (company) {
      const f = toForm(company);
      setForm(f);
      if (f.logo) setLogoPreview(f.logo);
    }
  }, [company]);

  const set = (field: keyof CompanyForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: async (data: CompanyForm) => {
      const payload = {
        ...data,
        cnpj: data.cnpj.replace(/\D/g, "")
          ? data.cnpj
          : undefined,
        logo: data.logo || null,
        codigo: data.codigo || null,
      };
      if (isEdit) {
        return apiRequest("PATCH", `/api/companies/${id}`, payload).then((r) => r.json());
      }
      return apiRequest("POST", "/api/companies", payload).then((r) => r.json());
    },
    onSuccess: (data: Company) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ["/api/companies", id] });
      toast({ title: isEdit ? "Empresa atualizada." : "Empresa cadastrada com sucesso." });
      setLocation(`/companies/${isEdit ? id : data.id}/edit`);
    },
    onError: (err: Error) => {
      const msg = err.message.includes("CNPJ") ? "CNPJ já cadastrado" : err.message;
      toast({ title: `Erro: ${msg}`, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razaoSocial.trim()) {
      toast({ title: "Razão social é obrigatória.", variant: "destructive" });
      return;
    }
    if (!form.nomeFantasia.trim()) {
      toast({ title: "Nome fantasia é obrigatório.", variant: "destructive" });
      return;
    }
    if (!form.cnpj.replace(/\D/g, "")) {
      toast({ title: "CNPJ é obrigatório.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(form);
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError("");

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setLogoError("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setLogoError("Arquivo muito grande. Máximo 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      set("logo", result);
      toast({ title: "Logo carregada com sucesso." });
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview("");
    set("logo", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (isEdit && isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-5 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href="/companies" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="w-3.5 h-3.5" /> Empresas
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">
          {isEdit ? (company?.nomeFantasia || "Editar Empresa") : "Nova Empresa"}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b mb-0 pb-0">
          {[
            { key: "informacoes", label: "Informações", icon: Info, disabled: false },
            { key: "imagens", label: "Imagens", icon: ImageIcon, disabled: false },
            { key: "nota_fiscal", label: "Nota Fiscal", icon: FileText, disabled: true },
          ].map(({ key, label, icon: Icon, disabled }) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setTab(key as Tab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === key
                  ? "border-primary text-primary"
                  : disabled
                  ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {disabled && (
                <Badge variant="outline" className="text-[9px] py-0 h-4 ml-1 opacity-60">
                  Em breve
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* ─── TAB: INFORMAÇÕES ─────────────────────────────────────────────── */}
        {tab === "informacoes" && (
          <div className="border border-t-0 rounded-b-xl rounded-tr-xl bg-card p-5 space-y-4">

            {/* Código + Status + Padrão */}
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Input
                  value={form.codigo}
                  onChange={(e) => set("codigo", e.target.value)}
                  placeholder="Código (opcional)"
                  className={inp}
                  data-testid="input-codigo"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger className={`${sel} w-32`} data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="isPadrao"
                  checked={form.isPadrao}
                  onCheckedChange={(v) => set("isPadrao", v)}
                  data-testid="switch-padrao"
                />
                <Label htmlFor="isPadrao" className="text-sm flex items-center gap-1.5 cursor-pointer">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  Empresa padrão
                </Label>
              </div>
            </div>

            <Separator />

            {/* Dados Principais */}
            <SectionLabel icon={Building2} title="Dados da Empresa" />
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-7">
                <Input
                  value={form.razaoSocial}
                  onChange={(e) => set("razaoSocial", e.target.value)}
                  placeholder="Razão Social *"
                  className={inp}
                  data-testid="input-razao-social"
                />
              </div>
              <div className="col-span-5">
                <Input
                  value={form.nomeFantasia}
                  onChange={(e) => set("nomeFantasia", e.target.value)}
                  placeholder="Nome Fantasia *"
                  className={inp}
                  data-testid="input-nome-fantasia"
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={form.cnpj}
                  onChange={(e) => set("cnpj", formatCnpj(e.target.value))}
                  placeholder="CNPJ *"
                  className={`${inp} font-mono`}
                  data-testid="input-cnpj"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={form.inscricaoEstadual}
                  onChange={(e) => set("inscricaoEstadual", e.target.value)}
                  placeholder="Inscrição Estadual"
                  className={inp}
                  data-testid="input-ie"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={form.inscricaoMunicipal}
                  onChange={(e) => set("inscricaoMunicipal", e.target.value)}
                  placeholder="Inscrição Municipal"
                  className={inp}
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={form.suframa}
                  onChange={(e) => set("suframa", e.target.value)}
                  placeholder="SUFRAMA"
                  className={inp}
                />
              </div>
            </div>

            <Separator />

            {/* Endereço */}
            <SectionLabel icon={MapPin} title="Endereço" />
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <Input
                  value={form.cep}
                  onChange={(e) => set("cep", formatCep(e.target.value))}
                  placeholder="CEP"
                  className={inp}
                  data-testid="input-cep"
                />
              </div>
              <div className="col-span-6">
                <Input
                  value={form.endereco}
                  onChange={(e) => set("endereco", e.target.value)}
                  placeholder="Endereço (Rua, Av...)"
                  className={inp}
                  data-testid="input-endereco"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={form.numero}
                  onChange={(e) => set("numero", e.target.value)}
                  placeholder="Número"
                  className={inp}
                  data-testid="input-numero"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={form.complemento}
                  onChange={(e) => set("complemento", e.target.value)}
                  placeholder="Complemento"
                  className={inp}
                />
              </div>
              <div className="col-span-4">
                <Input
                  value={form.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                  placeholder="Bairro"
                  className={inp}
                  data-testid="input-bairro"
                />
              </div>
              <div className="col-span-5">
                <Input
                  value={form.cidade}
                  onChange={(e) => set("cidade", e.target.value)}
                  placeholder="Cidade"
                  className={inp}
                  data-testid="input-cidade"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="UF"
                  className={inp}
                  data-testid="input-estado"
                />
              </div>
            </div>

            <Separator />

            {/* Contato */}
            <SectionLabel icon={Phone} title="Contato" />
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <Input
                  value={form.telefone}
                  onChange={(e) => set("telefone", formatPhone(e.target.value))}
                  placeholder="Telefone"
                  className={inp}
                  data-testid="input-telefone"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={form.fax}
                  onChange={(e) => set("fax", e.target.value)}
                  placeholder="Fax"
                  className={inp}
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="E-mail"
                  className={inp}
                  data-testid="input-email"
                />
              </div>
              <div className="col-span-3">
                <Input
                  value={form.site}
                  onChange={(e) => set("site", e.target.value)}
                  placeholder="Site"
                  className={inp}
                  data-testid="input-site"
                />
              </div>
            </div>

            <Separator />

            {/* Observações */}
            <SectionLabel icon={Globe} title="Observações Internas" />
            <Textarea
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              placeholder="Anotações internas sobre esta empresa..."
              className="text-sm placeholder:text-muted-foreground/50 min-h-[56px] resize-none"
              rows={2}
              data-testid="textarea-observacoes"
            />

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">* Campos obrigatórios</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href="/companies">Cancelar</Link>
                </Button>
                <Button type="submit" size="sm" disabled={saveMutation.isPending} data-testid="button-submit">
                  {saveMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...</>
                  ) : (
                    isEdit ? "Salvar Alterações" : "Cadastrar Empresa"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: IMAGENS ─────────────────────────────────────────────────── */}
        {tab === "imagens" && (
          <div className="border border-t-0 rounded-b-xl rounded-tr-xl bg-card p-6 space-y-6">
            <div className="max-w-lg mx-auto">
              <h2 className="text-sm font-semibold mb-1">Logo da Empresa</h2>
              <p className="text-xs text-muted-foreground mb-5">
                A logo é utilizada em cabeçalhos de orçamentos, pedidos e documentos. Formatos aceitos:
                JPG, PNG, WEBP. Tamanho máximo: 3 MB.
              </p>

              {/* Preview */}
              <div className="relative flex items-center justify-center border-2 border-dashed rounded-xl bg-muted/30 h-48 mb-4 overflow-hidden">
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-h-40 max-w-full object-contain"
                      data-testid="img-logo-preview"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                      data-testid="button-remove-logo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2">
                      <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Logo carregada
                      </Badge>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="w-12 h-12 text-muted-foreground/20" />
                    <p className="text-sm">Nenhuma logo cadastrada</p>
                    <p className="text-xs">Clique em "Enviar Logo" para adicionar</p>
                  </div>
                )}
              </div>

              {/* Error */}
              {logoError && (
                <p className="text-sm text-destructive mb-3">{logoError}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-logo"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {logoPreview ? "Trocar Logo" : "Enviar Logo"}
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" /> Remover
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleLogoFile}
                  data-testid="input-file-logo"
                />
              </div>

              <Separator className="my-6" />

              {/* Save button */}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href="/companies">Cancelar</Link>
                </Button>
                <Button type="submit" size="sm" disabled={saveMutation.isPending} data-testid="button-submit-images">
                  {saveMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...</>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: NOTA FISCAL (desabilitada) ──────────────────────────────── */}
        {tab === "nota_fiscal" && (
          <div className="border border-t-0 rounded-b-xl rounded-tr-xl bg-card p-12 flex flex-col items-center justify-center text-center">
            <Lock className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Em desenvolvimento</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
              A integração fiscal estará disponível em uma próxima versão. Fique atento às
              atualizações do sistema.
            </p>
            <Badge variant="outline" className="mt-4 text-xs">Em breve</Badge>
          </div>
        )}
      </form>
    </div>
  );
}
