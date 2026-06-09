import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot, Brain, FileText, Upload, Trash2, Pencil, Save, X, Plus,
  Loader2, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { QuoteRule, AiAgentKnowledgeFile } from "@shared/schema";

// ─── Instruções Tab ───────────────────────────────────────────────────────────

function InstrucoesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [instrucoes, setInstrucoes] = useState<string | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["/api/ai-agent/config"],
    queryFn: () =>
      fetch("/api/ai-agent/config").then((r) => r.json()).then((d) => {
        if (instrucoes === null) setInstrucoes(d.instrucoes ?? "");
        return d;
      }),
  });

  const saveMut = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/ai-agent/config", { instrucoes: instrucoes ?? "" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-agent/config"] });
      toast({ title: "Instruções salvas com sucesso" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Brain className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Instruções Globais do Agente</p>
          <p className="text-xs text-muted-foreground mt-1">
            Estas instruções são sempre incluídas em todos os orçamentos gerados pelo agente. Use para definir
            o comportamento padrão, regras de preço, margens de lucro, preferências de material e qualquer
            informação que o agente deve sempre considerar.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          <Label htmlFor="instrucoes">Instruções para o Agente</Label>
          <Textarea
            id="instrucoes"
            value={instrucoes ?? ""}
            onChange={(e) => setInstrucoes(e.target.value)}
            placeholder={`Exemplos:
- Sempre aplicar 30% de margem de lucro sobre o custo
- Bandeiras e faixas: calcular preço por unidade, não por m²
- Arredondar quantidade de chapas sempre para cima
- Instalação inclusa no preço para pedidos acima de R$5.000
- Nossa lona padrão é a lona blackout 440g
- Não incluir frete no orçamento — cobrar separado`}
            rows={14}
            className="font-mono text-sm"
            data-testid="textarea-agent-instructions"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {(instrucoes ?? "").length} caracteres
            </p>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              data-testid="button-save-instructions"
            >
              {saveMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Instruções
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────

function RegrasTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", descricao: "", regra: "", ativa: true });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ nome: "", descricao: "", regra: "", ativa: true });

  const { data: rules = [], isLoading } = useQuery<QuoteRule[]>({
    queryKey: ["/api/quote-rules"],
  });

  const createMut = useMutation({
    mutationFn: (data: typeof newForm) => apiRequest("POST", "/api/quote-rules", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/quote-rules"] });
      setShowNew(false);
      setNewForm({ nome: "", descricao: "", regra: "", ativa: true });
      toast({ title: "Regra criada" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof editForm> }) =>
      apiRequest("PUT", `/api/quote-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/quote-rules"] });
      setEditingId(null);
      toast({ title: "Regra atualizada" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quote-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/quote-rules"] });
      toast({ title: "Regra removida" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, ativa }: { id: string; ativa: boolean }) =>
      apiRequest("PUT", `/api/quote-rules/${id}`, { ativa }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/quote-rules"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Brain className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Regras de Orçamento</p>
          <p className="text-xs text-muted-foreground mt-1">
            Regras específicas que a IA deve seguir em todos os orçamentos. O agente aprende automaticamente
            novas regras quando você corrige um orçamento no "Orçamento Especial IA".
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rules.length} regra{rules.length !== 1 ? "s" : ""} cadastrada{rules.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setShowNew(true)} data-testid="button-add-rule">
          <Plus className="w-4 h-4 mr-1" /> Nova Regra
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {showNew && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3 space-y-2">
                <Input value={newForm.nome} onChange={(e) => setNewForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome da regra" data-testid="input-new-rule-name" />
                <Input value={newForm.descricao} onChange={(e) => setNewForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição breve (opcional)" />
                <Textarea value={newForm.regra} onChange={(e) => setNewForm((f) => ({ ...f, regra: e.target.value }))} placeholder="Instrução detalhada para a IA..." rows={3} data-testid="textarea-new-rule" />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}><X className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={() => createMut.mutate(newForm)} disabled={createMut.isPending || !newForm.nome || !newForm.regra}>
                    <Save className="w-4 h-4 mr-1" /> Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {rules.length === 0 && !showNew && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma regra cadastrada ainda.</p>
          )}

          {rules.map((rule) => (
            <Card key={rule.id} className={`border ${rule.ativa ? "" : "opacity-60"}`}>
              <CardContent className="p-3">
                {editingId === rule.id ? (
                  <div className="space-y-2">
                    <Input value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome" />
                    <Input value={editForm.descricao} onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Descrição (opcional)" />
                    <Textarea value={editForm.regra} onChange={(e) => setEditForm((f) => ({ ...f, regra: e.target.value }))} rows={3} placeholder="Instrução para a IA..." />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                      <Button size="sm" onClick={() => updateMut.mutate({ id: rule.id, data: editForm })} disabled={updateMut.isPending}>
                        <Save className="w-4 h-4 mr-1" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{rule.nome}</span>
                        {!rule.ativa && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                      </div>
                      {rule.descricao && <p className="text-xs text-muted-foreground mb-1">{rule.descricao}</p>}
                      <p className="text-xs text-foreground bg-muted/50 rounded p-2 font-mono whitespace-pre-wrap">{rule.regra}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch checked={rule.ativa} onCheckedChange={(v) => toggleMut.mutate({ id: rule.id, ativa: v })} data-testid={`toggle-rule-${rule.id}`} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(rule.id); setEditForm({ nome: rule.nome, descricao: rule.descricao || "", regra: rule.regra, ativa: rule.ativa }); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(rule.id)} disabled={deleteMut.isPending}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Knowledge Files Tab ──────────────────────────────────────────────────────

function ArquivosTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery<AiAgentKnowledgeFile[]>({
    queryKey: ["/api/ai-agent/knowledge-files"],
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ai-agent/knowledge-files/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-agent/knowledge-files"] });
      toast({ title: "Arquivo removido" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      apiRequest("PATCH", `/api/ai-agent/knowledge-files/${id}`, { ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/ai-agent/knowledge-files"] }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("nome", file.name);
      const res = await fetch("/api/ai-agent/knowledge-files", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      qc.invalidateQueries({ queryKey: ["/api/ai-agent/knowledge-files"] });
      toast({ title: "Arquivo carregado com sucesso", description: "O conteúdo foi extraído e está disponível para o agente." });
    } catch {
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMimeLabel = (mime: string | null) => {
    if (!mime) return "Arquivo";
    if (mime.includes("pdf")) return "PDF";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "Excel";
    if (mime.includes("wordprocessingml")) return "Word";
    if (mime.includes("csv") || mime === "text/plain") return "Texto";
    return "Arquivo";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Arquivos de Conhecimento</p>
          <p className="text-xs text-muted-foreground mt-1">
            Envie tabelas de preços, catálogos, planilhas ou qualquer documento que o agente deve consultar
            ao gerar orçamentos. Suporte: PDF, Excel (.xlsx), Word (.docx), CSV, TXT — até 20 MB por arquivo.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.docx,.csv,.txt" onChange={handleFileUpload} data-testid="input-file-upload" />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload-file">
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {uploading ? "Enviando..." : "Enviar Arquivo"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum arquivo carregado ainda</p>
          <p className="text-xs text-muted-foreground mt-1">Envie tabelas de preços ou catálogos para o agente usar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className={`border ${file.ativo ? "" : "opacity-60"}`} data-testid={`card-file-${file.id}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{file.nome}</span>
                      <Badge variant="outline" className="text-xs">{getMimeLabel(file.mimeType)}</Badge>
                      {file.conteudoExtraido ? (
                        <Badge variant="secondary" className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30">
                          <CheckCircle className="w-3 h-3 mr-1" /> Indexado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Sem texto
                        </Badge>
                      )}
                      {!file.ativo && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {file.nomeOriginal} · {formatSize(file.tamanho)} · {file.conteudoExtraido ? `${file.conteudoExtraido.length.toLocaleString("pt-BR")} caracteres extraídos` : "texto não extraído"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {file.conteudoExtraido && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setExpandedId(expandedId === file.id ? null : file.id)} title="Ver conteúdo extraído">
                        {expandedId === file.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    <Switch checked={file.ativo} onCheckedChange={(v) => toggleMut.mutate({ id: file.id, ativo: v })} data-testid={`toggle-file-${file.id}`} />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(file.id)} disabled={deleteMut.isPending} data-testid={`button-delete-file-${file.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {expandedId === file.id && file.conteudoExtraido && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Conteúdo extraído (primeiros 2000 chars):</p>
                    <pre className="text-xs bg-muted/50 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap font-mono">
                      {file.conteudoExtraido.slice(0, 2000)}
                      {file.conteudoExtraido.length > 2000 ? "\n... (truncado)" : ""}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AiAgentPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Bot className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Agente de IA — Treinamento</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure as instruções, regras e documentos de conhecimento que o agente usa para gerar orçamentos.
        </p>
      </div>

      <Separator />

      <Tabs defaultValue="instrucoes">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="instrucoes" data-testid="tab-instructions"><Brain className="w-4 h-4 mr-1.5" />Instruções</TabsTrigger>
          <TabsTrigger value="regras" data-testid="tab-rules"><FileText className="w-4 h-4 mr-1.5" />Regras</TabsTrigger>
          <TabsTrigger value="arquivos" data-testid="tab-files"><Upload className="w-4 h-4 mr-1.5" />Arquivos</TabsTrigger>
        </TabsList>

        <TabsContent value="instrucoes" className="mt-6">
          <InstrucoesTab />
        </TabsContent>

        <TabsContent value="regras" className="mt-6">
          <RegrasTab />
        </TabsContent>

        <TabsContent value="arquivos" className="mt-6">
          <ArquivosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
