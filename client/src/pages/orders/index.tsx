import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Package, 
  Search, 
  Filter, 
  ChevronRight, 
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, Client } from "@shared/schema";
import { useState } from "react";
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
    <Badge variant={config.variant} className={`gap-1 px-2 py-0.5 font-medium ${config.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data: ordersData, isLoading } = useQuery<{ data: (Order & { client: Client })[]; total: number }>({
    queryKey: ["/api/orders", { status: status === "all" ? undefined : status }],
    queryFn: async ({ queryKey }) => {
      const [_url, params] = queryKey as [string, { status?: string }];
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append("status", params.status);
      const res = await fetch(`/api/orders?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Falha ao carregar pedidos");
      return res.json();
    },
  });

  const filteredOrders = ordersData?.data.filter(order => 
    order.numero.toLowerCase().includes(search.toLowerCase()) ||
    order.client?.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
    order.client?.nomeFantasia?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Dashboard</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Pedidos</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos de Venda</h1>
        <p className="text-muted-foreground">Gerencie o fluxo de produção e entrega dos seus pedidos.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número ou cliente..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-orders"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="aguardando_producao">Aguardando Produção</SelectItem>
                  <SelectItem value="em_producao">Em Produção</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px]">Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono font-medium text-primary">
                        {order.numero}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.client?.nomeFantasia || order.client?.razaoSocial}</span>
                          {order.client?.nomeFantasia && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {order.client.razaoSocial}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.data ? format(new Date(order.data), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.prazoEntrega ? (
                          <div className="flex flex-col">
                            <span>{format(new Date(order.prazoEntrega), "dd/MM/yyyy", { locale: ptBR })}</span>
                            {new Date(order.prazoEntrega) < new Date() && order.status !== 'entregue' && order.status !== 'cancelado' && (
                              <span className="text-[10px] text-destructive font-bold uppercase tracking-tight">Atrasado</span>
                            )}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.valorTotal))}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild data-testid={`button-view-order-${order.id}`}>
                          <Link href={`/orders/${order.id}`}>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredOrders?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        Nenhum pedido encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
