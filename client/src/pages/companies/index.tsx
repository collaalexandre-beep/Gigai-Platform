import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus, Search, Building2, Star, StarOff, MoreHorizontal, Pencil, Trash2,
  PowerOff, Power, CheckCircle, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";

function formatCnpj(cnpj: string) {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export default function CompaniesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const { data, isLoading } = useQuery<{ data: Company[]; total: number }>({
    queryKey: ["/api/companies", { search, status: statusFilter !== "all" ? statusFilter : undefined }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      return fetch(`/api/companies?${params}`).then((r) => r.json());
    },
  });

  const companies = data?.data ?? [];

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/companies/${id}/set-default`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Empresa padrão atualizada." });
    },
    onError: () => toast({ title: "Erro ao definir empresa padrão.", variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/companies/${id}`, { status }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({ title: "Status atualizado." });
    },
    onError: () => toast({ title: "Erro ao atualizar status.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setDeleteTarget(null);
      toast({ title: "Empresa removida." });
    },
    onError: () => toast({ title: "Erro ao remover empresa.", variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" data-testid="title-companies">Empresas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie as empresas que operam no sistema
          </p>
        </div>
        <Button size="sm" asChild data-testid="button-new-company">
          <Link href="/companies/new">
            <Plus className="w-4 h-4 mr-1.5" /> Nova Empresa
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razão social, fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="input-search-companies"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativa">Ativas</SelectItem>
            <SelectItem value="inativa">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {search || statusFilter !== "all" ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {!search && statusFilter === "all" && "Crie sua primeira empresa para começar"}
          </p>
          {!search && statusFilter === "all" && (
            <Button size="sm" className="mt-4" asChild>
              <Link href="/companies/new">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Nova Empresa
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="w-10">Logo</div>
            <div>Empresa</div>
            <div>CNPJ</div>
            <div>Contato</div>
            <div>E-mail</div>
            <div>Status</div>
            <div className="w-8" />
          </div>

          {/* Table rows */}
          {companies.map((company) => (
            <div
              key={company.id}
              className={`grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors items-center ${
                company.isPadrao ? "bg-primary/3" : ""
              }`}
              data-testid={`row-company-${company.id}`}
            >
              {/* Logo */}
              <div className="w-10 h-10 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.nomeFantasia}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Empresa */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLocation(`/companies/${company.id}/edit`)}
                    className="font-medium text-sm hover:text-primary truncate max-w-[200px] text-left"
                    data-testid={`link-company-${company.id}`}
                  >
                    {company.nomeFantasia}
                  </button>
                  {company.isPadrao && (
                    <Badge className="text-[10px] py-0 h-4 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-0.5 flex-shrink-0">
                      <Star className="w-2.5 h-2.5" /> Padrão
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {company.razaoSocial}
                </p>
              </div>

              {/* CNPJ */}
              <div className="text-sm font-mono text-muted-foreground">
                {formatCnpj(company.cnpj)}
              </div>

              {/* Contato */}
              <div className="text-sm text-muted-foreground">{company.telefone || "—"}</div>

              {/* Email */}
              <div className="text-sm text-muted-foreground truncate max-w-[180px]">
                {company.email || "—"}
              </div>

              {/* Status */}
              <div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    company.status === "ativa"
                      ? "border-green-500/30 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {company.status === "ativa" ? (
                    <><CheckCircle className="w-3 h-3 mr-1" /> Ativa</>
                  ) : (
                    <><Circle className="w-3 h-3 mr-1" /> Inativa</>
                  )}
                </Badge>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    data-testid={`button-actions-${company.id}`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setLocation(`/companies/${company.id}/edit`)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
                  {!company.isPadrao && (
                    <DropdownMenuItem onClick={() => setDefaultMutation.mutate(company.id)}>
                      <Star className="w-3.5 h-3.5 mr-2" /> Definir como padrão
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        id: company.id,
                        status: company.status === "ativa" ? "inativa" : "ativa",
                      })
                    }
                  >
                    {company.status === "ativa" ? (
                      <><PowerOff className="w-3.5 h-3.5 mr-2" /> Inativar</>
                    ) : (
                      <><Power className="w-3.5 h-3.5 mr-2" /> Ativar</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(company)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Remover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-right">
          {data.total} empresa{data.total !== 1 ? "s" : ""} encontrada{data.total !== 1 ? "s" : ""}
        </p>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa <strong>{deleteTarget?.nomeFantasia}</strong> será removida do sistema. Esta ação
              não pode ser desfeita. Se a empresa estiver vinculada a orçamentos ou pedidos, considere
              inativá-la em vez de remover.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
