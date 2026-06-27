import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Plus, Pencil, Trash2, UserCog, Eye, EyeOff } from "lucide-react";

type UserRow = {
  id: string;
  username: string;
  nome: string | null;
  email: string | null;
  role: string;
  ativo: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  operador: "Operador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  gerente: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  operador: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export default function UsersAdminPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const [fUsername, setFUsername] = useState("");
  const [fNome, setFNome] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fRole, setFRole] = useState("operador");
  const [fPassword, setFPassword] = useState("");
  const [fAtivo, setFAtivo] = useState(true);

  const { data: usersData = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiRequest("POST", "/api/users", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpenForm(false);
      resetForm();
      toast({ title: "Usuário criado com sucesso" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/users/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setOpenForm(false);
      setEditingId(null);
      resetForm();
      toast({ title: "Usuário atualizado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/users/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário removido" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setFUsername(""); setFNome(""); setFEmail(""); setFRole("operador");
    setFPassword(""); setFAtivo(true); setShowPw(false);
  };

  const openNew = () => { resetForm(); setEditingId(null); setOpenForm(true); };

  const openEdit = (u: UserRow) => {
    setEditingId(u.id);
    setFUsername(u.username);
    setFNome(u.nome ?? "");
    setFEmail(u.email ?? "");
    setFRole(u.role);
    setFAtivo(u.ativo);
    setFPassword("");
    setOpenForm(true);
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      username: fUsername.trim(),
      nome: fNome.trim() || null,
      email: fEmail.trim() || null,
      role: fRole,
      ativo: fAtivo,
    };
    if (fPassword.trim()) payload.password = fPassword;
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate({ ...payload, password: fPassword });
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UserCog className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Usuários do Sistema</h1>
        </div>
        <p className="text-muted-foreground">Gerencie quem tem acesso ao Gráfica+</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={openNew} data-testid="button-new-user">
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome / Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : usersData.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
            ) : usersData.map((u) => (
              <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                <TableCell>
                  <div className="font-medium">{u.nome || u.username}</div>
                  <div className="text-xs text-muted-foreground">@{u.username}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email || "—"}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? ROLE_COLORS.operador}`}>
                    {u.role === "admin" && <ShieldCheck className="w-3 h-3" />}
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={u.ativo ? "default" : "secondary"}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(u)} data-testid={`button-edit-user-${u.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {u.id !== me?.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Remover usuário "${u.username}"?`)) deleteMutation.mutate(u.id); }}
                        data-testid={`button-delete-user-${u.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-username">Login *</Label>
                <Input
                  id="u-username"
                  data-testid="input-user-username"
                  value={fUsername}
                  onChange={(e) => setFUsername(e.target.value)}
                  placeholder="joao.silva"
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-nome">Nome exibido</Label>
                <Input
                  id="u-nome"
                  data-testid="input-user-nome"
                  value={fNome}
                  onChange={(e) => setFNome(e.target.value)}
                  placeholder="João Silva"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email">E-mail</Label>
              <Input
                id="u-email"
                data-testid="input-user-email"
                type="email"
                value={fEmail}
                onChange={(e) => setFEmail(e.target.value)}
                placeholder="joao@grafica.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-password">{editingId ? "Nova Senha (deixe vazio para não alterar)" : "Senha *"}</Label>
              <div className="relative">
                <Input
                  id="u-password"
                  data-testid="input-user-password"
                  type={showPw ? "text" : "password"}
                  value={fPassword}
                  onChange={(e) => setFPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-role">Perfil *</Label>
                <Select value={fRole} onValueChange={setFRole}>
                  <SelectTrigger id="u-role" data-testid="select-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={fAtivo} onCheckedChange={setFAtivo} data-testid="switch-user-ativo" />
                  <span className="text-sm text-muted-foreground">{fAtivo ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={isBusy || !fUsername.trim() || (!editingId && !fPassword.trim())}
              data-testid="button-save-user"
            >
              {isBusy ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
