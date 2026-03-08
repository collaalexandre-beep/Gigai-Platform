import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CheckSquare, Plus, Calendar, AlertCircle, Clock, Building2,
  Check, Filter, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, Client } from "@shared/schema";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NewTaskDialogProps {
  open: boolean;
  onClose: () => void;
  clients?: Client[];
}

function NewTaskDialog({ open, onClose, clients }: NewTaskDialogProps) {
  const { toast } = useToast();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [clientId, setClientId] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/tasks", {
        titulo,
        descricao,
        prioridade,
        clientId: clientId || undefined,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
        status: "pendente",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Tarefa criada com sucesso." });
      setTitulo("");
      setDescricao("");
      setPrioridade("media");
      setClientId("");
      setDataVencimento("");
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: `Erro: ${err.message}`, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Descreva a tarefa..."
              className="mt-1"
              data-testid="input-task-titulo"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              placeholder="Detalhes adicionais..."
              className="mt-1"
              data-testid="input-task-descricao"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger className="mt-1" data-testid="select-task-prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="mt-1"
                data-testid="input-task-vencimento"
              />
            </div>
          </div>
          <div>
            <Label>Cliente (opcional)</Label>
            <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1" data-testid="select-task-client">
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem cliente</SelectItem>
                {clients?.slice(0, 50).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nomeFantasia || c.razaoSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => titulo && mutation.mutate()}
            disabled={!titulo || mutation.isPending}
            data-testid="button-save-task"
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Salvando...</>
            ) : "Criar tarefa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function taskDueDateLabel(dateStr: string | null): { label: string; urgent: boolean } {
  if (!dateStr) return { label: "", urgent: false };
  const dt = new Date(dateStr);
  if (isPast(dt) && !isToday(dt)) return { label: "Atrasada", urgent: true };
  if (isToday(dt)) return { label: "Hoje", urgent: true };
  return {
    label: formatDistanceToNow(dt, { addSuffix: true, locale: ptBR }),
    urgent: false,
  };
}

export default function CrmPage() {
  const { toast } = useToast();
  const [newTaskDialog, setNewTaskDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pendente");

  const { data: tasksData, isLoading: loadingTasks } = useQuery<{ data: Task[]; total: number }>({
    queryKey: ["/api/tasks", { status: statusFilter }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") p.set("status", statusFilter);
      p.set("limit", "100");
      return fetch(`/api/tasks?${p}`).then((r) => r.json());
    },
  });

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ["/api/clients", { limit: 100 }],
    queryFn: () => fetch("/api/clients?limit=100").then((r) => r.json()),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Tarefa atualizada." });
    },
  });

  const tasks = tasksData?.data || [];
  const pendentes = tasks.filter((t) => t.status === "pendente");
  const emAndamento = tasks.filter((t) => t.status === "em_andamento");
  const concluidas = tasks.filter((t) => t.status === "concluida");

  const clientMap = Object.fromEntries(
    (clientsData?.data || []).map((c) => [c.id, c])
  );

  function TaskCard({ task }: { task: Task }) {
    const client = task.clientId ? clientMap[task.clientId] : null;
    const due = task.dataVencimento ? taskDueDateLabel(task.dataVencimento) : null;

    return (
      <div
        className="border rounded-lg bg-card p-3 space-y-2"
        data-testid={`card-task-${task.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground leading-snug">{task.titulo}</p>
          <StatusBadge value={task.prioridade} type="taskPriority" />
        </div>
        {task.descricao && (
          <p className="text-xs text-muted-foreground">{task.descricao}</p>
        )}
        {client && (
          <Link href={`/clients/${client.id}`}>
            <div className="flex items-center gap-1 text-xs text-primary">
              <Building2 className="w-3 h-3" />
              {client.nomeFantasia || client.razaoSocial}
            </div>
          </Link>
        )}
        {due && (
          <div className={`flex items-center gap-1 text-xs ${due.urgent ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {due.urgent ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {due.label}
          </div>
        )}
        <div className="flex gap-1 pt-1">
          {task.status !== "concluida" && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={() => updateTaskMutation.mutate({ id: task.id, status: "concluida" })}
              data-testid={`button-complete-task-${task.id}`}
            >
              <Check className="w-3 h-3 mr-0.5" /> Concluir
            </Button>
          )}
          {task.status === "pendente" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={() => updateTaskMutation.mutate({ id: task.id, status: "em_andamento" })}
              data-testid={`button-start-task-${task.id}`}
            >
              Iniciar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie tarefas e follow-ups da equipe comercial
          </p>
        </div>
        <Button onClick={() => setNewTaskDialog(true)} data-testid="button-new-task">
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Tarefa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "Todas" },
          { value: "pendente", label: "Pendentes" },
          { value: "em_andamento", label: "Em andamento" },
          { value: "concluida", label: "Concluídas" },
        ].map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(opt.value)}
            data-testid={`filter-task-${opt.value}`}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {loadingTasks ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : statusFilter === "all" ? (
        /* Kanban view when showing all */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Pendente", tasks: pendentes, color: "border-yellow-400", count: pendentes.length },
            { label: "Em Andamento", tasks: emAndamento, color: "border-blue-400", count: emAndamento.length },
            { label: "Concluída", tasks: concluidas, color: "border-green-400", count: concluidas.length },
          ].map((col) => (
            <div key={col.label} className="space-y-2">
              <div className={`flex items-center justify-between border-b-2 ${col.color} pb-2`}>
                <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                <Badge variant="secondary" className="text-xs no-default-active-elevate">
                  {col.count}
                </Badge>
              </div>
              <div className="space-y-2">
                {col.tasks.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">Nenhuma tarefa</p>
                  </div>
                ) : (
                  col.tasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view for filtered results */
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl p-16 text-center">
              <CheckSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa encontrada</p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setNewTaskDialog(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Nova tarefa
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </div>
      )}

      <NewTaskDialog
        open={newTaskDialog}
        onClose={() => setNewTaskDialog(false)}
        clients={clientsData?.data}
      />
    </div>
  );
}
