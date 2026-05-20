import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageCircle, CheckCircle, RefreshCw, ArrowDown,
  Settings, Save, RotateCcw, Bot, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WhatsappSession, WhatsappMessage } from "@shared/schema";

type SessionWithMessages = WhatsappSession & { messages: WhatsappMessage[] };

interface WaBotConfig {
  id: string;
  nomeBot: string;
  nomeEmpresa: string;
  systemPrompt: string;
  welcomeMessage: string;
  cancelMessage: string;
  attendantMessage: string;
  vehMsgNaoCadastrado?: string | null;
  vehMsgNaoAutorizado?: string | null;
  vehMsgSemVeiculos?: string | null;
  vehMsgCancelado?: string | null;
  vehMsgSaidaSucesso?: string | null;
  vehMsgRetornoSucesso?: string | null;
  updatedAt?: string;
}

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
  purch_coletando:  "🛒 [Compras] Coletando dados",
  purch_confirmar:  "🛒 [Compras] Aguardando confirmação",
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
            {/* Agente Comercial */}
            {data.produto && <div className="text-xs"><span className="text-muted-foreground">Produto:</span> {String(data.produto)}</div>}
            {data.largura && data.altura && <div className="text-xs"><span className="text-muted-foreground">Medidas:</span> {String(data.largura)}m × {String(data.altura)}m</div>}
            {data.quantidade && !data.purch_quantidade && <div className="text-xs"><span className="text-muted-foreground">Qtd:</span> {String(data.quantidade)}</div>}
            {data.nomeCliente && <div className="text-xs"><span className="text-muted-foreground">Nome:</span> {String(data.nomeCliente)}</div>}
            {data.cidade && <div className="text-xs"><span className="text-muted-foreground">Cidade:</span> {String(data.cidade)}</div>}
            {/* Agente de Compras */}
            {data.purch_material && <div className="text-xs col-span-2"><span className="text-muted-foreground">🛒 Material:</span> {String(data.purch_material)}</div>}
            {data.purch_quantidade && <div className="text-xs"><span className="text-muted-foreground">Qtd:</span> {String(data.purch_quantidade)} {data.purch_unidade ? String(data.purch_unidade) : ""}</div>}
            {data.purch_urgencia && <div className="text-xs"><span className="text-muted-foreground">Urgência:</span> {String(data.purch_urgencia).replace("_", " ")}</div>}
            {data.purch_os && <div className="text-xs"><span className="text-muted-foreground">OS:</span> {String(data.purch_os)}</div>}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#e5ddd5] dark:bg-[#0d1117]">
        {session.messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">Nenhuma mensagem ainda</p>
        )}
        {session.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === "inbound" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm shadow-sm ${
              msg.direction === "inbound"
                ? "bg-white dark:bg-gray-800 text-foreground"
                : "bg-[#dcf8c6] dark:bg-[#005c4b] text-foreground"
            }`}>
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

// ─── CONFIG TAB ───────────────────────────────────────────────────────────────

function BotConfigTab() {
  const { toast } = useToast();
  const [showPromptHelp, setShowPromptHelp] = useState(false);

  const { data: cfg, isLoading } = useQuery<WaBotConfig>({
    queryKey: ["/api/whatsapp/config"],
  });

  const [form, setForm] = useState<Partial<WaBotConfig>>({});

  useEffect(() => {
    if (cfg) setForm(cfg);
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<WaBotConfig>) => {
      const res = await apiRequest("PUT", "/api/whatsapp/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/config"] });
      toast({ title: "Configurações salvas!", description: "O bot já está usando as novas instruções." });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    },
  });

  const handleReset = () => {
    if (cfg) setForm(cfg);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-500" />
          <div>
            <h2 className="font-semibold text-base">Configurar Bot de Atendimento</h2>
            <p className="text-xs text-muted-foreground">Personalize como o bot conversa com seus clientes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset-config">
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Desfazer
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            data-testid="button-save-config"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Salvando...</>
            ) : (
              <><Save className="w-4 h-4 mr-1.5" />Salvar configurações</>
            )}
          </Button>
        </div>
      </div>

      {/* Identidade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">🤖 Identidade do Bot</CardTitle>
          <CardDescription className="text-xs">Nome e empresa que o bot usará ao se apresentar</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nomeBot" className="text-xs">Nome do assistente</Label>
            <Input
              id="nomeBot"
              value={form.nomeBot ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nomeBot: e.target.value }))}
              placeholder="Ex: Assistente Gráfica+"
              data-testid="input-nome-bot"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nomeEmpresa" className="text-xs">Nome da empresa</Label>
            <Input
              id="nomeEmpresa"
              value={form.nomeEmpresa ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nomeEmpresa: e.target.value }))}
              placeholder="Ex: Gráfica+"
              data-testid="input-nome-empresa"
            />
          </div>
        </CardContent>
      </Card>

      {/* Mensagens fixas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">💬 Mensagens Fixas do Fluxo</CardTitle>
          <CardDescription className="text-xs">
            Mensagens enviadas em situações específicas — suportam emojis e formatação do WhatsApp (*negrito*, _itálico_)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="welcomeMessage" className="text-xs font-medium">
              👋 Mensagem de Boas-Vindas
              <span className="text-muted-foreground font-normal ml-1">— enviada ao digitar "oi", "olá", "menu"</span>
            </Label>
            <Textarea
              id="welcomeMessage"
              value={form.welcomeMessage ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
              rows={4}
              className="text-sm font-mono resize-none"
              placeholder="Olá! 👋 Sou o assistente virtual..."
              data-testid="textarea-welcome-msg"
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="cancelMessage" className="text-xs font-medium">
              ❌ Mensagem de Cancelamento
              <span className="text-muted-foreground font-normal ml-1">— enviada ao digitar "cancelar" ou "sair"</span>
            </Label>
            <Textarea
              id="cancelMessage"
              value={form.cancelMessage ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cancelMessage: e.target.value }))}
              rows={3}
              className="text-sm font-mono resize-none"
              placeholder="Tudo bem! Recomeçamos do zero. 😊"
              data-testid="textarea-cancel-msg"
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="attendantMessage" className="text-xs font-medium">
              🙋 Mensagem de Atendente Humano
              <span className="text-muted-foreground font-normal ml-1">— enviada quando cliente pede um atendente</span>
            </Label>
            <Textarea
              id="attendantMessage"
              value={form.attendantMessage ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, attendantMessage: e.target.value }))}
              rows={3}
              className="text-sm font-mono resize-none"
              placeholder="Entendido! 🙋 Em breve um atendente entrará em contato..."
              data-testid="textarea-attendant-msg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prompt de IA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">🧠 Prompt de Atendimento (IA)</CardTitle>
          <CardDescription className="text-xs">
            Instruções completas para a inteligência artificial — define como o bot entende e responde aos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            type="button"
            onClick={() => setShowPromptHelp((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            data-testid="button-toggle-prompt-help"
          >
            {showPromptHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showPromptHelp ? "Ocultar dicas" : "Ver dicas de uso"}
          </button>

          {showPromptHelp && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 space-y-2 text-xs">
              <p className="font-semibold text-amber-800 dark:text-amber-400">📌 Como usar o prompt:</p>
              <ul className="space-y-1 text-amber-700 dark:text-amber-400/80 list-disc list-inside">
                <li>Use <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">{"{DADOS_COLETADOS}"}</code> onde o bot deve inserir as informações já coletadas do cliente</li>
                <li>Defina claramente quais campos o bot deve coletar (produto, medidas, quantidade, etc.)</li>
                <li>Especifique as regras de negócio: conversão de unidades, comportamento ao finalizar, etc.</li>
                <li>O bot sempre responde com JSON — mantenha a seção de estrutura JSON ao final</li>
                <li>Você pode adicionar produtos específicos, preços fixos ou regras especiais da sua gráfica</li>
              </ul>
              <p className="font-semibold text-amber-800 dark:text-amber-400 mt-2">💡 Exemplos de personalização:</p>
              <ul className="space-y-1 text-amber-700 dark:text-amber-400/80 list-disc list-inside">
                <li>Adicione uma lista dos seus produtos mais vendidos</li>
                <li>Instrua o bot a sempre mencionar o prazo de entrega padrão</li>
                <li>Configure o bot para pedir aprovação de arte antes do orçamento</li>
                <li>Defina mensagens específicas para clientes de determinadas cidades</li>
              </ul>
            </div>
          )}

          <Textarea
            value={form.systemPrompt ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
            rows={20}
            className="text-xs font-mono resize-y"
            placeholder="Você é o assistente virtual da Gráfica+..."
            data-testid="textarea-system-prompt"
          />
          <p className="text-xs text-muted-foreground">
            {(form.systemPrompt ?? "").length} caracteres
          </p>
        </CardContent>
      </Card>

      {/* Frota — mensagens do bot de funcionários */}
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">🚗 Frota — Bot de Funcionários</CardTitle>
          <CardDescription className="text-xs">
            Mensagens enviadas no fluxo de saída e retorno de veículos — usado internamente pelos motoristas via WhatsApp.
            <br />Deixe em branco para usar o texto padrão do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vehMsgNaoCadastrado" className="text-xs font-medium">
              ⛔ Número não cadastrado
              <span className="text-muted-foreground font-normal ml-1">— funcionário não localizado no sistema</span>
            </Label>
            <Textarea
              id="vehMsgNaoCadastrado"
              value={form.vehMsgNaoCadastrado ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, vehMsgNaoCadastrado: e.target.value }))}
              rows={3}
              className="text-sm font-mono resize-none"
              placeholder="⛔ Seu número não está vinculado a nenhum funcionário cadastrado..."
              data-testid="textarea-veh-nao-cadastrado"
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="vehMsgNaoAutorizado" className="text-xs font-medium">
              🚫 Não autorizado a dirigir
              <span className="text-muted-foreground font-normal ml-1">— use <code className="bg-muted px-1 rounded">{"{nome}"}</code> para o nome do funcionário</span>
            </Label>
            <Textarea
              id="vehMsgNaoAutorizado"
              value={form.vehMsgNaoAutorizado ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, vehMsgNaoAutorizado: e.target.value }))}
              rows={3}
              className="text-sm font-mono resize-none"
              placeholder="⛔ Olá, {nome}! Você não está autorizado a retirar veículos..."
              data-testid="textarea-veh-nao-autorizado"
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="vehMsgSemVeiculos" className="text-xs font-medium">
              😟 Sem veículos disponíveis
              <span className="text-muted-foreground font-normal ml-1">— todos em manutenção ou inativos</span>
            </Label>
            <Textarea
              id="vehMsgSemVeiculos"
              value={form.vehMsgSemVeiculos ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, vehMsgSemVeiculos: e.target.value }))}
              rows={2}
              className="text-sm font-mono resize-none"
              placeholder="😟 Não há veículos disponíveis no momento..."
              data-testid="textarea-veh-sem-veiculos"
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="vehMsgCancelado" className="text-xs font-medium">
              ✅ Registro cancelado
              <span className="text-muted-foreground font-normal ml-1">— ao digitar "cancelar" durante o fluxo</span>
            </Label>
            <Textarea
              id="vehMsgCancelado"
              value={form.vehMsgCancelado ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, vehMsgCancelado: e.target.value }))}
              rows={2}
              className="text-sm font-mono resize-none"
              placeholder="✅ Registro cancelado. Quando precisar, envie *saída veículo* para recomeçar."
              data-testid="textarea-veh-cancelado"
            />
          </div>

          <Separator />

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">📋 Placeholders para mensagens de sucesso:</p>
            <p><code className="bg-background px-1 rounded">{"{veiculo}"}</code> — Marca e modelo (ex: Ford Ka)</p>
            <p><code className="bg-background px-1 rounded">{"{placa}"}</code> — Placa do veículo (ex: ABC-1234)</p>
            <p><code className="bg-background px-1 rounded">{"{km}"}</code> — KM do odômetro</p>
            <p><code className="bg-background px-1 rounded">{"{combustivel}"}</code> — Nível de combustível (ex: 3/4)</p>
            <p><code className="bg-background px-1 rounded">{"{data}"}</code> — Data e hora do retorno (apenas na mensagem de retorno)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehMsgSaidaSucesso" className="text-xs font-medium">
              🚗 Saída registrada com sucesso
            </Label>
            <Textarea
              id="vehMsgSaidaSucesso"
              value={form.vehMsgSaidaSucesso ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, vehMsgSaidaSucesso: e.target.value }))}
              rows={4}
              className="text-sm font-mono resize-none"
              placeholder={"✅ *Saída registrada!*\n\n🚗 *{veiculo}* — Placa: {placa}\n📏 KM: {km}\n⛽ Combustível: {combustivel}\n\nAo retornar, envie *retornei*. Boa viagem! 🛣️"}
              data-testid="textarea-veh-saida-sucesso"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehMsgRetornoSucesso" className="text-xs font-medium">
              🏠 Retorno registrado com sucesso
            </Label>
            <Textarea
              id="vehMsgRetornoSucesso"
              value={form.vehMsgRetornoSucesso ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, vehMsgRetornoSucesso: e.target.value }))}
              rows={4}
              className="text-sm font-mono resize-none"
              placeholder={"✅ *Retorno registrado!*\n\n🕐 {data}\n📏 KM final: {km}\n⛽ Combustível: {combustivel}\n\nObrigado! O uso do veículo foi registrado. 🚗"}
              data-testid="textarea-veh-retorno-sucesso"
            />
          </div>
        </CardContent>
      </Card>

      {/* Webhook info */}
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">⚙️ Configuração Meta (WhatsApp Business API)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <p className="font-semibold mb-1">1. URL do Callback (Webhook):</p>
            <code className="font-mono bg-muted px-2 py-1 rounded break-all block">
              https://grafica-core-system.replit.app/api/whatsapp
            </code>
          </div>
          <div>
            <p className="font-semibold mb-1">2. Token de Verificação:</p>
            <code className="font-mono bg-muted px-2 py-1 rounded">gigai_whatsapp_2026</code>
          </div>
          <div>
            <p className="font-semibold mb-1">3. Secrets necessários:</p>
            <div className="space-y-1">
              <code className="font-mono bg-muted px-2 py-1 rounded block">META_WHATSAPP_TOKEN</code>
              <code className="font-mono bg-muted px-2 py-1 rounded block">META_PHONE_NUMBER_ID</code>
            </div>
            <p className="italic mt-1 text-muted-foreground">Configure em: Meta for Developers → WhatsApp → API Setup</p>
          </div>
        </CardContent>
      </Card>

      <div className="pb-4" />
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function WhatsappPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionTab, setSessionTab] = useState("all");
  const [mainTab, setMainTab] = useState("conversas");

  const { data: sessionsData, isLoading, refetch, isFetching } = useQuery<{ data: WhatsappSession[]; total: number }>({
    queryKey: ["/api/whatsapp/sessions", sessionTab],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (sessionTab !== "all") params.set("status", sessionTab);
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
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Top bar with main tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-500" />
          <h1 className="font-semibold text-sm">WhatsApp Bot</h1>
        </div>
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="h-7">
            <TabsTrigger value="conversas" className="text-xs h-6 px-3" data-testid="tab-conversas">
              💬 Conversas
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs h-6 px-3" data-testid="tab-config">
              <Settings className="w-3.5 h-3.5 mr-1" />
              Configurar Bot
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      {mainTab === "config" ? (
        <BotConfigTab />
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Session list */}
          <div className="w-80 flex-shrink-0 border-r flex flex-col">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">Conversas recentes</span>
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
              <Tabs value={sessionTab} onValueChange={setSessionTab}>
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
                  <p className="text-xs text-muted-foreground/60 mt-1">As conversas aparecerão quando clientes enviarem mensagens</p>
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

          {/* Conversation panel */}
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
                    <li>Boas-vindas + aguarda mensagem livre</li>
                    <li>IA extrai produto, medidas, quantidade</li>
                    <li>IA solicita dados faltantes naturalmente</li>
                    <li>Solicita nome / empresa e cidade</li>
                    <li>Confirmação do resumo (SIM/NÃO)</li>
                    <li>Cria o orçamento automaticamente ✅</li>
                    <li>Envia PDF do orçamento pelo WhatsApp</li>
                  </ol>
                </div>
                <button
                  onClick={() => setMainTab("config")}
                  className="mt-4 text-xs text-primary hover:underline flex items-center gap-1"
                  data-testid="button-go-to-config"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Ir para Configurar Bot
                </button>
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
      )}
    </div>
  );
}
