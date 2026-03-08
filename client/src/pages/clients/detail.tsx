import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowLeft, Pencil, Plus, Building2, Phone, Mail, MapPin,
  Globe, Instagram, MessageSquare, Calendar, CheckSquare,
  User, UserCheck, Tag, FileText, ChevronRight, Trash2,
  Shield, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/status-badge";
import { ContactsPanel } from "@/components/contacts-panel";
import { TimelineFeed } from "@/components/timeline-feed";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Interaction, Seller, ClientSellerLink } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCnpj(cnpj: string | null) {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className={`text-sm text-foreground mt-0.5 ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function InteractionIcon({ tipo }: { tipo: string }) {
  const icons: Record<string, string> = {
    ligacao: "📞",
    email: "📧",
    whatsapp: "💬",
    reuniao: "🤝",
    visita: "🏢",
    proposta: "📄",
    outro: "💡",
  };
  return <span className="text-base">{icons[tipo] || "💡"}</span>;
}

function tipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    ligacao: "Ligação",
    email: "E-mail",
    whatsapp: "WhatsApp",
    reuniao: "Reunião",
    visita: "Visita",
    proposta: "Proposta",
    outro: "Outro",
  };
  return labels[tipo] || tipo;
}

interface InteractionDialogProps {
  open: boolean;
  clientId: string;
  onClose: () => void;
}

function InteractionDialog({ open, clientId, onClose }: InteractionDialogProps) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState<string>("ligacao");
  const [descricao, setDescricao] = useState("");
  const [resultado, setResultado] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/clients/${clientId}/interactions`, {
        tipo,
        descricao,
        resultado,
        dataInteracao: new Date(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "timeline"] });
      toast({ title: "Interação registrada com sucesso." });
      setTipo("ligacao");
      setDescricao("");
      setResultado("");
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Interação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de interação</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="mt-1" data-testid="select-interaction-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: "ligacao", label: "Ligação" },
                  { value: "email", label: "E-mail" },
                  { value: "whatsapp", label: "WhatsApp" },
                  { value: "reuniao", label: "Reunião" },
                  { value: "visita", label: "Visita" },
                  { value: "proposta", label: "Proposta" },
                  { value: "outro", label: "Outro" },
                ].map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva o que aconteceu na interação..."
              data-testid="input-interaction-descricao"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Resultado</Label>
            <Input
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              placeholder="Qual foi o resultado?"
              data-testid="input-interaction-resultado"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => descricao && mutation.mutate()}
            disabled={!descricao || mutation.isPending}
            data-testid="button-save-interaction"
          >
            {mutation.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SellerLinkDialogProps {
  open: boolean;
  clientId: string;
  linkedSellerIds: string[];
  onClose: () => void;
}

function SellerLinkDialog({ open, clientId, linkedSellerIds, onClose }: SellerLinkDialogProps) {
  const { toast } = useToast();
  const [sellerId, setSellerId] = useState("");

  const { data: sellers } = useQuery<{ data: Seller[] }>({
    queryKey: ["/api/sellers"],
    queryFn: () => fetch("/api/sellers?limit=100").then((r) => r.json()),
  });

  const available = sellers?.data.filter(
    (s) => !linkedSellerIds.includes(s.id) && s.status === "ativo"
  ) || [];

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/clients/${clientId}/sellers`, { sellerId, principal: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "timeline"] });
      toast({ title: "Vendedor vinculado com sucesso." });
      setSellerId("");
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Vincular Vendedor</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Vendedor</Label>
          <Select value={sellerId} onValueChange={setSellerId}>
            <SelectTrigger className="mt-1" data-testid="select-seller-link">
              <SelectValue placeholder="Selecione um vendedor..." />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.nomeCompleto}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {available.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">Nenhum vendedor disponível para vincular.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => sellerId && mutation.mutate()}
            disabled={!sellerId || mutation.isPending}
            data-testid="button-confirm-link-seller"
          >
            {mutation.isPending ? "Vinculando..." : "Vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [interactionDialog, setInteractionDialog] = useState(false);
  const [sellerDialog, setSellerDialog] = useState(false);
  const [unlinkSellerId, setUnlinkSellerId] = useState<string | null>(null);
  const [deleteClient, setDeleteClient] = useState(false);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ["/api/clients", id],
    queryFn: () => fetch(`/api/clients/${id}`).then((r) => r.json()),
  });

  const { data: interactions } = useQuery<Interaction[]>({
    queryKey: ["/api/clients", id, "interactions"],
    queryFn: () => fetch(`/api/clients/${id}/interactions`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: clientSellers } = useQuery<(ClientSellerLink & { seller: Seller })[]>({
    queryKey: ["/api/clients", id, "sellers"],
    queryFn: () => fetch(`/api/clients/${id}/sellers`).then((r) => r.json()),
    enabled: !!id,
  });

  const unlinkMutation = useMutation({
    mutationFn: (sellerId: string) =>
      apiRequest("DELETE", `/api/clients/${id}/sellers/${sellerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", id, "sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", id, "timeline"] });
      toast({ title: "Vendedor desvinculado." });
      setUnlinkSellerId(null);
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Cliente removido." });
      setLocation("/clients");
    },
  });

  const deleteInteractionMutation = useMutation({
    mutationFn: (intId: string) => apiRequest("DELETE", `/api/interactions/${intId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", id, "interactions"] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-screen-xl mx-auto">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button asChild className="mt-4"><Link href="/clients">Voltar</Link></Button>
      </div>
    );
  }

  const linkedSellerIds = clientSellers?.map((l) => l.sellerId) || [];

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/clients" className="hover-elevate flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Clientes
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{client.nomeFantasia || client.razaoSocial}</span>
      </div>

      {/* Header Card */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">
                  {client.nomeFantasia || client.razaoSocial}
                </h1>
                <StatusBadge value={client.status} type="client" />
                {client.segmento && (
                  <Badge variant="outline" className="text-xs no-default-active-elevate">
                    {client.segmento}
                  </Badge>
                )}
              </div>
              {client.nomeFantasia && (
                <p className="text-sm text-muted-foreground mt-0.5">{client.razaoSocial}</p>
              )}
              <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
                {client.cnpj && (
                  <span className="font-mono">{formatCnpj(client.cnpj)}</span>
                )}
                {client.cidade && client.estado && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {client.cidade}/{client.estado}
                  </span>
                )}
                {client.telefone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {client.telefone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInteractionDialog(true)}
              data-testid="button-add-interaction"
            >
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Interação
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSellerDialog(true)}
              data-testid="button-link-seller"
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              Vincular vendedor
            </Button>
            <Button asChild size="sm" data-testid="button-edit-client">
              <Link href={`/clients/${id}/edit`}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Editar
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => setDeleteClient(true)}
              data-testid="button-delete-client"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sellers row */}
        {clientSellers && clientSellers.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Vendedores:</span>
            {clientSellers.map((link) => (
              <div key={link.id} className="flex items-center gap-1">
                <Badge
                  variant="secondary"
                  className="text-xs gap-1 no-default-active-elevate"
                  data-testid={`badge-seller-${link.seller.id}`}
                >
                  <UserCheck className="w-2.5 h-2.5" />
                  {link.seller.nomeCompleto}
                  {link.principal && <Star className="w-2.5 h-2.5 text-yellow-500" />}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-muted-foreground"
                  onClick={() => setUnlinkSellerId(link.sellerId)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="geral" data-testid="tab-geral">Geral</TabsTrigger>
          <TabsTrigger value="contatos" data-testid="tab-contatos">Contatos</TabsTrigger>
          <TabsTrigger value="crm" data-testid="tab-crm">CRM</TabsTrigger>
          <TabsTrigger value="historico" data-testid="tab-historico">Histórico</TabsTrigger>
        </TabsList>

        {/* TAB: GERAL */}
        <TabsContent value="geral" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dados Fiscais */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Dados Fiscais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <InfoRow label="CNPJ" value={formatCnpj(client.cnpj)} mono />
                  <InfoRow label="Razão Social" value={client.razaoSocial} />
                  <InfoRow label="Nome Fantasia" value={client.nomeFantasia} />
                  <InfoRow label="Insc. Estadual" value={client.inscricaoEstadual} />
                  <InfoRow label="Situação Cadastral" value={client.situacaoCadastral} />
                  <InfoRow label="Data de Abertura" value={
                    client.dataAbertura
                      ? format(new Date(client.dataAbertura + "T00:00:00"), "dd/MM/yyyy")
                      : null
                  } />
                  <InfoRow label="Natureza Jurídica" value={client.naturezaJuridica} />
                  <InfoRow label="Regime Tributário" value={client.regimeTributario?.replace(/_/g, " ")} />
                </dl>
                {client.cnpjConsultadoEm && (
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      {client.cnpjConsultaBemSucedida ? "✓" : "✗"}{" "}
                      Consultado via <strong>{client.cnpjFonteConsulta}</strong>{" "}
                      em {format(new Date(client.cnpjConsultadoEm), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                )}
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
                <dl className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <InfoRow label="Logradouro" value={
                      [client.logradouro, client.numero, client.complemento]
                        .filter(Boolean)
                        .join(", ") || null
                    } />
                  </div>
                  <InfoRow label="Bairro" value={client.bairro} />
                  <InfoRow label="CEP" value={client.cep} mono />
                  <InfoRow label="Cidade" value={client.cidade} />
                  <InfoRow label="Estado" value={client.estado} />
                </dl>
              </CardContent>
            </Card>

            {/* Contato Principal */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <InfoRow label="Telefone" value={client.telefone} />
                  <InfoRow label="WhatsApp" value={client.whatsapp} />
                  <div className="col-span-2">
                    <InfoRow label="E-mail" value={client.email} />
                  </div>
                  <InfoRow label="Site" value={client.site} />
                  <InfoRow label="Instagram" value={client.instagram} />
                </dl>
              </CardContent>
            </Card>

            {/* CRM Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Informações Comerciais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <InfoRow label="Origem do Lead" value={client.origemLead?.replace(/_/g, " ")} />
                  <InfoRow label="Segmento" value={client.segmento} />
                  <InfoRow label="Potencial de Compra" value={client.potencialCompra} />
                  <InfoRow label="Cadastro" value={
                    format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })
                  } />
                  <InfoRow label="Último Contato" value={
                    client.dataUltimoContato
                      ? format(new Date(client.dataUltimoContato), "dd/MM/yyyy")
                      : null
                  } />
                  <InfoRow label="Próximo Follow-up" value={
                    client.dataProximoFollowup
                      ? format(new Date(client.dataProximoFollowup), "dd/MM/yyyy")
                      : null
                  } />
                </dl>
                {client.observacoes && (
                  <div className="mt-4 pt-3 border-t">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Observações internas
                    </dt>
                    <dd className="text-sm text-foreground">{client.observacoes}</dd>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: CONTATOS */}
        <TabsContent value="contatos">
          <ContactsPanel clientId={id!} />
        </TabsContent>

        {/* TAB: CRM */}
        <TabsContent value="crm" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Interações</h3>
            <Button
              size="sm"
              onClick={() => setInteractionDialog(true)}
              data-testid="button-add-interaction-crm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Registrar
            </Button>
          </div>

          {interactions?.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions?.map((interaction) => (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 border rounded-lg p-4 bg-card"
                  data-testid={`interaction-${interaction.id}`}
                >
                  <div className="text-lg flex-shrink-0 mt-0.5">
                    <InteractionIcon tipo={interaction.tipo} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="secondary" className="text-xs no-default-active-elevate">
                        {tipoLabel(interaction.tipo)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(interaction.dataInteracao), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{interaction.descricao}</p>
                    {interaction.resultado && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Resultado: {interaction.resultado}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive flex-shrink-0"
                    onClick={() => deleteInteractionMutation.mutate(interaction.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: HISTÓRICO */}
        <TabsContent value="historico">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Timeline de Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineFeed clientId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InteractionDialog
        open={interactionDialog}
        clientId={id!}
        onClose={() => setInteractionDialog(false)}
      />
      <SellerLinkDialog
        open={sellerDialog}
        clientId={id!}
        linkedSellerIds={linkedSellerIds}
        onClose={() => setSellerDialog(false)}
      />

      <AlertDialog open={!!unlinkSellerId} onOpenChange={(o) => !o && setUnlinkSellerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular vendedor?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação pode ser revertida vinculando o vendedor novamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => unlinkSellerId && unlinkMutation.mutate(unlinkSellerId)}
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteClient} onOpenChange={setDeleteClient}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteClientMutation.mutate()}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
