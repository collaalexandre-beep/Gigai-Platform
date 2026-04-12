import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  insertVehicleMaintenanceItemSchema,
  insertVehicleMaintenanceHistorySchema,
  insertVehicleIssueReportSchema,
} from "@shared/schema";
import type {
  Vehicle,
  VehicleMaintenanceItem,
  VehicleMaintenanceHistory,
  VehicleIssueReport,
  VehicleExit,
  Seller,
  VehicleMaintenanceTemplate,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Car,
  CheckCheck,
  CheckCircle2,
  Clock,
  Edit,
  Fuel,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
  Settings,
  Trash2,
  Wrench,
  FileText,
  AlertCircle,
  XCircle,
  TextCursorInput,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type MaintenanceItemWithStatus = VehicleMaintenanceItem & { statusCalculado: "verde" | "amarelo" | "vermelho" };
type IssueReportWithReporter = VehicleIssueReport & { reporterName?: string | null };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MANUT_STATUS_CONFIG = {
  verde:    { label: "OK",       badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",  dot: "bg-green-500"  },
  amarelo:  { label: "Próximo",  badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-400" },
  vermelho: { label: "Vencido",  badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",         dot: "bg-red-500"    },
};

const GRAVITY_CONFIG = {
  baixa:  { label: "Baixa",  badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"    },
  media:  { label: "Média",  badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  alta:   { label: "Alta",   badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"        },
};

const ISSUE_STATUS_CONFIG = {
  aberto:     { label: "Aberto",      badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"      },
  em_analise: { label: "Em análise",  badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  resolvido:  { label: "Resolvido",   badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"  },
};

const FUEL_LABELS: Record<string, string> = {
  gasolina: "Gasolina", etanol: "Etanol", diesel: "Diesel",
  flex: "Flex", gnv: "GNV", eletrico: "Elétrico", hibrido: "Híbrido",
};

function fmt(date?: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function fmtKm(km?: string | number | null) {
  if (km === null || km === undefined) return "—";
  return Number(km).toLocaleString("pt-BR") + " km";
}

// ─── Schemas para formulários ─────────────────────────────────────────────────

const itemFormSchema = insertVehicleMaintenanceItemSchema.omit({ vehicleId: true }).extend({
  nome: z.string().min(1, "Nome obrigatório"),
  periodicidadeKm: z.string().nullable().optional(),
  periodicidadeMeses: z.coerce.number().nullable().optional(),
  alertaAmareloKm: z.string().nullable().optional(),
  alertaAmareloDias: z.coerce.number().nullable().optional(),
  ultimaManutencaoData: z.string().nullable().optional(),
  proximaManutencaoData: z.string().nullable().optional(),
  ultimaManutencaoKm: z.string().nullable().optional(),
  proximaManutencaoKm: z.string().nullable().optional(),
});
type ItemFormValues = z.infer<typeof itemFormSchema>;

const historyFormSchema = z.object({
  nomeItem: z.string().min(1, "Nome obrigatório"),
  data: z.string().min(1, "Data obrigatória"),
  kmNoMomento: z.string().nullable().optional(),
  descricaoServico: z.string().nullable().optional(),
  oficina: z.string().nullable().optional(),
  custo: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  itemId: z.string().nullable().optional(),
});
type HistoryFormValues = z.infer<typeof historyFormSchema>;

const issueFormSchema = z.object({
  descricao: z.string().min(5, "Descrição deve ter ao menos 5 caracteres"),
  categoria: z.string().nullable().optional(),
  gravidade: z.enum(["baixa", "media", "alta"]),
});
type IssueFormValues = z.infer<typeof issueFormSchema>;

// ─── Tipos do Resolver ───────────────────────────────────────────────────────

interface ResolverItem {
  nome: string;
  periodicidadeKm: number | null;
  periodicidadeMeses: number | null;
  observacoes?: string;
}

interface ResolverResult {
  found: boolean;
  template: VehicleMaintenanceTemplate | null;
  items: ResolverItem[];
  sourceType: string;
  sourceTitle: string;
  searchQuery: string;
  error?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  banco_homologado: "Plano homologado",
  ia_gerado: "Gerado por IA",
  manual: "Inserido manualmente",
};

// ─── Componente: Dialog do Resolver de Plano de Manutenção ───────────────────

function MaintenancePlanResolverDialog({
  vehicleId,
  onApplied,
}: {
  vehicleId: string;
  onApplied: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<
    "initial" | "searching" | "result" | "editing" | "manual_input" | "manual_searching"
  >("initial");
  const [result, setResult] = useState<ResolverResult | null>(null);
  const [editableItems, setEditableItems] = useState<ResolverItem[]>([]);
  const [manualText, setManualText] = useState("");

  function resetDialog() {
    setStep("initial");
    setResult(null);
    setEditableItems([]);
    setManualText("");
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (!o) resetDialog();
  }

  // Buscar automaticamente (IA)
  const searchMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/vehicles/${vehicleId}/search-maintenance-plan`);
      return res.json() as Promise<ResolverResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setEditableItems(data.items);
      setStep("result");
    },
    onError: () => {
      toast({ title: "Erro na busca", description: "Não foi possível contatar a IA.", variant: "destructive" });
      setStep("initial");
    },
  });

  // Buscar a partir de texto colado
  const manualSearchMut = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/vehicles/${vehicleId}/search-maintenance-plan/manual`, { text });
      return res.json() as Promise<ResolverResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setEditableItems(data.items);
      setStep("result");
    },
    onError: () => {
      toast({ title: "Erro ao processar texto", variant: "destructive" });
      setStep("manual_input");
    },
  });

  // Aprovar template (sem editar)
  const approveMut = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("PATCH", `/api/maintenance-templates/${templateId}`, {
        approvalStatus: "aprovado",
      });
      return res.json();
    },
  });

  // Salvar itens editados no template
  const saveEditsMut = useMutation({
    mutationFn: async ({ templateId, items }: { templateId: string; items: ResolverItem[] }) => {
      const res = await apiRequest("PATCH", `/api/maintenance-templates/${templateId}`, {
        items,
        approvalStatus: "aprovado",
      });
      return res.json();
    },
  });

  // Aplicar template ao veículo
  const applyMut = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("POST", `/api/vehicles/${vehicleId}/apply-template/${templateId}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "maintenance-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/summary"] });
      toast({
        title: "Plano aplicado com sucesso",
        description: `${data.created} item(s) adicionado(s). ${data.skipped} já existia(m).`,
      });
      setOpen(false);
      onApplied();
    },
    onError: () => toast({ title: "Erro ao aplicar plano", variant: "destructive" }),
  });

  // Rejeitar template
  const rejectMut = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("PATCH", `/api/maintenance-templates/${templateId}`, {
        approvalStatus: "rejeitado",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Plano rejeitado", description: "O rascunho foi marcado como rejeitado." });
      setOpen(false);
    },
  });

  async function handleApproveAndApply() {
    if (!result?.template?.id) return;
    await approveMut.mutateAsync(result.template.id);
    applyMut.mutate(result.template.id);
  }

  async function handleSaveEditsAndApply() {
    if (!result?.template?.id) return;
    await saveEditsMut.mutateAsync({ templateId: result.template.id, items: editableItems });
    applyMut.mutate(result.template.id);
  }

  function updateEditableItem(idx: number, field: keyof ResolverItem, value: string | number | null) {
    setEditableItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  function removeEditableItem(idx: number) {
    setEditableItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const isPendingAny =
    searchMut.isPending ||
    manualSearchMut.isPending ||
    approveMut.isPending ||
    saveEditsMut.isPending ||
    applyMut.isPending ||
    rejectMut.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-search-maintenance-plan">
          <Bot className="w-3.5 h-3.5 mr-1.5" />
          Buscar plano por IA
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Resolver plano de manutenção
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP: initial ── */}
        {step === "initial" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O sistema irá buscar ou gerar um plano de manutenção adequado para este veículo
              com base em marca, modelo, ano e combustível. O plano será criado como{" "}
              <strong>rascunho</strong> — você revisa antes de ativar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                className="rounded-lg border-2 border-primary/30 hover:border-primary/70 p-4 text-left transition-colors"
                onClick={() => { setStep("searching"); searchMut.mutate(); }}
                data-testid="button-resolver-auto"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="font-medium text-sm">Buscar automaticamente</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  A IA gera um plano completo baseado nos dados do veículo cadastrado.
                </p>
              </button>
              <button
                className="rounded-lg border-2 border-muted hover:border-primary/40 p-4 text-left transition-colors"
                onClick={() => setStep("manual_input")}
                data-testid="button-resolver-manual"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <TextCursorInput className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-sm">Inserir manualmente</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole o texto do manual ou tabela de revisões. A IA extrai os intervalos.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: searching ── */}
        {(step === "searching" || step === "manual_searching") && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {step === "manual_searching"
                ? "Processando texto com IA..."
                : "Consultando banco de dados e IA..."}
            </p>
          </div>
        )}

        {/* ── STEP: manual_input ── */}
        {step === "manual_input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole o texto do manual do proprietário, tabela de revisões ou qualquer fonte que
              contenha os intervalos de manutenção.
            </p>
            <Textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={8}
              placeholder="Cole aqui o texto do manual de manutenção..."
              data-testid="textarea-manual-text"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!manualText.trim()) {
                    toast({ title: "Cole o texto antes de continuar", variant: "destructive" });
                    return;
                  }
                  setStep("manual_searching");
                  manualSearchMut.mutate(manualText);
                }}
                disabled={isPendingAny}
                data-testid="button-resolver-manual-submit"
              >
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Processar texto
              </Button>
              <Button variant="outline" onClick={() => setStep("initial")}>Voltar</Button>
            </div>
          </div>
        )}

        {/* ── STEP: result ── */}
        {step === "result" && result && (
          <div className="space-y-4">
            {/* Fonte */}
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Fonte:</span>
                <span className="text-muted-foreground">{result.sourceTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Tipo:</span>
                <Badge variant="outline" className="text-xs">
                  {SOURCE_LABELS[result.sourceType] ?? result.sourceType}
                </Badge>
              </div>
              {result.template?.approvalStatus === "rascunho" && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Rascunho — não está ativo até ser aprovado
                </p>
              )}
              {result.template?.approvalStatus === "aprovado" && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Plano homologado aprovado
                </p>
              )}
            </div>

            {/* Tabela de itens */}
            <div>
              <p className="text-sm font-medium mb-2">{result.items.length} item(s) encontrado(s):</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Item</th>
                      <th className="text-center p-2 font-medium w-24">A cada (km)</th>
                      <th className="text-center p-2 font-medium w-24">A cada (meses)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{it.nome}</td>
                        <td className="p-2 text-center text-muted-foreground">
                          {it.periodicidadeKm ? Number(it.periodicidadeKm).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="p-2 text-center text-muted-foreground">
                          {it.periodicidadeMeses ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {result.error && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Erro: {result.error}
              </p>
            )}

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                onClick={handleApproveAndApply}
                disabled={isPendingAny || result.items.length === 0}
                data-testid="button-resolver-approve-apply"
              >
                {(approveMut.isPending || applyMut.isPending) && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Aprovar e aplicar
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("editing")}
                disabled={isPendingAny}
                data-testid="button-resolver-edit"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Editar antes de aplicar
              </Button>
              {result.template && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => result.template && rejectMut.mutate(result.template.id)}
                  disabled={isPendingAny}
                  data-testid="button-resolver-reject"
                >
                  {rejectMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Rejeitar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: editing ── */}
        {step === "editing" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Revise os itens abaixo. Ajuste intervalos, remova itens não aplicáveis e clique em
              <strong> Salvar e aplicar</strong> quando estiver pronto.
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {editableItems.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center p-2 rounded border text-xs">
                  <Input
                    value={it.nome}
                    onChange={(e) => updateEditableItem(idx, "nome", e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Nome do item"
                  />
                  <Input
                    value={it.periodicidadeKm ?? ""}
                    onChange={(e) => updateEditableItem(idx, "periodicidadeKm", e.target.value ? Number(e.target.value) : null)}
                    className="h-7 text-xs w-24"
                    placeholder="KM"
                    type="number"
                  />
                  <Input
                    value={it.periodicidadeMeses ?? ""}
                    onChange={(e) => updateEditableItem(idx, "periodicidadeMeses", e.target.value ? Number(e.target.value) : null)}
                    className="h-7 text-xs w-20"
                    placeholder="Meses"
                    type="number"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeEditableItem(idx)}
                    title="Remover item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSaveEditsAndApply}
                disabled={isPendingAny || editableItems.length === 0}
                data-testid="button-resolver-save-edits"
              >
                {(saveEditsMut.isPending || applyMut.isPending) && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Salvar e aplicar
              </Button>
              <Button variant="outline" onClick={() => setStep("result")}>Voltar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente da aba: Manutenção ────────────────────────────────────────────

function AbaManutencao({ vehicleId, kmAtual }: { vehicleId: string; kmAtual: number | null }) {
  const { toast } = useToast();
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MaintenanceItemWithStatus | null>(null);
  const [logItemId, setLogItemId] = useState<string | null>(null);
  const [logItemName, setLogItemName] = useState<string>("");

  const { data: items = [], isLoading } = useQuery<MaintenanceItemWithStatus[]>({
    queryKey: ["/api/vehicles", vehicleId, "maintenance-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/vehicles/${vehicleId}/maintenance-items`);
      return res.json();
    },
  });

  const { data: history = [] } = useQuery<VehicleMaintenanceHistory[]>({
    queryKey: ["/api/vehicles", vehicleId, "maintenance-history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/vehicles/${vehicleId}/maintenance-history`);
      return res.json();
    },
  });

  const importBaseMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/vehicles/${vehicleId}/maintenance-items/import-base`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "maintenance-items"] });
      toast({ title: "Plano base importado", description: `${data.created} itens adicionados.` });
    },
    onError: () => toast({ title: "Erro ao importar plano base", variant: "destructive" }),
  });

  const deleteItemMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/maintenance-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "maintenance-items"] });
      toast({ title: "Item removido" });
    },
    onError: () => toast({ title: "Erro ao remover item", variant: "destructive" }),
  });

  const createItemMut = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      const payload = {
        ...data,
        vehicleId,
        ultimaManutencaoData: data.ultimaManutencaoData ? new Date(data.ultimaManutencaoData) : null,
        proximaManutencaoData: data.proximaManutencaoData ? new Date(data.proximaManutencaoData) : null,
      };
      const res = await apiRequest("POST", `/api/vehicles/${vehicleId}/maintenance-items`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "maintenance-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/summary"] });
      toast({ title: "Item criado com sucesso" });
      setOpenItemDialog(false);
      setEditingItem(null);
    },
    onError: () => toast({ title: "Erro ao criar item", variant: "destructive" }),
  });

  const updateItemMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ItemFormValues> }) => {
      const payload = {
        ...data,
        ultimaManutencaoData: data.ultimaManutencaoData ? new Date(data.ultimaManutencaoData) : null,
        proximaManutencaoData: data.proximaManutencaoData ? new Date(data.proximaManutencaoData) : null,
      };
      const res = await apiRequest("PATCH", `/api/maintenance-items/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "maintenance-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/summary"] });
      toast({ title: "Item atualizado" });
      setOpenItemDialog(false);
      setEditingItem(null);
    },
    onError: () => toast({ title: "Erro ao atualizar item", variant: "destructive" }),
  });

  const logHistMut = useMutation({
    mutationFn: async (data: HistoryFormValues) => {
      const payload = {
        ...data,
        vehicleId,
        data: new Date(data.data),
      };
      const res = await apiRequest("POST", `/api/vehicles/${vehicleId}/maintenance-history`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "maintenance-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "maintenance-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId] });
      toast({ title: "Manutenção registrada", description: "Próxima manutenção recalculada automaticamente." });
      setLogItemId(null);
    },
    onError: () => toast({ title: "Erro ao registrar manutenção", variant: "destructive" }),
  });

  // Formulário de item
  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { nome: "", periodicidadeMeses: undefined, observacoes: "" },
  });

  // Formulário de histórico
  const histForm = useForm<HistoryFormValues>({
    resolver: zodResolver(historyFormSchema),
    defaultValues: {
      nomeItem: "",
      data: new Date().toISOString().slice(0, 10),
      kmNoMomento: kmAtual ? String(kmAtual) : "",
    },
  });

  const countVerde = items.filter(i => i.statusCalculado === "verde").length;
  const countAmarelo = items.filter(i => i.statusCalculado === "amarelo").length;
  const countVermelho = items.filter(i => i.statusCalculado === "vermelho").length;

  function openEditItem(item: MaintenanceItemWithStatus) {
    setEditingItem(item);
    itemForm.reset({
      nome: item.nome,
      periodicidadeKm: item.periodicidadeKm ?? undefined,
      periodicidadeMeses: item.periodicidadeMeses ?? undefined,
      alertaAmareloKm: item.alertaAmareloKm ?? undefined,
      alertaAmareloDias: item.alertaAmareloDias ?? undefined,
      ultimaManutencaoData: item.ultimaManutencaoData ? new Date(item.ultimaManutencaoData).toISOString().slice(0, 10) : undefined,
      proximaManutencaoData: item.proximaManutencaoData ? new Date(item.proximaManutencaoData).toISOString().slice(0, 10) : undefined,
      ultimaManutencaoKm: item.ultimaManutencaoKm ?? undefined,
      proximaManutencaoKm: item.proximaManutencaoKm ?? undefined,
      observacoes: item.observacoes ?? "",
      fonteTabela: item.fonteTabela ?? "",
      linkFonte: item.linkFonte ?? "",
    });
    setOpenItemDialog(true);
  }

  function openLogMaint(item: MaintenanceItemWithStatus) {
    setLogItemId(item.id);
    setLogItemName(item.nome);
    histForm.reset({
      nomeItem: item.nome,
      data: new Date().toISOString().slice(0, 10),
      kmNoMomento: kmAtual ? String(kmAtual) : "",
      itemId: item.id,
    });
  }

  return (
    <div className="space-y-5">
      {/* Resumo de status */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "OK", count: countVerde, cls: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" },
          { label: "Próximos", count: countAmarelo, cls: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800" },
          { label: "Vencidos", count: countVermelho, cls: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        <MaintenancePlanResolverDialog
          vehicleId={vehicleId}
          onApplied={() => {}}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => importBaseMut.mutate()}
          disabled={importBaseMut.isPending}
          data-testid="button-import-base"
        >
          {importBaseMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
          Importar plano base
        </Button>
        <Dialog open={openItemDialog} onOpenChange={(o) => { setOpenItemDialog(o); if (!o) { setEditingItem(null); itemForm.reset(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-new-maintenance-item">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Novo item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar item de manutenção" : "Novo item de manutenção"}</DialogTitle>
            </DialogHeader>
            <Form {...itemForm}>
              <form
                onSubmit={itemForm.handleSubmit((vals) => {
                  if (editingItem) updateItemMut.mutate({ id: editingItem.id, data: vals });
                  else createItemMut.mutate(vals);
                })}
                className="space-y-3"
              >
                <FormField control={itemForm.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do item *</FormLabel>
                    <FormControl><Input {...field} placeholder="Ex: Troca de óleo do motor" data-testid="input-item-nome" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={itemForm.control} name="periodicidadeKm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicidade (km)</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} placeholder="Ex: 10000" data-testid="input-item-periKm" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="periodicidadeMeses" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Periodicidade (meses)</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} type="number" placeholder="Ex: 12" data-testid="input-item-periMeses" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={itemForm.control} name="ultimaManutencaoData" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Última manutenção (data)</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} type="date" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="ultimaManutencaoKm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Última manutenção (km)</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} placeholder="Ex: 40000" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={itemForm.control} name="proximaManutencaoData" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próxima manutenção (data)</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} type="date" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="proximaManutencaoKm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próxima manutenção (km)</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} placeholder="Ex: 50000" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={itemForm.control} name="alertaAmareloKm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alerta amarelo (km antes)</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} placeholder="1000" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="alertaAmareloDias" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alerta amarelo (dias antes)</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} type="number" placeholder="30" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={itemForm.control} name="observacoes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea {...field} value={field.value ?? ""} rows={2} /></FormControl>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={itemForm.control} name="fonteTabela" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonte</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} placeholder="Ex: Manual do fabricante" /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={itemForm.control} name="linkFonte" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link da fonte</FormLabel>
                      <FormControl><Input {...field} value={field.value ?? ""} placeholder="https://" /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={createItemMut.isPending || updateItemMut.isPending} data-testid="button-save-item">
                    {(createItemMut.isPending || updateItemMut.isPending) && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Salvar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setOpenItemDialog(false); setEditingItem(null); }}>Cancelar</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog: registrar manutenção realizada */}
      <Dialog open={!!logItemId} onOpenChange={(o) => { if (!o) setLogItemId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar manutenção realizada</DialogTitle>
            {logItemName && <p className="text-sm text-muted-foreground mt-1">Item: <strong>{logItemName}</strong></p>}
          </DialogHeader>
          <Form {...histForm}>
            <form
              onSubmit={histForm.handleSubmit((vals) => logHistMut.mutate(vals))}
              className="space-y-3"
            >
              <FormField control={histForm.control} name="data" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da manutenção *</FormLabel>
                  <FormControl><Input {...field} type="date" data-testid="input-hist-data" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={histForm.control} name="kmNoMomento" render={({ field }) => (
                <FormItem>
                  <FormLabel>KM no momento</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} placeholder="Ex: 42000" data-testid="input-hist-km" /></FormControl>
                </FormItem>
              )} />
              <FormField control={histForm.control} name="descricaoServico" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do serviço</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ""} rows={2} placeholder="Descreva o serviço realizado..." data-testid="textarea-hist-descricao" /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={histForm.control} name="oficina" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oficina / Fornecedor</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} placeholder="Nome da oficina" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={histForm.control} name="custo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo (R$)</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ""} placeholder="0,00" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={histForm.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ""} rows={1} /></FormControl>
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={logHistMut.isPending} data-testid="button-save-hist">
                  {logHistMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Registrar
                </Button>
                <Button type="button" variant="outline" onClick={() => setLogItemId(null)}>Cancelar</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tabela de itens */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
          <Wrench className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium text-muted-foreground">Nenhum item de manutenção</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Importe o plano base ou adicione itens manualmente</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Item</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Periodicidade</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Última</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Próxima</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cfg = MANUT_STATUS_CONFIG[item.statusCalculado];
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors" data-testid={`row-maintenance-item-${item.id}`}>
                    <td className="px-4 py-3">
                      <span className={`inline-block w-3 h-3 rounded-full ${cfg.dot}`} title={cfg.label} />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div>{item.nome}</div>
                      <span className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badgeClass}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {item.periodicidadeKm && <div>{Number(item.periodicidadeKm).toLocaleString("pt-BR")} km</div>}
                      {item.periodicidadeMeses && <div>{item.periodicidadeMeses} meses</div>}
                      {!item.periodicidadeKm && !item.periodicidadeMeses && "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      <div>{fmt(item.ultimaManutencaoData)}</div>
                      {item.ultimaManutencaoKm && <div className="text-xs">{fmtKm(item.ultimaManutencaoKm)}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className={item.statusCalculado !== "verde" ? "font-semibold" : "text-muted-foreground"}>
                        {fmt(item.proximaManutencaoData)}
                      </div>
                      {item.proximaManutencaoKm && (
                        <div className="text-xs text-muted-foreground">{fmtKm(item.proximaManutencaoKm)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Registrar manutenção"
                          onClick={() => openLogMaint(item)}
                          data-testid={`button-log-maint-${item.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Editar"
                          onClick={() => openEditItem(item)}
                          data-testid={`button-edit-item-${item.id}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          title="Excluir"
                          onClick={() => { if (confirm("Remover este item?")) deleteItemMut.mutate(item.id); }}
                          data-testid={`button-delete-item-${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Histórico recente */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico recente</h3>
          <div className="space-y-1">
            {history.slice(0, 8).map((h) => (
              <div key={h.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border text-sm" data-testid={`row-history-${h.id}`}>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{h.nomeItem}</span>
                  {h.descricaoServico && <span className="text-muted-foreground ml-1">— {h.descricaoServico}</span>}
                </div>
                <div className="text-right flex-shrink-0 text-muted-foreground text-xs space-y-0.5">
                  <div>{fmt(h.data)}</div>
                  {h.kmNoMomento && <div>{fmtKm(h.kmNoMomento)}</div>}
                  {h.custo && <div>R$ {Number(h.custo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente da aba: Ocorrências ───────────────────────────────────────────

function AbaOcorrencias({ vehicleId }: { vehicleId: string }) {
  const { toast } = useToast();
  const [openNewIssue, setOpenNewIssue] = useState(false);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [respostaText, setRespostaText] = useState("");

  const { data: reports = [], isLoading } = useQuery<IssueReportWithReporter[]>({
    queryKey: ["/api/vehicles", vehicleId, "issue-reports", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "todos") params.set("status", statusFilter);
      const res = await apiRequest("GET", `/api/vehicles/${vehicleId}/issue-reports?${params}`);
      return res.json();
    },
  });

  const createIssueMut = useMutation({
    mutationFn: async (data: IssueFormValues) => {
      const res = await apiRequest("POST", `/api/vehicles/${vehicleId}/issue-reports`, {
        ...data,
        vehicleId,
        dataHora: new Date(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "issue-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/summary"] });
      toast({ title: "Ocorrência registrada", description: "A equipe foi notificada." });
      setOpenNewIssue(false);
      issueForm.reset();
    },
    onError: () => toast({ title: "Erro ao registrar ocorrência", variant: "destructive" }),
  });

  const updateIssueMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/issue-reports/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicleId, "issue-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/summary"] });
      toast({ title: "Ocorrência atualizada" });
      setResolvingId(null);
      setRespostaText("");
    },
    onError: () => toast({ title: "Erro ao atualizar ocorrência", variant: "destructive" }),
  });

  const issueForm = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: { descricao: "", gravidade: "media" },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="select-issue-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberto">Abertos</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="resolvido">Resolvidos</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={openNewIssue} onOpenChange={setOpenNewIssue}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-new-issue">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nova ocorrência
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar ocorrência / problema</DialogTitle>
            </DialogHeader>
            <Form {...issueForm}>
              <form onSubmit={issueForm.handleSubmit((v) => createIssueMut.mutate(v))} className="space-y-3">
                <FormField control={issueForm.control} name="descricao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Descreva o problema observado..." data-testid="textarea-issue-descricao" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={issueForm.control} name="categoria" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="Ex: Freios, Motor..." data-testid="input-issue-categoria" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={issueForm.control} name="gravidade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gravidade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-issue-gravidade">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={createIssueMut.isPending} data-testid="button-save-issue">
                    {createIssueMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    Registrar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpenNewIssue(false)}>Cancelar</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
          <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
          <p className="font-medium text-muted-foreground">Nenhuma ocorrência encontrada</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Este veículo não tem relatos de problemas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const statusCfg = ISSUE_STATUS_CONFIG[r.status];
            const gravCfg = GRAVITY_CONFIG[r.gravidade];
            return (
              <div
                key={r.id}
                className={`rounded-lg border p-4 space-y-2 ${r.status === "aberto" ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10" : ""}`}
                data-testid={`card-issue-${r.id}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.badgeClass}`}>{statusCfg.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${gravCfg.badgeClass}`}>{gravCfg.label}</span>
                    {r.categoria && <span className="text-xs text-muted-foreground">{r.categoria}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {fmt(r.dataHora)}
                    {r.reporterName && <span className="ml-1">— {r.reporterName}</span>}
                  </div>
                </div>

                <p className="text-sm">{r.descricao}</p>

                {r.respostaAdmin && (
                  <div className="bg-muted/40 rounded-md px-3 py-2 text-xs border-l-2 border-primary/40">
                    <span className="font-semibold text-primary/80">Resposta: </span>
                    {r.respostaAdmin}
                  </div>
                )}

                {/* Ações para administrador */}
                {r.status !== "resolvido" && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {r.status === "aberto" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => updateIssueMut.mutate({ id: r.id, data: { status: "em_analise" } })}
                        disabled={updateIssueMut.isPending}
                        data-testid={`button-analisar-issue-${r.id}`}
                      >
                        Em análise
                      </Button>
                    )}
                    {resolvingId === r.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          className="h-7 text-xs flex-1"
                          placeholder="Resposta da administração (opcional)..."
                          value={respostaText}
                          onChange={(e) => setRespostaText(e.target.value)}
                          data-testid="input-resposta-admin"
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => updateIssueMut.mutate({
                            id: r.id,
                            data: { status: "resolvido", respostaAdmin: respostaText || null, dataResolucao: new Date() }
                          })}
                          disabled={updateIssueMut.isPending}
                          data-testid={`button-confirm-resolve-${r.id}`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Confirmar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setResolvingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => { setResolvingId(r.id); setRespostaText(""); }}
                        data-testid={`button-resolver-issue-${r.id}`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Resolver
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: ["/api/vehicles", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/vehicles/${id}`);
      return res.json();
    },
    enabled: !!id,
  });

  const { data: exits = [] } = useQuery<(VehicleExit & { vehicle: Vehicle; driver: { id: string; nomeCompleto: string } })[]>({
    queryKey: ["/api/vehicle-exits", { vehicleId: id }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/vehicle-exits?vehicleId=${id}`);
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-40 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-6 text-center py-20">
        <p className="text-muted-foreground">Veículo não encontrado.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/vehicles"><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Link>
        </Button>
      </div>
    );
  }

  const kmAtual = vehicle.kmAtual ? Number(vehicle.kmAtual) : null;
  const recentExits = exits.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/vehicles"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{vehicle.marca} {vehicle.modelo}</h1>
              {vehicle.ocorrenciaAberta && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  Ocorrência aberta
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground flex-wrap">
              <span className="font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">{vehicle.placa}</span>
              {vehicle.ano && <span>{vehicle.ano}</span>}
              {vehicle.cor && <span>{vehicle.cor}</span>}
              {vehicle.tipoCombustivel && <span>{FUEL_LABELS[vehicle.tipoCombustivel]}</span>}
              {kmAtual !== null && (
                <span className="flex items-center gap-1">
                  <Car className="w-3.5 h-3.5" />
                  {kmAtual.toLocaleString("pt-BR")} km
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/vehicles/${id}/edit`} data-testid="button-edit-vehicle">
              <Settings className="w-4 h-4 mr-2" />
              Editar
            </Link>
          </Button>
          {vehicle.status !== "inativo" && (
            <Button asChild>
              <Link href={`/vehicles/exits/new?vehicleId=${id}`} data-testid="button-new-exit">
                <Car className="w-4 h-4 mr-2" />
                Registrar saída
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="manutencao">
        <TabsList>
          <TabsTrigger value="geral" data-testid="tab-geral">
            <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="manutencao" data-testid="tab-manutencao">
            <Wrench className="w-3.5 h-3.5 mr-1.5" />
            Manutenção
          </TabsTrigger>
          <TabsTrigger value="ocorrencias" data-testid="tab-ocorrencias">
            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
            Ocorrências
          </TabsTrigger>
        </TabsList>

        {/* ── Visão Geral ── */}
        <TabsContent value="geral" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Dados do Veículo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "Placa", value: vehicle.placa },
                  { label: "Marca", value: vehicle.marca },
                  { label: "Modelo", value: vehicle.modelo },
                  { label: "Ano", value: vehicle.ano ?? "—" },
                  { label: "Cor", value: vehicle.cor ?? "—" },
                  { label: "Nº Interno", value: vehicle.numeroInterno ?? "—" },
                  { label: "Combustível", value: vehicle.tipoCombustivel ? FUEL_LABELS[vehicle.tipoCombustivel] : "—" },
                  { label: "KM Atual", value: kmAtual !== null ? fmtKm(kmAtual) : "—" },
                  { label: "Consumo médio", value: vehicle.consumoMedioKmL ? `${vehicle.consumoMedioKmL} km/l` : "—" },
                  { label: "Status", value: vehicle.status },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
                {vehicle.observacoes && (
                  <div className="pt-1 border-t">
                    <p className="text-muted-foreground text-xs mb-1">Observações</p>
                    <p>{vehicle.observacoes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Últimas Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                {recentExits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma saída registrada</p>
                ) : (
                  <div className="space-y-2">
                    {recentExits.map((exit) => (
                      <Link key={exit.id} href={`/vehicles/exits/${exit.id}`}>
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer text-sm" data-testid={`row-exit-${exit.id}`}>
                          <div>
                            <p className="font-medium">{exit.driver.nomeCompleto}</p>
                            <p className="text-xs text-muted-foreground">{fmt(exit.dataHoraSaida)}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              exit.status === "em_rota"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : exit.status === "finalizada"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}>
                              {exit.status === "em_rota" ? "Em rota" : exit.status === "finalizada" ? "Finalizada" : "Cancelada"}
                            </span>
                            {exit.kmPercorridos && (
                              <p className="text-xs text-muted-foreground mt-0.5">{fmtKm(exit.kmPercorridos)}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" asChild>
                      <Link href={`/vehicles/exits?vehicleId=${id}`}>Ver todas as saídas</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Manutenção ── */}
        <TabsContent value="manutencao" className="mt-4">
          <AbaManutencao vehicleId={id!} kmAtual={kmAtual} />
        </TabsContent>

        {/* ── Ocorrências ── */}
        <TabsContent value="ocorrencias" className="mt-4">
          <AbaOcorrencias vehicleId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
