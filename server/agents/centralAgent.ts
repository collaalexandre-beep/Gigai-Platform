import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ClassificationResult {
  destino: "comercial" | "frota" | "compras" | "financeiro" | "humano";
  intencao: string;
  confianca: number;
}

const CLASSIFICATION_PROMPT = `Você é o Agente Central de roteamento de mensagens de um sistema de gestão para uma gráfica comercial brasileira chamada Gráfica+.

Você recebe mensagens de WhatsApp e precisa classificar para qual agente especializado encaminhar.

AGENTES DISPONÍVEIS:
1. "comercial" — Para clientes pedindo orçamentos, banners, faixas, adesivos, fachadas, placas PVC, cartões de visita, lonas, ACM, letras caixa, brindes, impressão em geral, ou consultando status de pedido/orçamento.
2. "frota" — Para funcionários sobre veículos da empresa: registrar saída de carro/van/moto/pickup, registrar retorno de veículo, informar KM, retirar ou devolver veículo.
3. "compras" — Para funcionários solicitando compra de materiais, reposição de estoque, material para OS (ordem de serviço), material de expediente, cotação com fornecedores, pedido de insumos.
4. "financeiro" — Para assuntos financeiros: pagamentos, boletos, notas fiscais (módulo em desenvolvimento).
5. "humano" — Quando não conseguir classificar com certeza ou o assunto não se enquadrar nos anteriores.

EXEMPLOS:
- "quero um banner de 3x1m" → comercial
- "vou sair com o carro" → frota
- "retornei com a S10" → frota
- "preciso de tinta para a OS 1234" → compras
- "me manda o boleto" → financeiro
- "oi, tudo bem?" → humano

Responda SOMENTE com JSON válido, sem texto adicional:
{
  "destino": "comercial | frota | compras | financeiro | humano",
  "intencao": "descrição curta da intenção (máx 60 chars)",
  "confianca": 0.0
}`;

export async function classifyMessage(message: string): Promise<ClassificationResult> {
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 150,
    });

    const result = JSON.parse(resp.choices[0].message.content ?? "{}") as ClassificationResult;
    return {
      destino: result.destino ?? "humano",
      intencao: result.intencao ?? "intenção não identificada",
      confianca: typeof result.confianca === "number" ? result.confianca : 0,
    };
  } catch (e) {
    console.error("[CentralAgent] Erro na classificação:", e);
    return { destino: "humano", intencao: "erro na classificação", confianca: 0 };
  }
}
