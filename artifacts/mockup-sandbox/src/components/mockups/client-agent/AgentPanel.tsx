import { useState, useRef, useEffect } from "react";
import {
  Bot, Send, User, Sparkles, Search, Plus, MoreVertical,
  Building2, Phone, MapPin, ChevronRight, X, Loader2,
  FileText, Users, TrendingUp, AlertCircle, CheckCircle2,
  RefreshCw, Trash2, Edit3, Download
} from "lucide-react";

const MOCK_CLIENTS = [
  { id: 1, nome: "Gráfica Central Ltda", cnpj: "12.345.678/0001-90", cidade: "Porto Alegre", status: "ativo", contato: "(51) 3333-4444" },
  { id: 2, nome: "Print Express ME", cnpj: "98.765.432/0001-11", cidade: "Canoas", status: "ativo", contato: "(51) 9999-8888" },
  { id: 3, nome: "Design & Cia", cnpj: "11.222.333/0001-44", cidade: "São Leopoldo", status: "prospect", contato: "(51) 7777-6666" },
  { id: 4, nome: "Comercial Norte EIRELI", cnpj: "55.666.777/0001-22", cidade: "Gravataí", status: "inativo", contato: "(51) 5555-4444" },
  { id: 5, nome: "Fomento Digital S.A.", cnpj: "33.444.555/0001-88", cidade: "Porto Alegre", status: "ativo", contato: "(51) 2222-1111" },
];

type Msg = { role: "user" | "agent"; text: string; timestamp: string; action?: "table" | "form" | "report" };

const INITIAL_MSGS: Msg[] = [
  {
    role: "agent",
    text: "Olá! Sou o assistente de clientes da Gráfica+. Posso consultar, cadastrar, editar e gerar relatórios. O que você precisa?",
    timestamp: "agora",
  }
];

const SUGGESTIONS = [
  "Listar clientes ativos",
  "Cadastrar novo cliente",
  "Relatório de clientes por cidade",
  "Clientes sem contato há 30 dias",
];

const STATUS_STYLES: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-700",
  prospect: "bg-blue-100 text-blue-700",
  inativo: "bg-gray-100 text-gray-500",
  bloqueado: "bg-red-100 text-red-600",
};

type ConversationStep = "idle" | "typing" | "result";

function AgentMessage({ msg }: { msg: Msg }) {
  if (msg.action === "table") {
    return (
      <div className="text-sm">
        <p className="text-gray-700 mb-3">{msg.text}</p>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-2 font-medium text-gray-500">Empresa</th>
                <th className="text-left p-2 font-medium text-gray-500">Cidade</th>
                <th className="text-left p-2 font-medium text-gray-500">Status</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CLIENTS.filter(c => c.status === "ativo").map(c => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-2 font-medium text-gray-800">{c.nome}</td>
                  <td className="p-2 text-gray-500">{c.cidade}</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-2">
                    <button className="text-blue-500 hover:underline text-xs">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1">
            <Download className="w-3 h-3" /> Exportar
          </button>
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>
      </div>
    );
  }

  if (msg.action === "report") {
    return (
      <div className="text-sm">
        <p className="text-gray-700 mb-3">{msg.text}</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Porto Alegre", value: 2, pct: "40%" },
            { label: "Canoas", value: 1, pct: "20%" },
            { label: "São Leopoldo", value: 1, pct: "20%" },
            { label: "Gravataí", value: 1, pct: "20%" },
          ].map(r => (
            <div key={r.label} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700">{r.label}</span>
                <span className="text-xs text-gray-500">{r.pct}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full"
                  style={{ width: r.pct }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{r.value} cliente(s)</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (msg.action === "form") {
    return (
      <div className="text-sm">
        <p className="text-gray-700 mb-3">{msg.text}</p>
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> Novo cliente
          </p>
          {["Razão Social / Nome", "CNPJ / CPF", "Cidade", "Telefone"].map(f => (
            <div key={f}>
              <label className="text-xs text-gray-500 block mb-0.5">{f}</label>
              <div className="bg-white border border-blue-200 rounded px-2 py-1.5 text-xs text-gray-400">
                {f === "CNPJ / CPF" ? "00.000.000/0000-00" : `Digite ${f.toLowerCase()}...`}
              </div>
            </div>
          ))}
          <button className="w-full mt-1 bg-blue-600 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors">
            Abrir formulário completo →
          </button>
        </div>
      </div>
    );
  }

  return <p className="text-sm text-gray-700 leading-relaxed">{msg.text}</p>;
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-start">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-gray-400 rounded-full"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AgentPanel() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>(INITIAL_MSGS);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<ConversationStep>("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, step]);

  function handleSend(text?: string) {
    const msg = text ?? input.trim();
    if (!msg || step === "typing") return;
    setInput("");

    const userMsg: Msg = { role: "user", text: msg, timestamp: "agora" };
    setMsgs(prev => [...prev, userMsg]);
    setStep("typing");

    setTimeout(() => {
      let reply: Msg;
      const lower = msg.toLowerCase();

      if (lower.includes("ativo") || lower.includes("listar")) {
        reply = {
          role: "agent",
          text: "Encontrei 3 clientes ativos no sistema:",
          timestamp: "agora",
          action: "table",
        };
      } else if (lower.includes("cadastrar") || lower.includes("novo")) {
        reply = {
          role: "agent",
          text: "Vou te ajudar a cadastrar um novo cliente. Você pode preencher aqui ou abrir o formulário completo:",
          timestamp: "agora",
          action: "form",
        };
      } else if (lower.includes("relatório") || lower.includes("relatorio") || lower.includes("cidade")) {
        reply = {
          role: "agent",
          text: "Relatório de clientes por cidade (total: 5 clientes):",
          timestamp: "agora",
          action: "report",
        };
      } else if (lower.includes("editar") || lower.includes("alterar")) {
        reply = {
          role: "agent",
          text: "Qual cliente você quer editar? Pode me dizer o nome, CNPJ ou parte do nome.",
          timestamp: "agora",
        };
      } else if (lower.includes("30 dias") || lower.includes("sem contato")) {
        reply = {
          role: "agent",
          text: "Analisando o histórico de interações... Encontrei 2 clientes sem contato nos últimos 30 dias: Design & Cia e Comercial Norte EIRELI. Deseja que eu crie uma tarefa de follow-up para eles?",
          timestamp: "agora",
        };
      } else {
        reply = {
          role: "agent",
          text: "Entendi! Posso fazer isso por você. Quer que eu liste os resultados aqui no chat, ou prefere abrir a página de clientes com o filtro já aplicado?",
          timestamp: "agora",
        };
      }

      setMsgs(prev => [...prev, reply]);
      setStep("idle");
    }, 1400);
  }

  return (
    <div className="flex h-screen bg-gray-50 font-['Inter',sans-serif] overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      {/* ── MAIN LIST (left) ─────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${panelOpen ? "mr-0" : ""}`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">5 registros encontrados</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanelOpen(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                panelOpen
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Agente IA
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Novo Cliente
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="Buscar cliente..."
              readOnly
            />
          </div>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none">
            <option>Todos os status</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CNPJ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CLIENTS.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors ${i === 0 ? "bg-blue-50/20" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{c.contato}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{c.cnpj}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />{c.cidade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── AGENT PANEL (right) ───────────────────────────────────────────── */}
      {panelOpen && (
        <div className="w-96 flex flex-col bg-white border-l border-gray-200 shadow-xl">
          {/* Panel header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Assistente de Clientes</p>
                <p className="text-xs text-blue-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                  Online · GPT-4o-mini
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMsgs(INITIAL_MSGS)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Limpar conversa"
              >
                <Trash2 className="w-4 h-4 text-blue-200" />
              </button>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Capabilities */}
          <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
            <div className="flex gap-2 flex-wrap">
              {[
                { icon: Search, label: "Consultar" },
                { icon: Plus, label: "Cadastrar" },
                { icon: Edit3, label: "Editar" },
                { icon: FileText, label: "Relatórios" },
              ].map(cap => (
                <span key={cap.label} className="flex items-center gap-1 bg-white border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  <cap.icon className="w-3 h-3" />{cap.label}
                </span>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {msgs.map((msg, i) => (
              <div key={i} className={`flex gap-2 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "agent" ? "bg-blue-600" : "bg-gray-700"
                }`}>
                  {msg.role === "agent"
                    ? <Bot className="w-4 h-4 text-white" />
                    : <User className="w-4 h-4 text-white" />
                  }
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === "agent"
                    ? "bg-white border border-gray-200 rounded-tl-sm"
                    : "bg-blue-600 text-white rounded-tr-sm"
                }`}>
                  {msg.role === "agent"
                    ? <AgentMessage msg={msg} />
                    : <p className="text-sm">{msg.text}</p>
                  }
                  <p className={`text-xs mt-1 ${msg.role === "agent" ? "text-gray-400" : "text-blue-200"}`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))}

            {step === "typing" && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {msgs.length === 1 && step === "idle" && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-400 mb-2">Sugestões:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 text-gray-600 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2 items-end bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Pergunte ou dê uma instrução..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 resize-none outline-none min-h-[24px] max-h-[80px]"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || step === "typing"}
                className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                  input.trim() && step !== "typing"
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {step === "typing"
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              IA pode cometer erros — confirme alterações importantes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
