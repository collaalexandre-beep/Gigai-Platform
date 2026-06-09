import OpenAI from "openai";
import { storage } from "../storage";
import { lookupCnpj } from "../cnpj";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `Você é o assistente de gestão de clientes da Gráfica+. Sua personalidade é profissional, direta e prestativa.

Você tem acesso a ferramentas para consultar, cadastrar, editar, remover clientes e GERAR RELATÓRIOS em PDF e Excel.

REGRAS GERAIS:
- Responda sempre em português brasileiro
- Seja conciso e direto — este é um sistema interno de gestão
- Se uma busca não retornar resultados, diga que não encontrou e sugira alternativas
- NUNCA peça confirmação antes de cadastrar ou editar — execute imediatamente quando o usuário pedir
- A única exceção é REMOVER cliente: para remoção peça confirmação explícita antes de executar
- Nunca invente dados — use apenas o que veio das ferramentas

FLUXO DE CADASTRO COM CNPJ (OBRIGATÓRIO E AUTOMÁTICO):
Quando o usuário pedir para cadastrar/incluir/registrar um cliente com CNPJ:
1. IMEDIATAMENTE chame "consultar_cnpj" para buscar dados na Receita Federal (sem perguntar nada)
2. IMEDIATAMENTE após receber os dados, chame "criar_cliente" com TODOS os campos disponíveis
3. Confirme ao usuário o que foi cadastrado e destaque a inscrição estadual encontrada
- NÃO pergunte se deve cadastrar — SE o usuário disse "cadastra", "inclui", "registra", "adiciona" → execute direto

RELATÓRIOS:
- Quando o usuário pedir relatório, exportar, baixar lista, gerar planilha ou PDF → use "gerar_relatorio"
- Interprete filtros da linguagem natural: "ativos" → status=ativo, "de São Paulo" → search=São Paulo, etc.
- Sempre confirme o que foi gerado com o total de clientes incluídos`;

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "consultar_cnpj",
      description: "Consulta dados de uma empresa na Receita Federal pelo CNPJ. SEMPRE use antes de cadastrar cliente PJ.",
      parameters: {
        type: "object",
        properties: {
          cnpj: { type: "string", description: "CNPJ (com ou sem formatação)" },
        },
        required: ["cnpj"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_clientes",
      description: "Busca e lista clientes com filtros opcionais.",
      parameters: {
        type: "object",
        properties: {
          search:  { type: "string", description: "Busca por nome, CNPJ, cidade ou e-mail" },
          status:  { type: "string", enum: ["ativo", "inativo", "prospect", "bloqueado"] },
          limit:   { type: "number", description: "Máximo de registros (padrão 20, máximo 100)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "obter_cliente",
      description: "Obtém dados completos de um cliente pelo ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_cliente",
      description: "Cadastra um novo cliente. Para PJ com CNPJ, use consultar_cnpj primeiro.",
      parameters: {
        type: "object",
        properties: {
          razaoSocial:        { type: "string", description: "Razão social ou nome completo (obrigatório)" },
          nomeFantasia:       { type: "string" },
          tipoPessoa:         { type: "string", enum: ["fisica", "juridica"] },
          cnpj:               { type: "string" },
          cpf:                { type: "string" },
          inscricaoEstadual:  { type: "string" },
          inscricaoMunicipal: { type: "string" },
          situacaoCadastral:  { type: "string" },
          naturezaJuridica:   { type: "string" },
          dataAbertura:       { type: "string" },
          telefone:           { type: "string" },
          whatsapp:           { type: "string" },
          email:              { type: "string" },
          site:               { type: "string" },
          cep:                { type: "string" },
          logradouro:         { type: "string" },
          numero:             { type: "string" },
          complemento:        { type: "string" },
          bairro:             { type: "string" },
          cidade:             { type: "string" },
          estado:             { type: "string" },
          status:             { type: "string", enum: ["ativo", "inativo", "prospect", "bloqueado"] },
          observacoes:        { type: "string" },
          segmento:           { type: "string" },
          potencialCompra:    { type: "string", enum: ["baixo", "medio", "alto"] },
        },
        required: ["razaoSocial"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_cliente",
      description: "Atualiza campos de um cliente existente.",
      parameters: {
        type: "object",
        properties: {
          id:               { type: "string", description: "ID do cliente (obrigatório)" },
          razaoSocial:      { type: "string" },
          nomeFantasia:     { type: "string" },
          inscricaoEstadual:{ type: "string" },
          telefone:         { type: "string" },
          whatsapp:         { type: "string" },
          email:            { type: "string" },
          cep:              { type: "string" },
          logradouro:       { type: "string" },
          numero:           { type: "string" },
          complemento:      { type: "string" },
          bairro:           { type: "string" },
          cidade:           { type: "string" },
          estado:           { type: "string" },
          status:           { type: "string", enum: ["ativo", "inativo", "prospect", "bloqueado"] },
          observacoes:      { type: "string" },
          segmento:         { type: "string" },
          potencialCompra:  { type: "string", enum: ["baixo", "medio", "alto"] },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remover_cliente",
      description: "Remove (soft delete) um cliente. Use somente após confirmação explícita.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estatisticas_clientes",
      description: "Estatísticas dos clientes: por status, por cidade, recentes ou sem contato.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: ["por_status", "por_cidade", "recentes", "sem_contato"],
          },
          dias: { type: "number", description: "Para sem_contato: dias sem contato (padrão 30)" },
        },
        required: ["tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gerar_relatorio",
      description: "Gera um relatório de clientes para download em PDF ou Excel. Use quando o usuário pedir: relatório, exportar, baixar lista, gerar planilha, gerar PDF, etc.",
      parameters: {
        type: "object",
        properties: {
          formato: {
            type: "string",
            enum: ["pdf", "excel"],
            description: "Formato do relatório: pdf ou excel",
          },
          titulo: {
            type: "string",
            description: "Título do relatório (ex: 'Clientes Ativos', 'Prospects de SP')",
          },
          status: {
            type: "string",
            enum: ["ativo", "inativo", "prospect", "bloqueado"],
            description: "Filtrar por status (omitir para todos)",
          },
          search: {
            type: "string",
            description: "Filtrar por texto (nome, cidade, CNPJ)",
          },
        },
        required: ["formato"],
      },
    },
  },
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "consultar_cnpj": {
      const { cnpj } = args as { cnpj: string };
      const result = await lookupCnpj(cnpj);
      if (!result.success || !result.data) {
        return { sucesso: false, erro: result.error ?? "Consulta falhou em todos os provedores", provider: result.provider };
      }
      const d = result.data;
      return {
        sucesso: true, provider: result.provider,
        cnpj: d.cnpj, razaoSocial: d.razaoSocial, nomeFantasia: d.nomeFantasia,
        inscricaoEstadual: d.inscricaoEstadual, situacaoCadastral: d.situacaoCadastral,
        dataAbertura: d.dataAbertura, naturezaJuridica: d.naturezaJuridica,
        logradouro: d.logradouro, numero: d.numero, complemento: d.complemento,
        bairro: d.bairro, cidade: d.cidade, estado: d.estado, cep: d.cep,
        telefone: d.telefone, email: d.email,
      };
    }

    case "buscar_clientes": {
      const { search, status, limit = 20 } = args as { search?: string; status?: string; limit?: number };
      const result = await storage.getClients({ search: search ?? "", status: status ?? "", page: 1, limit: Math.min(Number(limit), 100) });
      return {
        total: result.total,
        clientes: result.data.map((c) => ({
          id: c.id,
          nome: c.nomeFantasia || c.razaoSocial,
          razaoSocial: c.razaoSocial,
          cnpj: c.cnpj,
          cidade: c.cidade,
          estado: c.estado,
          telefone: c.telefone,
          email: c.email,
          status: c.status,
          segmento: c.segmento,
          criadoEm: c.createdAt,
          ultimoContato: c.dataUltimoContato,
        })),
      };
    }

    case "obter_cliente": {
      const { id } = args as { id: string };
      const client = await storage.getClient(id);
      if (!client) return { erro: "Cliente não encontrado" };
      return {
        id: client.id, tipoPessoa: client.tipoPessoa,
        razaoSocial: client.razaoSocial, nomeFantasia: client.nomeFantasia,
        cnpj: client.cnpj, cpf: client.cpf, inscricaoEstadual: client.inscricaoEstadual,
        telefone: client.telefone, whatsapp: client.whatsapp, email: client.email,
        cidade: client.cidade, estado: client.estado, cep: client.cep,
        logradouro: client.logradouro, bairro: client.bairro, status: client.status,
        segmento: client.segmento, potencialCompra: client.potencialCompra,
        observacoes: client.observacoes, criadoEm: client.createdAt,
        ultimoContato: client.dataUltimoContato,
      };
    }

    case "criar_cliente": {
      const data = args as Record<string, unknown>;
      const client = await storage.createClient({
        razaoSocial: data.razaoSocial as string,
        tipoPessoa: (data.tipoPessoa as "fisica" | "juridica") ?? "juridica",
        status: (data.status as any) ?? "prospect",
        nomeFantasia: (data.nomeFantasia as string) ?? null,
        cnpj: (data.cnpj as string) ?? null,
        cpf: (data.cpf as string) ?? null,
        inscricaoEstadual: (data.inscricaoEstadual as string) ?? null,
        inscricaoMunicipal: (data.inscricaoMunicipal as string) ?? null,
        situacaoCadastral: (data.situacaoCadastral as string) ?? null,
        naturezaJuridica: (data.naturezaJuridica as string) ?? null,
        dataAbertura: (data.dataAbertura as string) ?? null,
        telefone: (data.telefone as string) ?? null,
        whatsapp: (data.whatsapp as string) ?? null,
        email: (data.email as string) ?? null,
        site: (data.site as string) ?? null,
        cep: (data.cep as string) ?? null,
        logradouro: (data.logradouro as string) ?? null,
        numero: (data.numero as string) ?? null,
        complemento: (data.complemento as string) ?? null,
        bairro: (data.bairro as string) ?? null,
        cidade: (data.cidade as string) ?? null,
        estado: (data.estado as string) ?? null,
        observacoes: (data.observacoes as string) ?? null,
        segmento: (data.segmento as string) ?? null,
        potencialCompra: (data.potencialCompra as string) ?? null,
      } as any);
      return { sucesso: true, id: client.id, nome: client.nomeFantasia || client.razaoSocial };
    }

    case "atualizar_cliente": {
      const { id, ...fields } = args as { id: string; [k: string]: unknown };
      const updated = await storage.updateClient(id, fields as any);
      if (!updated) return { erro: "Cliente não encontrado" };
      return { sucesso: true, id: updated.id, nome: updated.nomeFantasia || updated.razaoSocial };
    }

    case "remover_cliente": {
      const { id } = args as { id: string };
      const client = await storage.getClient(id);
      if (!client) return { erro: "Cliente não encontrado" };
      await storage.softDeleteClient(id);
      return { sucesso: true, nome: client.nomeFantasia || client.razaoSocial };
    }

    case "estatisticas_clientes": {
      const { tipo, dias = 30 } = args as { tipo: string; dias?: number };

      if (tipo === "por_status") {
        const [ativos, inativos, prospects, bloqueados] = await Promise.all([
          storage.getClients({ status: "ativo",     limit: 1 }),
          storage.getClients({ status: "inativo",   limit: 1 }),
          storage.getClients({ status: "prospect",  limit: 1 }),
          storage.getClients({ status: "bloqueado", limit: 1 }),
        ]);
        return {
          tipo: "por_status",
          dados: [
            { status: "ativo",     total: ativos.total },
            { status: "prospect",  total: prospects.total },
            { status: "inativo",   total: inativos.total },
            { status: "bloqueado", total: bloqueados.total },
          ],
        };
      }

      if (tipo === "por_cidade") {
        const all = await storage.getClients({ limit: 1000 });
        const cidades: Record<string, number> = {};
        for (const c of all.data) {
          const key = c.cidade || "Não informada";
          cidades[key] = (cidades[key] ?? 0) + 1;
        }
        return {
          tipo: "por_cidade",
          totalGeral: all.total,
          dados: Object.entries(cidades).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cidade, total]) => ({ cidade, total })),
        };
      }

      if (tipo === "recentes") {
        const recentes = await storage.getClients({ limit: 10 });
        return {
          tipo: "recentes",
          clientes: recentes.data.slice(0, 10).map((c) => ({
            nome: c.nomeFantasia || c.razaoSocial, status: c.status, cidade: c.cidade, criadoEm: c.createdAt,
          })),
        };
      }

      if (tipo === "sem_contato") {
        const all = await storage.getClients({ status: "ativo", limit: 1000 });
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - Number(dias));
        const semContato = all.data.filter((c) => !c.dataUltimoContato || new Date(c.dataUltimoContato) < cutoff);
        return {
          tipo: "sem_contato", dias, total: semContato.length,
          clientes: semContato.slice(0, 20).map((c) => ({
            id: c.id, nome: c.nomeFantasia || c.razaoSocial, cidade: c.cidade, ultimoContato: c.dataUltimoContato,
          })),
        };
      }

      return { erro: "Tipo de estatística desconhecido" };
    }

    case "gerar_relatorio": {
      const { formato, titulo, status, search } = args as {
        formato: "pdf" | "excel";
        titulo?: string;
        status?: string;
        search?: string;
      };

      // Count matching clients
      const result = await storage.getClients({ status: status ?? "", search: search ?? "", limit: 1 });

      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const reportTitle = titulo ?? (status ? `Clientes ${status.charAt(0).toUpperCase() + status.slice(1)}s` : "Todos os Clientes");
      params.set("titulo", reportTitle);

      const url = `/api/clients/export/${formato}?${params.toString()}`;
      const ext = formato === "pdf" ? "PDF" : "Excel";

      return {
        sucesso: true,
        url,
        formato,
        totalClientes: result.total,
        titulo: reportTitle,
        descricao: `Relatório ${ext} com ${result.total} cliente${result.total !== 1 ? "s" : ""}`,
      };
    }

    default:
      return { erro: `Ferramenta desconhecida: ${name}` };
  }
}

export interface ClientAgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClientAgentResponse {
  reply: string;
  toolCalls: { tool: string; args: unknown; result: unknown }[];
  mutated: boolean;
}

export async function runClientAgent(
  userMessage: string,
  history: ClientAgentMessage[]
): Promise<ClientAgentResponse> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const toolCalls: ClientAgentResponse["toolCalls"] = [];
  const MUTATING_TOOLS = new Set(["criar_cliente", "atualizar_cliente", "remover_cliente"]);
  let mutated = false;

  let iterations = 0;
  while (iterations < 8) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 1200,
    });

    const choice = response.choices[0];
    const msg = choice.message;
    messages.push(msg as OpenAI.Chat.ChatCompletionMessageParam);

    if (choice.finish_reason === "stop" || !msg.tool_calls?.length) {
      return { reply: msg.content ?? "Pronto.", toolCalls, mutated };
    }

    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments ?? "{}") as Record<string, unknown>;
      const result = await executeTool(tc.function.name, args);
      if (MUTATING_TOOLS.has(tc.function.name)) mutated = true;

      toolCalls.push({ tool: tc.function.name, args, result });

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  return { reply: "Processamento concluído.", toolCalls, mutated };
}
