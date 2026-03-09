import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PaymentMethod } from "@shared/schema";

interface MethodFormState {
  nome: string;
  ativo: boolean;
}

const emptyMethodForm: MethodFormState = { nome: "", ativo: true };

export default function PaymentMethodsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodForm, setMethodForm] = useState<MethodFormState>(emptyMethodForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nome: string; ativo: boolean }) =>
      apiRequest("POST", "/api/payment-methods", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Forma de pagamento criada." });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nome: string; ativo: boolean } }) =>
      apiRequest("PATCH", `/api/payment-methods/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Forma de pagamento atualizada." });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/payment-methods/${id}`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Forma de pagamento removida." });
      setDeleteId(null);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  function openCreate() {
    setEditingMethod(null);
    setMethodForm(emptyMethodForm);
    setDialogOpen(true);
  }

  function openEdit(method: PaymentMethod) {
    setEditingMethod(method);
    setMethodForm({ nome: method.nome, ativo: method.ativo });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!methodForm.nome.trim()) {
      toast({ title: "O nome é obrigatório.", variant: "destructive" });
      return;
    }
    if (editingMethod) {
      updateMutation.mutate({ id: editingMethod.id, data: methodForm });
    } else {
      createMutation.mutate(methodForm);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Formas de Pagamento</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as formas de pagamento disponíveis nos orçamentos e pedidos.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-nova-forma">
          <Plus className="w-4 h-4 mr-2" />
          Nova Forma
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : methods.length === 0 ? (
        <div className="py-16 border-2 border-dashed rounded-lg text-center">
          <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma forma de pagamento cadastrada.</p>
          <Button variant="outline" className="mt-3" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {methods.map((method) => (
            <Card key={method.id} data-testid={`card-method-${method.id}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{method.nome}</span>
                  <Badge variant={method.ativo ? "default" : "secondary"}>
                    {method.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(method)}
                    data-testid={`button-edit-method-${method.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setDeleteId(method.id)}
                    data-testid={`button-delete-method-${method.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMethod ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}</DialogTitle>
            <DialogDescription>
              {editingMethod ? "Altere os dados e salve." : "Informe o nome da forma de pagamento."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome-forma">Nome <span className="text-destructive">*</span></Label>
              <Input
                id="nome-forma"
                placeholder="Ex: PIX, Boleto Bancário, Cartão de Crédito..."
                value={methodForm.nome}
                onChange={(e) => setMethodForm((f) => ({ ...f, nome: e.target.value }))}
                data-testid="input-nome-forma"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="ativo-forma"
                checked={methodForm.ativo}
                onCheckedChange={(v) => setMethodForm((f) => ({ ...f, ativo: v }))}
                data-testid="switch-ativo-forma"
              />
              <Label htmlFor="ativo-forma">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isPending} data-testid="button-save-forma">
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover forma de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A forma será removida permanentemente.
            </AlertDialogDescription>
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
