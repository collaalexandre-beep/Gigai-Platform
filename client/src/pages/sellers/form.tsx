import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, Loader2, User, Phone, MapPin, Percent, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Seller, SellerBankAccount } from "@shared/schema";

interface SellerFormData {
  nomeCompleto: string;
  cpf: string;
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
  dataEntrada: string;
  status: string;
  percentualComissao: string;
  observacoes: string;
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
  nomeCompleto: "", cpf: "", rg: "", dataNascimento: "",
  telefone: "", whatsapp: "", email: "", instagram: "",
  logradouro: "", numero: "", complemento: "", bairro: "",
  cidade: "", estado: "", cep: "",
  cargo: "", dataEntrada: "", status: "ativo",
  percentualComissao: "", observacoes: "",
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

  useEffect(() => {
    if (existingData) {
      setForm({
        nomeCompleto: existingData.nomeCompleto || "",
        cpf: existingData.cpf || "",
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
        dataEntrada: existingData.dataEntrada || "",
        status: existingData.status || "ativo",
        percentualComissao: existingData.percentualComissao || "",
        observacoes: existingData.observacoes || "",
      });
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

  const set = (f: keyof SellerFormData, v: string) => setForm((p) => ({ ...p, [f]: v }));
  const setBank = (f: keyof BankFormData, v: string) => setBankForm((p) => ({ ...p, [f]: v }));

  const saveMutation = useMutation({
    mutationFn: async (data: SellerFormData) => {
      const payload = {
        ...data,
        percentualComissao: data.percentualComissao || undefined,
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
      toast({ title: isEdit ? "Vendedor atualizado." : "Vendedor cadastrado com sucesso." });
      setLocation(`/sellers/${isEdit ? id : seller.id}`);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nomeCompleto.trim()) {
      toast({ title: "Nome completo é obrigatório.", variant: "destructive" });
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
          Vendedores
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
        <span className="text-foreground">{isEdit ? "Editar" : "Novo Vendedor"}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "Editar Vendedor" : "Novo Vendedor"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FormField label="Nome Completo" id="nomeCompleto" required>
                  <Input
                    id="nomeCompleto"
                    value={form.nomeCompleto}
                    onChange={(e) => set("nomeCompleto", e.target.value)}
                    placeholder="Nome completo do vendedor"
                    data-testid="input-seller-nome"
                  />
                </FormField>
              </div>
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
              Dados Comerciais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Cargo" id="cargo">
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={(e) => set("cargo", e.target.value)}
                  placeholder="Consultor Comercial"
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
            ) : isEdit ? "Salvar alterações" : "Cadastrar vendedor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
