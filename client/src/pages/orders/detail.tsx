import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { 
  ArrowLeft, 
  Package, 
  ChevronRight, 
  Calendar, 
  Building2, 
  CreditCard, 
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  MoreVertical,
  ChevronDown,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order, Client, OrderItem, PaymentTerm } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any; className: string }> = {
    aguardando_producao: { 
      label: "Aguardando Produção", 
      variant: "secondary", 
      icon: Clock,
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-200" 
    },
    em_producao: { 
      label: "Em Produção", 
      variant: "secondary", 
      icon: Package,
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 border-yellow-200" 
    },
    finalizado: { 
      label: "Finalizado", 
      variant: "secondary", 
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-green-200" 
    },
    entregue: { 
      label: "Entregue", 
      variant: "outline", 
      icon: Truck,
      className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-slate-200" 
    },
    cancelado: { 
      label: "Cancelado", 
      variant: "destructive", 
      icon: XCircle,
      className: "" 
    },
  };

  const config = configs[status] || { label: status, variant: "outline", icon: AlertCircle, className: "" };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 px-3 py-1 text-sm font-semibold ${config.className}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </Badge>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: order, isLoading: orderLoading } = useQuery<Order & { client: Client }>({
    queryKey: ["/api/orders", id],
    queryFn: () => fetch(`/api/orders/${id}`).then((r) => r.json()),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<OrderItem[]>({
    queryKey: ["/api/orders", id, "items"],
    queryFn: () => fetch(`/api/orders/${id}/items`).then((r) => r.json()),
  });

  const { data: paymentTerms = [] } = useQuery<PaymentTerm[]>({
    queryKey: ["/api/payment-terms"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => 
      apiRequest("PATCH", `/api/orders/${id}/status`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      toast({ title: "Status do pedido atualizado com sucesso." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar status", description: err.message, variant: "destructive" });
    }
  });

  const paymentTerm = paymentTerms.find(p => p.id === order?.prazosPagamentoId);

  if (orderLoading || itemsLoading) {
    return (
      <div className="p-6 space-y-4 max-w-screen-xl mx-auto">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground font-medium">Pedido não encontrado.</p>
        <Button asChild className="mt-4"><Link href="/orders">Voltar para listagem</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/orders" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Pedidos
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">{order.numero}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{order.numero}</h1>
            <StatusBadge status={order.status} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {order.quoteId && (
            <Button variant="outline" asChild data-testid="button-view-source-quote">
              <Link href={`/quotes/${order.quoteId}`}>
                <FileText className="w-4 h-4 mr-2" />
                Ver Orçamento de Origem
              </Link>
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild data-testid="button-change-status">
              <Button variant="default" className="gap-2">
                Alterar Status
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem 
                onClick={() => updateStatusMutation.mutate("aguardando_producao")}
                disabled={order.status === "aguardando_producao" || updateStatusMutation.isPending}
                className="gap-2"
              >
                <Clock className="w-4 h-4 text-blue-500" />
                Aguardando Produção
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => updateStatusMutation.mutate("em_producao")}
                disabled={order.status === "em_producao" || updateStatusMutation.isPending}
                className="gap-2"
              >
                <Package className="w-4 h-4 text-yellow-500" />
                Em Produção
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => updateStatusMutation.mutate("finalizado")}
                disabled={order.status === "finalizado" || updateStatusMutation.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Finalizado
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => updateStatusMutation.mutate("entregue")}
                disabled={order.status === "entregue" || updateStatusMutation.isPending}
                className="gap-2"
              >
                <Truck className="w-4 h-4 text-slate-500" />
                Entregue
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem 
                onClick={() => updateStatusMutation.mutate("cancelado")}
                disabled={order.status === "cancelado" || updateStatusMutation.isPending}
                className="text-destructive focus:text-destructive gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancelar Pedido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Itens do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="pl-6">Descrição</TableHead>
                  <TableHead>Medidas/Qtd</TableHead>
                  <TableHead className="text-right pr-6">Preço Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id} className="group transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{item.descricao}</span>
                        {item.observacoes && (
                          <span className="text-xs text-muted-foreground mt-1 bg-muted/50 p-1.5 rounded-md border border-dashed">
                            Obs: {item.observacoes}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{item.quantidade} {item.unidade}</span>
                        {item.largura && item.altura && (
                          <span className="text-muted-foreground text-xs">
                            {item.largura}m × {item.altura}m ({item.area} m²)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.precoTotal))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-col items-end gap-2 py-6 bg-muted/20 border-t">
            <div className="flex items-center gap-8">
              <span className="text-muted-foreground">Valor Total do Pedido:</span>
              <span className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.valorTotal))}
              </span>
            </div>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Building2 className="w-4 h-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-0.5">Razão Social</p>
                <p className="font-medium text-foreground">{order.client?.razaoSocial}</p>
                {order.client?.nomeFantasia && (
                  <p className="text-sm text-muted-foreground mt-0.5 italic">{order.client.nomeFantasia}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-0.5">CNPJ</p>
                <p className="font-mono text-sm">{order.client?.cnpj}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/clients/${order.clientId}`}>
                  Ver Ficha do Cliente
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Datas & Prazos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Data do Pedido</p>
                  <p className="font-medium">{order.data ? format(new Date(order.data), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Prazo Entrega</p>
                  <p className={`font-medium ${order.prazoEntrega && new Date(order.prazoEntrega) < new Date() && order.status !== 'entregue' ? 'text-destructive font-bold' : ''}`}>
                    {order.prazoEntrega ? format(new Date(order.prazoEntrega), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-0.5">Prazo de Pagamento</p>
                <p className="font-medium">{paymentTerm?.nome || "A combinar"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight mb-0.5">Forma de Pagamento</p>
                <p className="font-medium">{order.formaPagamento || "A combinar"}</p>
              </div>
            </CardContent>
          </Card>

          {order.observacoes && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/50">
              <CardHeader className="pb-2 border-b border-yellow-200 dark:border-yellow-900/50">
                <CardTitle className="text-sm font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Observações Internas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-sm text-yellow-900/80 dark:text-yellow-100/80 leading-relaxed italic">
                  "{order.observacoes}"
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
