import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Plus, Search, Filter, MoreHorizontal, Building2, Phone, MapPin,
  ChevronLeft, ChevronRight, Users, Eye, Pencil, Trash2,
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
import type { Client } from "@shared/schema";
import { format } from "date-fns";

const LIMIT = 20;

function useClientSearch() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  return {
    search: params.get("search") || "",
    status: params.get("status") || "",
    page: Number(params.get("page")) || 1,
    updateSearch: (key: string, value: string) => {
      const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      if (value) p.set(key, value); else p.delete(key);
      p.delete("page");
      setLocation(`/clients?${p.toString()}`);
    },
    setPage: (pg: number) => {
      const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      p.set("page", String(pg));
      setLocation(`/clients?${p.toString()}`);
    },
  };
}

function formatCnpj(cnpj: string | null) {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export default function ClientsPage() {
  const { toast } = useToast();
  const { search, status, page, updateSearch, setPage } = useClientSearch();
  const [localSearch, setLocalSearch] = useState(search);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Client[]; total: number }>({
    queryKey: ["/api/clients", { search, status, page }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (status) p.set("status", status);
      p.set("page", String(page));
      p.set("limit", String(LIMIT));
      return fetch(`/api/clients?${p}`).then((r) => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Cliente removido com sucesso." });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Erro ao remover cliente.", variant: "destructive" }),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateSearch("search", localSearch);
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total.toLocaleString("pt-BR")} registros encontrados` : "Carregando..."}
          </p>
        </div>
        <Button asChild data-testid="button-new-client">
          <Link href="/clients/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="pl-9"
              data-testid="input-search-clients"
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
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="bloqueado">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">CNPJ</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Cidade</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Contato</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum cliente encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search || status ? "Tente ajustar os filtros" : "Cadastre seu primeiro cliente"}
                  </p>
                  {!search && !status && (
                    <Button asChild size="sm" className="mt-4">
                      <Link href="/clients/new">
                        <Plus className="w-4 h-4 mr-1" />
                        Novo Cliente
                      </Link>
                    </Button>
                  )}
                </td>
              </tr>
            ) : (
              data?.data.map((client) => (
                <tr
                  key={client.id}
                  className="border-b last:border-b-0 hover-elevate cursor-pointer"
                  onClick={() => window.location.href = `/clients/${client.id}`}
                  data-testid={`row-client-${client.id}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {client.nomeFantasia || client.razaoSocial}
                        </p>
                        {client.nomeFantasia && (
                          <p className="text-xs text-muted-foreground">{client.razaoSocial}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
                    {formatCnpj(client.cnpj)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {client.cidade ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-sm">{client.cidade}{client.estado ? `/${client.estado}` : ""}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {client.telefone ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-sm">{client.telefone}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={client.status} type="client" />
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid={`menu-client-${client.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`} className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}/edit`} className="flex items-center gap-2">
                            <Pencil className="w-4 h-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(client.id)}
                          data-testid={`delete-client-${client.id}`}
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
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será marcado como inativo no sistema.
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
