import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, Pencil, Trash2, Users, Phone, Mail,
  MapPin, Calendar, Percent, CreditCard, Building, User, Car,
  FileText, Image, Upload, X, Download, Eye, Loader2, FilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Seller, SellerBankAccount, SellerDocument } from "@shared/schema";
import { format } from "date-fns";

const FUNCAO_LABELS: Record<string, string> = {
  vendedor: "Vendedor",
  serralheiro: "Serralheiro",
  instalador: "Instalador",
  financeiro: "Financeiro",
  diretor: "Diretor",
  motorista: "Motorista",
  administrativo: "Administrativo",
  tecnico: "Técnico",
  outro: "Outro",
};

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className={`text-sm text-foreground mt-0.5 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") return <FileText className="w-8 h-8 text-red-500" />;
  return <Image className="w-8 h-8 text-blue-500" />;
}

export default function SellerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docDescricao, setDocDescricao] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sellerData, isLoading } = useQuery<Seller & { bankAccounts: SellerBankAccount[] }>({
    queryKey: ["/api/sellers", id],
    queryFn: () => fetch(`/api/sellers/${id}`).then((r) => r.json()),
  });

  const { data: documents, isLoading: docsLoading } = useQuery<SellerDocument[]>({
    queryKey: ["/api/sellers", id, "documents"],
    queryFn: () => fetch(`/api/sellers/${id}/documents`).then((r) => r.json()),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/sellers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Membro removido." });
      setLocation("/sellers");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => apiRequest("DELETE", `/api/sellers/${id}/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers", id, "documents"] });
      toast({ title: "Documento removido." });
      setDeleteDocId(null);
    },
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      if (docDescricao) formData.append("descricao", docDescricao);
      const res = await fetch(`/api/sellers/${id}/documents`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      queryClient.invalidateQueries({ queryKey: ["/api/sellers", id, "documents"] });
      toast({ title: "Documento enviado com sucesso!" });
      setDocDescricao("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast({ title: "Erro ao enviar documento.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-screen-xl mx-auto">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!sellerData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Colaborador não encontrado.</p>
        <Button asChild className="mt-4"><Link href="/sellers">Voltar</Link></Button>
      </div>
    );
  }

  const seller = sellerData;
  const funcaoLabel = (seller as any).funcao ? FUNCAO_LABELS[(seller as any).funcao] : null;

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/sellers" className="flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Equipe
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{seller.nomeCompleto}</span>
      </div>

      {/* Header */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{seller.nomeCompleto}</h1>
                <StatusBadge value={seller.status} type="seller" />
                {funcaoLabel && (
                  <Badge variant="secondary" data-testid="badge-funcao">{funcaoLabel}</Badge>
                )}
              </div>
              {seller.cargo && (
                <p className="text-sm text-muted-foreground mt-0.5">{seller.cargo}</p>
              )}
              <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
                {seller.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />{seller.email}
                  </span>
                )}
                {seller.telefone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />{seller.telefone}
                  </span>
                )}
                {seller.percentualComissao && (
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Percent className="w-3.5 h-3.5" />{seller.percentualComissao}% de comissão
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" data-testid="button-edit-seller">
              <Link href={`/sellers/${id}/edit`}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Editar
              </Link>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive"
              onClick={() => setDeleteDialog(true)}
              data-testid="button-delete-seller"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <InfoRow label="CPF" value={seller.cpf} mono />
              <InfoRow label="RG" value={seller.rg} />
              <InfoRow label="Data de Nascimento" value={
                seller.dataNascimento
                  ? format(new Date(seller.dataNascimento + "T00:00:00"), "dd/MM/yyyy")
                  : null
              } />
              <InfoRow label="Instagram" value={seller.instagram} />
              <InfoRow label="Telefone" value={seller.telefone} />
              <InfoRow label="WhatsApp" value={seller.whatsapp} />
              <div className="col-span-2">
                <InfoRow label="E-mail" value={seller.email} />
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Dados na Empresa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              Dados na Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              {funcaoLabel && (
                <InfoRow label="Função" value={funcaoLabel} />
              )}
              <InfoRow label="Cargo / Título" value={seller.cargo} />
              <InfoRow label="Data de Entrada" value={
                seller.dataEntrada
                  ? format(new Date(seller.dataEntrada + "T00:00:00"), "dd/MM/yyyy")
                  : null
              } />
              <InfoRow label="% Comissão Padrão" value={
                seller.percentualComissao ? `${seller.percentualComissao}%` : null
              } />
              <InfoRow label="Status" value={seller.status} />
              {seller.observacoes && (
                <div className="col-span-2">
                  <InfoRow label="Observações" value={seller.observacoes} />
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Endereço */}
        {(seller.logradouro || seller.cidade) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <InfoRow
                    label="Logradouro"
                    value={[seller.logradouro, seller.numero, seller.complemento].filter(Boolean).join(", ")}
                  />
                </div>
                <InfoRow label="Bairro" value={seller.bairro} />
                <InfoRow label="CEP" value={seller.cep} mono />
                <InfoRow label="Cidade" value={seller.cidade} />
                <InfoRow label="Estado" value={seller.estado} />
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Habilitação / Motorista */}
        {((seller as any).autorizadoDirigir || (seller as any).cnhCategoria || (seller as any).whatsappNumber) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                Habilitação e Controle de Frota
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status de motorista</dt>
                  <dd className="text-sm mt-0.5">
                    {(seller as any).autorizadoDirigir ? (
                      <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                        <Users className="w-3.5 h-3.5" /> Autorizado a conduzir veículos
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Não autorizado</span>
                    )}
                  </dd>
                </div>
                {(seller as any).cnhCategoria && (
                  <InfoRow label="Categoria CNH" value={(seller as any).cnhCategoria} />
                )}
                {(seller as any).cnhValidade && (
                  <InfoRow label="Validade CNH" value={
                    format(new Date((seller as any).cnhValidade + "T00:00:00"), "dd/MM/yyyy")
                  } />
                )}
                {(seller as any).whatsappNumber && (
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">WhatsApp Bot de Frota</dt>
                    <dd className="text-sm font-mono mt-0.5">{(seller as any).whatsappNumber}</dd>
                    <dd className="text-xs text-muted-foreground mt-0.5">Número configurado para o bot de controle de saída de veículos</dd>
                  </div>
                )}
                {(seller as any).cnhObservacoes && (
                  <div className="col-span-2">
                    <InfoRow label="Obs. CNH / Motorista" value={(seller as any).cnhObservacoes} />
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Dados Bancários */}
        {sellerData.bankAccounts && sellerData.bankAccounts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Dados Bancários
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sellerData.bankAccounts.map((acc) => (
                <dl key={acc.id} className="grid grid-cols-2 gap-3">
                  <InfoRow label="Banco" value={acc.banco} />
                  <InfoRow label="Tipo de Conta" value={acc.tipoConta} />
                  <InfoRow label="Agência" value={acc.agencia} mono />
                  <InfoRow label="Conta" value={acc.conta} mono />
                  <InfoRow label="Nome Favorecido" value={acc.nomeFavorecido} />
                  <InfoRow label="Documento" value={acc.documentoFavorecido} mono />
                  {acc.pixChave && (
                    <>
                      <InfoRow label="Tipo Pix" value={acc.pixTipoChave} />
                      <InfoRow label="Chave Pix" value={acc.pixChave} mono />
                    </>
                  )}
                </dl>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Documentos do Colaborador */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FilePlus className="w-4 h-4 text-muted-foreground" />
            Documentos Digitalizados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload */}
          <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Descrição do documento (opcional)</Label>
              <Input
                className="mt-1"
                placeholder="Ex: RG, CPF, CNH, Comprovante de residência..."
                value={docDescricao}
                onChange={(e) => setDocDescricao(e.target.value)}
                data-testid="input-doc-descricao"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                data-testid="button-upload-doc"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1.5" />
                )}
                {uploading ? "Enviando..." : "Selecionar arquivo"}
              </Button>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG ou WEBP · Máximo 20 MB</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileUpload}
              data-testid="input-file-upload"
            />
          </div>

          {/* Document List */}
          {docsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  data-testid={`doc-item-${doc.id}`}
                >
                  <DocIcon mimeType={doc.mimeType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.nomeArquivo}</p>
                    {doc.descricao && (
                      <p className="text-xs text-muted-foreground truncate">{doc.descricao}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(doc.tamanhoBytes)} · {format(new Date(doc.createdAt), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      asChild
                      data-testid={`button-view-doc-${doc.id}`}
                    >
                      <a href={doc.caminho} target="_blank" rel="noopener noreferrer">
                        {doc.mimeType === "application/pdf" ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      asChild
                      data-testid={`button-download-doc-${doc.id}`}
                    >
                      <a href={doc.caminho} download={doc.nomeArquivo}>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteDocId(doc.id)}
                      data-testid={`button-delete-doc-${doc.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum documento anexado ainda.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete member dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteMutation.mutate()}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete document dialog */}
      <AlertDialog open={!!deleteDocId} onOpenChange={(o) => !o && setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>O arquivo será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteDocId && deleteDocMutation.mutate(deleteDocId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
