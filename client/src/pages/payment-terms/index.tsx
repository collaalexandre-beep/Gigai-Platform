import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, Clock, Check } from "lucide-react";
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
import type { PaymentTerm } from "@shared/schema";

function diasLabel(dias: number[]): string {
  if (!dias || dias.length === 0) return "Sem parcelas";
  return dias.map((d) => (d === 0 ? "Entrada" : `${d}d`)).join(" / ");
}

function diasPreview(dias: number[]): string {
  if (!dias || dias.length === 0) return "";
  const parts = dias.map((d) => (d === 0 ? "Entrada" : `${d} dias`));
  return parts.join(" + ");
}

interface TermFormState {
  nome: string;
  dias: number[];
  ativo: boolean;
  diaInput: string;
}

const emptyTermForm: TermFormState = { nome: "", dias: [], ativo: true, diaInput: "" };

export default function PaymentTermsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  const [termForm, setTermForm] = useState<TermFormState>(emptyTermForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: terms = [], isLoading } = useQuery<PaymentTerm[]>({
    queryKey: ["/api/payment-terms"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { nome: string; dias: number[]; ativo: boolean }) =>
      apiRequest("POST", "/api/payment-terms", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-terms"] });
      toast({ title: "Prazo de pagamento criado." });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nome: string; dias: number[]; ativo: boolean } }) =>
      apiRequest("PATCH", `/api/payment-terms/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-terms"] });
      toast({ title: "Prazo atualizado." });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/payment-terms/${id}`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-terms"] });
      toast({ title: "Prazo removido." });
      setDeleteId(null);
    },
    onError: (err: Error) => toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  function openNew() {
    setEditingTerm(null);
    setTermForm(emptyTermForm);
    setDialogOpen(true);
  }

  function openEdit(term: PaymentTerm) {
    setEditingTerm(term);
    setTermForm({ nome: term.nome, dias: [...term.dias], ativo: term.ativo, diaInput: "" });
    setDialogOpen(true);
  }

  function addDia() {
    const val = parseInt(termForm.diaInput, 10);
    if (isNaN(val) || val < 0) {
      toast({ title: "Digite um número de dias válido (0 ou mais).", variant: "destructive" });
      return;
    }
    if (termForm.dias.includes(val)) {
      toast({ title: `O prazo de ${val} dias já foi adicionado.`, variant: "destructive" });
      return;
    }
    const newDias = [...termForm.dias, val].sort((a, b) => a - b);
    setTermForm((prev) => ({ ...prev, dias: newDias, diaInput: "" }));
  }

  function removeDia(dia: number) {
    setTermForm((prev) => ({ ...prev, dias: prev.dias.filter((d) => d !== dia) }));
  }

  function handleSubmit() {
    if (!termForm.nome.trim()) {
      toast({ title: "Nome do prazo é obrigatório.", variant: "destructive" });
      return;
    }
    if (termForm.dias.length === 0) {
      toast({ title: "Adicione pelo menos um prazo (em dias).", variant: "destructive" });
      return;
    }
    const data = { nome: termForm.nome, dias: termForm.dias, ativo: termForm.ativo };
    if (editingTerm) {
      updateMutation.mutate({ id: editingTerm.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prazos de Pagamento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure os prazos de pagamento disponíveis para orçamentos e pedidos
          </p>
        </div>
        <Button onClick={openNew} data-testid="button-new-payment-term">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Prazo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : terms.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl border-border">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum prazo cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Crie prazos como "30/60" ou "Entrada + 30 + 60 dias"
          </p>
          <Button variant="outline" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1.5" />
            Criar primeiro prazo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {terms.map((term) => (
            <Card key={term.id} data-testid={`card-term-${term.id}`} className={!term.ativo ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground" data-testid={`text-term-nome-${term.id}`}>
                      {term.nome}
                    </span>
                    {!term.ativo && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {term.dias.map((d) => (
                      <Badge
                        key={d}
                        variant="outline"
                        className="text-xs font-mono no-default-active-elevate"
                        data-testid={`badge-dia-${term.id}-${d}`}
                      >
                        {d === 0 ? "Entrada" : `${d}d`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {diasPreview(term.dias)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(term)}
                    data-testid={`button-edit-term-${term.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(term.id)}
                    data-testid={`button-delete-term-${term.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTerm ? "Editar Prazo" : "Novo Prazo de Pagamento"}</DialogTitle>
            <DialogDescription>Configure o nome e os dias de cada parcela do prazo de pagamento.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <Label htmlFor="term-nome" className="text-sm">
                Nome do Prazo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="term-nome"
                className="mt-1"
                value={termForm.nome}
                onChange={(e) => setTermForm((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: 30/60, À Vista, 30/60/90"
                data-testid="input-term-nome"
              />
            </div>

            <div>
              <Label className="text-sm">
                Dias das Parcelas <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Use 0 para entrada. Adicione cada parcela separadamente.
              </p>

              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  value={termForm.diaInput}
                  onChange={(e) => setTermForm((prev) => ({ ...prev, diaInput: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDia(); } }}
                  placeholder="Ex: 0, 30, 60..."
                  className="font-mono w-40"
                  data-testid="input-term-dias"
                />
                <Button type="button" variant="secondary" onClick={addDia} data-testid="button-add-dia">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {termForm.dias.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {termForm.dias.map((d) => (
                      <div
                        key={d}
                        className="flex items-center gap-1 bg-muted rounded-md px-2 py-1"
                        data-testid={`chip-dia-${d}`}
                      >
                        <span className="text-sm font-mono font-medium">
                          {d === 0 ? "Entrada" : `${d}d`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDia(d)}
                          className="text-muted-foreground hover:text-foreground ml-0.5"
                          data-testid={`button-remove-dia-${d}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Visualização:</span> {diasPreview(termForm.dias)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="term-ativo"
                checked={termForm.ativo}
                onCheckedChange={(v) => setTermForm((prev) => ({ ...prev, ativo: v }))}
                data-testid="switch-term-ativo"
              />
              <Label htmlFor="term-ativo" className="text-sm">Prazo ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving} data-testid="button-save-term">
              {isSaving ? (
                <><span className="w-4 h-4 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />Salvando...</>
              ) : (
                <><Check className="w-4 h-4 mr-1.5" />{editingTerm ? "Salvar" : "Criar prazo"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover prazo?</AlertDialogTitle>
            <AlertDialogDescription>
              Este prazo será removido permanentemente e não poderá ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-term"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
