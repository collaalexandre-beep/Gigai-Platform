import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Box,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

const LIMIT = 20;

const CALC_TYPE_LABELS: Record<string, string> = {
  m2: "M²",
  unidade: "Unidade",
  metro_linear: "Metro Linear",
  perimetro: "Perímetro",
  projeto: "Projeto",
  fixo_variavel: "Fixo + Variável",
};

export default function ProductsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("all");
  const [tipoCalculo, setTipoCalculo] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Product[]; total: number }>({
    queryKey: ["/api/products", { search, categoria, tipoCalculo, page }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (categoria !== "all") p.set("categoria", categoria);
      if (tipoCalculo !== "all") p.set("tipoCalculo", tipoCalculo);
      p.set("page", String(page));
      p.set("limit", String(LIMIT));
      return fetch(`/api/products?${p}`).then((r) => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produto removido com sucesso." });
      setDeleteId(null);
    },
    onError: (err: Error) =>
      toast({ title: "Erro ao remover produto.", description: err.message, variant: "destructive" }),
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  const categories = data?.data.reduce((acc: string[], curr) => {
    if (!acc.includes(curr.categoria)) acc.push(curr.categoria);
    return acc;
  }, []) || [];

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total.toLocaleString("pt-BR")} produtos cadastrados` : "Carregando..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild data-testid="button-ai-generator">
            <Link href="/products/ai-generator">
              <Sparkles className="w-4 h-4 mr-1.5 text-primary" />
              Gerar com IA
            </Link>
          </Button>
          <Button asChild data-testid="button-new-product">
            <Link href="/products/new">
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Produto
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar produto..."
            className="pl-9"
            data-testid="input-search-products"
          />
        </div>

        <Select
          value={categoria}
          onValueChange={(v) => {
            setCategoria(v);
            setPage(1);
          }}
          data-testid="select-category-filter"
        >
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={tipoCalculo}
          onValueChange={(v) => {
            setTipoCalculo(v);
            setPage(1);
          }}
          data-testid="select-calctype-filter"
        >
          <SelectTrigger className="w-48">
            <Box className="w-4 h-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Tipo de Cálculo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(CALC_TYPE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Produto</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Cálculo</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                </tr>
              ))
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <Box className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum produto encontrado</p>
                  <Button asChild size="sm" variant="outline" className="mt-4">
                    <Link href="/products/new">Cadastrar primeiro produto</Link>
                  </Button>
                </td>
              </tr>
            ) : (
              data?.data.map((product) => (
                <tr
                  key={product.id}
                  className="border-b last:border-b-0 hover-elevate cursor-pointer"
                  onClick={() => window.location.href = `/products/${product.id}/edit`}
                  data-testid={`row-product-${product.id}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Box className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{product.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="outline" className="font-normal no-default-active-elevate">
                      {product.categoria}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {CALC_TYPE_LABELS[product.tipoCalculo] || product.tipoCalculo}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={product.ativo ? "default" : "secondary"} className="no-default-active-elevate">
                      {product.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid={`menu-product-${product.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${product.id}/edit`} className="flex items-center gap-2">
                            <Pencil className="w-4 h-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(product.id)}
                          data-testid={`delete-product-${product.id}`}
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
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará o produto como excluído no sistema.
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
