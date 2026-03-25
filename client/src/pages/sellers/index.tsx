import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus, Search, MoreHorizontal, Users, Pencil, Eye, Trash2, Phone, Mail,
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
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Seller } from "@shared/schema";

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

export default function TeamPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [funcao, setFuncao] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: Seller[]; total: number }>({
    queryKey: ["/api/sellers", { search, status, funcao }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (status && status !== "all") p.set("status", status);
      if (funcao && funcao !== "all") p.set("funcao", funcao);
      p.set("limit", "50");
      return fetch(`/api/sellers?${p}`).then((r) => r.json());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sellers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Membro removido com sucesso." });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Erro ao remover.", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total} colaborador${data.total !== 1 ? "es" : ""}` : "Carregando..."}
          </p>
        </div>
        <Button asChild data-testid="button-new-seller">
          <Link href="/sellers/new">
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Membro
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar colaborador..."
            className="pl-9"
            data-testid="input-search-sellers"
          />
        </div>
        <Select value={funcao} onValueChange={setFuncao}>
          <SelectTrigger className="w-44" data-testid="select-filter-funcao">
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            {Object.entries(FUNCAO_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum colaborador encontrado</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/sellers/new">
              <Plus className="w-4 h-4 mr-1" /> Cadastrar membro
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data.map((seller) => (
            <Link key={seller.id} href={`/sellers/${seller.id}`}>
              <div
                className="border rounded-xl bg-card p-4 hover-elevate cursor-pointer"
                data-testid={`card-seller-${seller.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{seller.nomeCompleto}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {(seller as any).funcao && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {FUNCAO_LABELS[(seller as any).funcao] || (seller as any).funcao}
                          </Badge>
                        )}
                        {seller.cargo && !((seller as any).funcao) && (
                          <p className="text-xs text-muted-foreground">{seller.cargo}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                    <StatusBadge value={seller.status} type="seller" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7" data-testid={`menu-seller-${seller.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/sellers/${seller.id}`} className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Ver detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/sellers/${seller.id}/edit`} className="flex items-center gap-2">
                            <Pencil className="w-4 h-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(seller.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {seller.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {seller.email}
                    </div>
                  )}
                  {seller.telefone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {seller.telefone}
                    </div>
                  )}
                </div>

                {seller.percentualComissao && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Comissão</span>
                    <span className="text-sm font-semibold text-foreground">{seller.percentualComissao}%</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
