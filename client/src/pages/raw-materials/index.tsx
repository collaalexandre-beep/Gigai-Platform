import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Plus, Search, Filter, MoreHorizontal, FlaskConical, Pencil, Trash2,
  ChevronLeft, ChevronRight, Package, Box, Tag,
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
import type { RawMaterial } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

const LIMIT = 20;

function useRawMaterialSearch() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  return {
    search: params.get("search") || "",
    categoria: params.get("categoria") || "",
    page: Number(params.get("page")) || 1,
    updateSearch: (key: string, value: string) => {
      const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      if (value) p.set(key, value); else p.delete(key);
      p.delete("page");
      setLocation(`/raw-materials?${p.toString()}`);
    },
    setPage: (pg: number) => {
      const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      p.set("page", String(pg));
      setLocation(`/raw-materials?${p.toString()}`);
    },
  };
}

const formatCurrency = (value: string | number | null) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
};

export default function RawMaterialsPage() {
  const { toast } = useToast();
  const { search, categoria, page, updateSearch, setPage } = useRawMaterialSearch();
  const [localSearch, setLocalSearch] = useState(search);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: RawMaterial[]; total: number }>({
    queryKey: ["/api/raw-materials", { search, categoria, page }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (categoria) p.set("categoria", categoria);
      p.set("page", String(page));
      p.set("limit", String(LIMIT));
      return fetch(`/api/raw-materials?${p}`).then((r) => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/raw-materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] });
      toast({ title: "Matéria-prima removida com sucesso." });
      setDeleteId(null);
    },
    onError: (err: Error) => toast({ title: `Erro ao remover: ${err.message}`, variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      apiRequest("PATCH", `/api/raw-materials/${id}`, { ativo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] });
      toast({ title: "Status atualizado com sucesso." });
    },
    onError: (err: Error) => toast({ title: `Erro ao atualizar status: ${err.message}`, variant: "destructive" }),
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
          <h1 className="text-2xl font-bold text-foreground">Matérias-primas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total.toLocaleString("pt-BR")} registros encontrados` : "Carregando..."}
          </p>
        </div>
        <Button asChild data-testid="button-new-raw-material">
          <Link href="/raw-materials/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Matéria-prima
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
              placeholder="Buscar por nome ou código..."
              className="pl-9"
              data-testid="input-search-raw-materials"
            />
          </div>
          <Button type="submit" variant="secondary" size="default" data-testid="button-search">
            <Search className="w-4 h-4" />
          </Button>
        </form>
        <Select
          value={categoria || "all"}
          onValueChange={(v) => updateSearch("categoria", v === "all" ? "" : v)}
          data-testid="select-category-filter"
        >
          <SelectTrigger className="w-52">
            <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="chapas">Chapas</SelectItem>
            <SelectItem value="impressao">Impressão</SelectItem>
            <SelectItem value="estruturas">Estruturas</SelectItem>
            <SelectItem value="iluminacao">Iluminação</SelectItem>
            <SelectItem value="fixacao">Fixação</SelectItem>
            <SelectItem value="adesivos">Adesivos</SelectItem>
            <SelectItem value="tintas">Tintas</SelectItem>
            <SelectItem value="acabamento">Acabamento</SelectItem>
            <SelectItem value="instalacao">Instalação</SelectItem>
            <SelectItem value="servicos_terceirizados">Serviços Terceirizados</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Código</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Categoria</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Unidade</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Custo Unit.</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-5 w-28 rounded-full" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <FlaskConical className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma matéria-prima encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search || categoria ? "Tente ajustar os filtros" : "Cadastre sua primeira matéria-prima"}
                  </p>
                </td>
              </tr>
            ) : (
              data?.data.map((item) => (
                <tr
                  key={item.id}
                  className="border-b last:border-b-0 hover-elevate cursor-pointer"
                  onClick={() => window.location.href = `/raw-materials/${item.id}/edit`}
                  data-testid={`row-raw-material-${item.id}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-4 h-4 text-primary" />
                      </div>
                      <div className="font-medium text-foreground truncate max-w-[200px]" title={item.nome}>
                        {item.nome}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
                    {item.codigoInterno || "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <StatusBadge value={item.categoria} type="rawMaterialCategory" />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground uppercase text-xs font-semibold">
                    {item.unidadeCompra}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {formatCurrency(item.custoUnitario)}
                  </td>
                  <td className="px-4 py-3">
                    {item.ativo ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0" data-testid={`badge-active-${item.id}`}>Ativo</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-0" data-testid={`badge-inactive-${item.id}`}>Inativo</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid={`menu-raw-material-${item.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/raw-materials/${item.id}/edit`} className="flex items-center gap-2">
                            <Pencil className="w-4 h-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ id: item.id, ativo: !item.ativo })}>
                          <Box className="w-4 h-4 mr-2" /> {item.ativo ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(item.id)}
                          data-testid={`delete-raw-material-${item.id}`}
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
            <AlertDialogTitle>Remover matéria-prima?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A matéria-prima será removida permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
