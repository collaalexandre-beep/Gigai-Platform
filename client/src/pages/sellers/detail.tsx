import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, Pencil, Trash2, UserCheck, Phone, Mail,
  MapPin, Calendar, Percent, CreditCard, Building, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Seller, SellerBankAccount } from "@shared/schema";
import { format } from "date-fns";

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className={`text-sm text-foreground mt-0.5 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

export default function SellerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialog, setDeleteDialog] = useState(false);

  const { data: sellerData, isLoading } = useQuery<Seller & { bankAccounts: SellerBankAccount[] }>({
    queryKey: ["/api/sellers", id],
    queryFn: () => fetch(`/api/sellers/${id}`).then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/sellers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Vendedor removido." });
      setLocation("/sellers");
    },
  });

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
        <p className="text-muted-foreground">Vendedor não encontrado.</p>
        <Button asChild className="mt-4"><Link href="/sellers">Voltar</Link></Button>
      </div>
    );
  }

  const seller = sellerData;

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/sellers" className="flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Vendedores
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{seller.nomeCompleto}</span>
      </div>

      {/* Header */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{seller.nomeCompleto}</h1>
                <StatusBadge value={seller.status} type="seller" />
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

        {/* Dados Comerciais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              Dados Comerciais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <InfoRow label="Cargo" value={seller.cargo} />
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

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vendedor?</AlertDialogTitle>
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
    </div>
  );
}
