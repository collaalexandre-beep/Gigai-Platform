import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, CheckCircle, Clock, XCircle, RefreshCw, ChevronRight, Send, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WhatsappSession, WhatsappMessage } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

type SessionWithMessages = WhatsappSession & { messages: WhatsappMessage[] };

const STEP_LABELS: Record<string, string> = {
  menu: "Menu",
  produto: "Aguardando produto",
  medidas: "Aguardando medidas",
  quantidade: "Aguardando quantidade",
  nome: "Aguardando nome",
  cidade: "Aguardando cidade",
  confirmar: "Aguardando confirmação",
  status_query: "Consultando status",
  done: "Concluído",
  collecting: "Aguardando mensagem",
  // Vehicle flow steps
  veh_escolher_veiculo:             "🚗 [Frota] Escolhendo veículo",
  veh_aguardando_os:                "🚗 [Frota] Aguardando OS",
  veh_aguardando_motivo:            "🚗 [Frota] Aguardando motivo",
  veh_aguardando_destino:           "🚗 [Frota] Aguardando destino",
  veh_aguardando_foto_saida:        "🚗 [Frota] Aguardando foto de saída",
  veh_confirmando_leitura_inicial:  "🚗 [Frota] ✅ Confirmando leitura IA (saída)",
  veh_km_manual_inicial:            "🚗 [Frota] 📝 KM manual (saída)",
  veh_combustivel_manual_inicial:   "🚗 [Frota] ⛽ Combustível manual (saída)",
  veh_retorno_foto:                 "🚗 [Frota] Aguardando foto de retorno",
  veh_confirmando_leitura_final:    "🚗 [Frota] ✅ Confirmando leitura IA (retorno)",
  veh_km_manual_final:              "🚗 [Frota] 📝 KM manual (retorno)",
  veh_combustivel_manual_final:     "🚗 [Frota] ⛽ Combustível manual (retorno)",
  veh_retorno_obs:                  "🚗 [Frota] Aguardando observações",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">Ativo</Badge>;
  if (status === "completed")
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">Concluído</Badge>;
  return <Badge variant="secondary" className="text-xs">Encerrado</Badge>;
}

function formatPhone(from: string) {
  return from.replace("whatsapp:", "").replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, "+$1 ($2) $3-$4");
}

function ConversationPanel({ session }: { session: SessionWithMessages }) {
  const data = (session.data ?? {}) as Record<string, unknown>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm">{formatPhone(session.from)}</span>
          <StatusBadge status={session.status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Etapa: <strong>{STEP_LABELS[session.step] ?? session.step}</strong></span>
          {session.quoteId && (
            <a href={`/quotes/${session.quoteId}`} className="text-primary hover:underline ml-2">
              Ver orçamento →
            </a>
          )}
        </div>
        {Object.keys(data).length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {data.produto && <div className="text-xs"><span className="text-muted-foreground">Produto:</span> {String(data.produto)}</div>}
            {data.largura && data.altura && <div className="text-xs"><span className="text-muted-foreground">Medidas:</span> {String(data.largura)}m × {String(data.altura)}m</div>}
            {data.quantidade && <div className="text-xs"><span className="text-muted-foreground">Qtd:</span> {String(data.quantidade)}</div>}
            {data.nomeCliente && <div className="text-xs"><span className="text-muted-foreground">Nome:</span> {String(data.nomeCliente)}</div>}
            {data.cidade && <div className="text-xs"><span className="text-muted-foreground">Cidade:</span> {String(data.cidade)}</div>}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#e5ddd5] dark:bg-[#0d1117]">
        {session.messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">Nenhuma mensagem ainda</p>
        )}
        {session.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === "inbound" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm shadow-sm ${
                msg.direction === "inbound"
                  ? "bg-white dark:bg-gray-800 text-foreground"
                  : "bg-[#dcf8c6] dark:bg-[#005c4b] text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.body}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                {format(new Date(msg.createdAt), "HH:mm")}
              </p>
            </div>
          </div>
        ))}
        <div className="flex justify-center pt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded">
            <ArrowDown className="w-3 h-3" />
            Fim da conversa
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatsappPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("all");

  const { data: sessionsData, isLoading, refetch, isFetching } = useQuery<{ data: WhatsappSession[]; total: number }>({
    queryKey: ["/api/whatsapp/sessions", tab],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (tab !== "all") params.set("status", tab);
      const res = await fetch(`/api/whatsapp/sessions?${params}`);
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: selectedSession, isLoading: loadingSession } = useQuery<SessionWithMessages>({
    queryKey: ["/api/whatsapp/sessions", selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/whatsapp/sessions/${selectedId}`);
      return res.json();
    },
    enabled: !!selectedId,
    refetchInterval: 8000,
  });

  const sessions = sessionsData?.data ?? [];

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <div className="w-80 flex-shrink-0 border-r flex flex-col">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              <h1 className="font-semibold text-sm">WhatsApp Bot</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refetch()}
              data-testid="button-refresh-sessions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full h-7 text-xs">
              <TabsTrigger value="all" className="flex-1 text-xs h-6">Todos</TabsTrigger>
              <TabsTrigger value="active" className="flex-1 text-xs h-6">Ativos</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 text-xs h-6">Concluídos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
          )}
          {!isLoading && sessions.length === 0 && (
            <div className="p-6 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
              <p className="text-xs text-muted-foreground/60 mt-1">As conversas aparecerão quando clientes enviarem mensagens via WhatsApp</p>
            </div>
          )}
          {sessions.map((session) => {
            const isSelected = session.id === selectedId;
            return (
              <button
                key={session.id}
                data-testid={`session-${session.id}`}
                onClick={() => setSelectedId(session.id)}
                className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50 ${
                  isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{formatPhone(session.from)}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                    {formatDistanceToNow(new Date(session.updatedAt), { locale: ptBR, addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={session.status} />
                  <span className="text-xs text-muted-foreground truncate">
                    {STEP_LABELS[session.step] ?? session.step}
                  </span>
                </div>
                {session.quoteId && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-primary">
                    <CheckCircle className="w-3 h-3" />
                    <span>Orçamento criado</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">{sessionsData?.total ?? 0} conversa(s)</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!selectedId && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageCircle className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <h2 className="text-lg font-semibold text-muted-foreground">Selecione uma conversa</h2>
            <p className="text-sm text-muted-foreground/60 mt-1 max-w-sm">
              Clique em uma conversa à esquerda para visualizar as mensagens trocadas com o bot.
            </p>
            <div className="mt-6 p-4 bg-muted/30 rounded-lg text-left max-w-sm">
              <p className="text-xs font-semibold text-muted-foreground mb-2">🤖 Fluxo do bot:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Boas-vindas + menu de opções</li>
                <li>Solicita o produto desejado</li>
                <li>Solicita as medidas (L×A)</li>
                <li>Solicita a quantidade</li>
                <li>Solicita nome / empresa</li>
                <li>Solicita cidade de entrega</li>
                <li>Confirmação do resumo</li>
                <li>Cria o orçamento automaticamente ✅</li>
              </ol>
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-left max-w-sm" data-testid="meta-config-info">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">⚙️ Configuração Meta (WhatsApp Business API):</p>
              <div className="text-xs text-amber-600 dark:text-amber-400/80 space-y-1.5">
                <div>
                  <p className="font-semibold mb-0.5">1. URL do Callback (Webhook):</p>
                  <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded break-all block">
                    https://grafica-core-system.replit.app/api/whatsapp
                  </code>
                </div>
                <div>
                  <p className="font-semibold mb-0.5">2. Token de Verificação:</p>
                  <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">gigai_whatsapp_2026</code>
                </div>
                <div>
                  <p className="font-semibold mb-0.5">3. Secrets necessários:</p>
                  <p><code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">META_WHATSAPP_TOKEN</code></p>
                  <p><code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">META_PHONE_NUMBER_ID</code></p>
                  <p className="text-[10px] italic mt-0.5">Configure em: Meta for Developers → WhatsApp → API Setup</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedId && loadingSession && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando conversa...</p>
          </div>
        )}
        {selectedId && selectedSession && !loadingSession && (
          <ConversationPanel session={selectedSession} />
        )}
      </div>
    </div>
  );
}
