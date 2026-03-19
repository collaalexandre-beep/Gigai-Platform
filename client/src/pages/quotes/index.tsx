import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Plus, Search, Filter, MoreHorizontal, FileText, Calendar, User,
  ChevronLeft, ChevronRight, Eye, Pencil, Trash2, ArrowRightLeft, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quote, Client, Seller } from "@shared/schema";
import { format } from "date-fns";

const LIMIT = 20;

function useQuoteSearch() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  return {
    search: params.get("search") || "",
    status: params.get("status") || "",
    clientId: params.get("clientId") || "",
    page: Number(params.get("page")) || 1,
    updateSearch: (key: string, value: string) => {
      const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      if (value) p.set(key, value); else p.delete(key);
      p.delete("page");
      setLocation(`/quotes?${p.toString()}`);
    },
    setPage: (pg: number) => {
      const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      p.set("page", String(pg));
      setLocation(`/quotes?${p.toString()}`);
    },
  };
}

export default function QuotesPage() {
  const { toast } = useToast();
  const { search, status, clientId, page, updateSearch, setPage } = useQuoteSearch();
  const [localSearch, setLocalSearch] = useState(search);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: (Quote & { client?: Client, seller?: Seller })[]; total: number }>({
    queryKey: ["/api/quotes", { search, status, clientId, page }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      if (clientId) p.set("clientId", clientId);
      p.set("page", String(page));
      p.set("limit", String(LIMIT));
      return fetch(`/api/quotes?${p}`).then((r) => r.json());
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => fetch("/api/clients?limit=100").then(r => r.json()).then(d => d.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Orçamento removido com sucesso." });
      setDeleteId(null);
    },
    onError: (err: Error) => toast({ title: "Erro ao remover orçamento.", description: err.message, variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/quotes/${id}/convert-to-order`),
    onSuccess: (order: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Orçamento convertido em pedido com sucesso!", description: `Pedido ${order.numero} criado.` });
    },
    onError: (err: Error) => toast({ title: "Erro ao converter orçamento.", description: err.message, variant: "destructive" }),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateSearch("search", localSearch);
  }

  const formatCurrency = (val: string | number | null) => {
    if (!val) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total.toLocaleString("pt-BR")} orçamentos encontrados` : "Carregando..."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" data-testid="button-special-quote">
            <Link href="/quotes/special">
              <Sparkles className="w-4 h-4 mr-1.5 text-primary" />
              Orçamento Especial IA
            </Link>
          </Button>
          <Button asChild data-testid="button-new-quote">
            <Link href="/quotes/new">
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Orçamento
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar por número ou cliente..."
              className="pl-9"
              data-testid="input-search-quotes"
            />
          </div>
          <Button type="submit" variant="secondary" size="default" data-testid="button-search">
            <Search className="w-4 h-4" />
          </Button>
        </form>

        <Select
          value={status || "all"}
          onValueChange={(v) => updateSearch("status", v === "all" ? "" : v)}
          data-testid="select-status-filter"
        >
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="reprovado">Reprovado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={clientId || "all"}
          onValueChange={(v) => updateSearch("clientId", v === "all" ? "" : v)}
          data-testid="select-client-filter"
        >
          <SelectTrigger className="w-56">
            <User className="w-4 h-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.nomeFantasia || c.razaoSocial}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Número</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Vendedor</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Data</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum orçamento encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search || status || clientId ? "Tente ajustar os filtros" : "Crie seu primeiro orçamento"}
                  </p>
                </td>
              </tr>
            ) : (
              data?.data.map((quote) => (
                <tr
                  key={quote.id}
                  className="border-b last:border-b-0 hover-elevate cursor-pointer"
                  onClick={() => window.location.href = `/quotes/${quote.id}`}
                  data-testid={`row-quote-${quote.id}`}
                >
                  <td className="px-4 py-3 font-mono font-medium text-primary">
                    {quote.numero}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {quote.client?.nomeFantasia || quote.client?.razaoSocial || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {quote.seller?.nomeCompleto || "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {quote.data ? format(new Date(quote.data), "dd/MM/yyyy") : "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={quote.status} type="quote" />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(quote.valorTotal)}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid={`menu-quote-${quote.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/quotes/${quote.id}`} className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/quotes/${quote.id}/edit`} className="flex items-center gap-2">
                            <Pencil className="w-4 h-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        {quote.status === "aprovado" && (
                          <DropdownMenuItem
                            onClick={() => convertMutation.mutate(quote.id)}
                            className="text-primary"
                            data-testid={`convert-quote-${quote.id}`}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-2" /> Converter em Pedido
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(quote.id)}
                          data-testid={`delete-quote-${quote.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              data-testid="button-next-page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O orçamento será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
