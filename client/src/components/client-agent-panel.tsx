import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, X, Sparkles, User, Loader2, Trash2,
  Search, Plus, Edit3, FileText, Building2, MapPin,
  Phone, ExternalLink, BarChart2, RefreshCw, Download,
  CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryMsg {
  role: "user" | "assistant";
  content: string;
}

interface ToolCall {
  tool: string;
  args: unknown;
  result: unknown;
}

interface AgentResponse {
  reply: string;
  toolCalls: ToolCall[];
  mutated: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  mutated?: boolean;
}

// ─── Suggestion chips ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "Listar clientes ativos", icon: Search },
  { label: "Clientes por cidade", icon: BarChart2 },
  { label: "Sem contato há 30 dias", icon: AlertTriangle },
  { label: "Clientes recentes", icon: RefreshCw },
];

// ─── Tool result renderers ───────────────────────────────────────────────────

function ClientTable({ data }: { data: { id: string; nome: string; cidade?: string; status: string; telefone?: string }[] }) {
  const STATUS_COLORS: Record<string, string> = {
    ativo: "text-emerald-700 bg-emerald-50 border-emerald-200",
    prospect: "text-blue-700 bg-blue-50 border-blue-200",
    inativo: "text-gray-500 bg-gray-50 border-gray-200",
    bloqueado: "text-red-600 bg-red-50 border-red-200",
  };
  return (
    <div className="mt-2 border border-border rounded-lg overflow-hidden text-xs">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nome</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Cidade</th>
            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
            <th className="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 font-medium text-foreground">{c.nome}</td>
              <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                {c.cidade ? (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.cidade}</span>
                ) : "—"}
              </td>
              <td className="px-3 py-2">
                <span className={cn("px-1.5 py-0.5 rounded border text-xs font-medium", STATUS_COLORS[c.status] ?? "")}>
                  {c.status}
                </span>
              </td>
              <td className="px-3 py-2">
                <Link href={`/clients/${c.id}`}>
                  <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsChart({ data }: { data: { label: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const COLORS: Record<string, string> = {
    ativo: "bg-emerald-500", prospect: "bg-blue-500",
    inativo: "bg-gray-400", bloqueado: "bg-red-400",
  };
  return (
    <div className="mt-2 space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="font-medium text-foreground capitalize">{d.label}</span>
            <span className="text-muted-foreground">{d.total}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", COLORS[d.label] ?? "bg-primary")}
              style={{ width: `${(d.total / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolBadge({ tool, mutated }: { tool: string; mutated?: boolean }) {
  const LABELS: Record<string, { label: string; icon: React.ElementType }> = {
    buscar_clientes:     { label: "Buscou clientes", icon: Search },
    obter_cliente:       { label: "Consultou cliente", icon: Building2 },
    criar_cliente:       { label: "Cadastrou cliente", icon: Plus },
    atualizar_cliente:   { label: "Atualizou cliente", icon: Edit3 },
    remover_cliente:     { label: "Removeu cliente", icon: Trash2 },
    estatisticas_clientes: { label: "Gerou relatório", icon: BarChart2 },
  };
  const meta = LABELS[tool] ?? { label: tool, icon: Sparkles };
  const Icon = meta.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border",
      mutated
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
        : "bg-muted text-muted-foreground border-border",
    )}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  const toolCalls = msg.toolCalls ?? [];

  const clientListResult = toolCalls.find((tc) => tc.tool === "buscar_clientes")?.result as
    { clientes?: { id: string; nome: string; cidade?: string; status: string; telefone?: string }[] } | undefined;

  const statsResult = toolCalls.find((tc) => tc.tool === "estatisticas_clientes")?.result as
    { tipo?: string; dados?: { status?: string; cidade?: string; total: number }[] } | undefined;

  const hasMutations = toolCalls.some((tc) =>
    ["criar_cliente", "atualizar_cliente", "remover_cliente"].includes(tc.tool)
  );

  return (
    <div className="space-y-2">
      {toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {toolCalls.map((tc, i) => (
            <ToolBadge key={i} tool={tc.tool} mutated={["criar_cliente", "atualizar_cliente", "remover_cliente"].includes(tc.tool)} />
          ))}
        </div>
      )}

      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

      {clientListResult?.clientes && clientListResult.clientes.length > 0 && (
        <ClientTable data={clientListResult.clientes} />
      )}

      {statsResult?.dados && statsResult.dados.length > 0 && (
        <StatsChart
          data={statsResult.dados.map((d) => ({
            label: d.status ?? d.cidade ?? "—",
            total: d.total,
          }))}
        />
      )}

      {hasMutations && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Lista de clientes atualizada automaticamente</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface ClientAgentPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ClientAgentPanel({ open, onClose }: ClientAgentPanelProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Olá! Sou o assistente de clientes da Gráfica+. Posso consultar, cadastrar, editar e gerar relatórios. O que você precisa?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [open]);

  const buildHistory = useCallback((): HistoryMsg[] => {
    return messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-20);
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiRequest<AgentResponse>("POST", "/api/ai/client-agent", {
        message: msg,
        history: buildHistory(),
      });

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.reply,
        toolCalls: res.toolCalls,
        mutated: res.mutated,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (res.mutated) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      }
    } catch (err) {
      toast({ title: "Erro ao contactar o agente", variant: "destructive" });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, tive um problema técnico. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!open) return null;

  return (
    <div
      className="flex flex-col bg-card border-l border-border shadow-xl h-full"
      style={{ width: 380, minWidth: 340, maxWidth: 420 }}
      data-testid="client-agent-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Assistente de Clientes</p>
            <p className="text-xs opacity-70 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
              GPT-4o-mini
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            title="Limpar conversa"
            onClick={() =>
              setMessages([{
                role: "assistant",
                content: "Conversa reiniciada. O que você precisa?",
              }])
            }
            data-testid="button-clear-agent-chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onClose}
            data-testid="button-close-agent-panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Capability chips */}
      <div className="px-3 py-2 bg-muted/40 border-b border-border flex-shrink-0">
        <div className="flex gap-1.5 flex-wrap">
          {[
            { label: "Consultar", icon: Search },
            { label: "Cadastrar", icon: Plus },
            { label: "Editar", icon: Edit3 },
            { label: "Relatórios", icon: FileText },
          ].map((cap) => (
            <span
              key={cap.label}
              className="inline-flex items-center gap-1 text-xs bg-background border border-border text-muted-foreground px-2 py-0.5 rounded-full"
            >
              <cap.icon className="w-3 h-3" />
              {cap.label}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2 items-start", msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
              msg.role === "assistant" ? "bg-primary" : "bg-muted border border-border",
            )}>
              {msg.role === "assistant"
                ? <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                : <User className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </div>
            <div className={cn(
              "max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm",
              msg.role === "assistant"
                ? "bg-card border border-border rounded-tl-sm"
                : "bg-primary text-primary-foreground rounded-tr-sm",
            )}>
              {msg.role === "assistant"
                ? <AssistantMessage msg={msg} />
                : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              }
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-start">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestions (first message only) */}
      {messages.length === 1 && !loading && (
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.label)}
                className="inline-flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 border border-border text-foreground px-2.5 py-1 rounded-full transition-colors"
                data-testid={`suggestion-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <s.icon className="w-3 h-3 text-muted-foreground" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3 flex-shrink-0">
        <div className="flex gap-2 items-end bg-muted/30 border border-border rounded-xl px-3 py-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte ou dê uma instrução..."
            className="flex-1 bg-transparent border-0 shadow-none resize-none text-sm p-0 min-h-[24px] max-h-[80px] focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
            data-testid="input-agent-message"
          />
          <Button
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            disabled={!input.trim() || loading}
            onClick={() => sendMessage()}
            data-testid="button-send-agent-message"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-1.5">
          IA pode cometer erros — confirme alterações importantes
        </p>
      </div>
    </div>
  );
}
