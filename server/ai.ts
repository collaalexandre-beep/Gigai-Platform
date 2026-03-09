import OpenAI from "openai";

// Standardize the AI client retrieval
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface SuggestedComponent {
  rawMaterialId?: string;
  nomeSugerido: string;
  tipoConsumo: string;
  quantidadeBase: string;
  perdaAdicional: string;
  observacaoTecnica?: string;
}

export interface ProductSuggestion {
  nome: string;
  categoria: string;
  descricaoComercial: string;
  descricaoTecnica: string;
  unidadeVenda: string;
  tipoCalculo: "m2" | "unidade" | "metro_linear" | "perimetro" | "projeto" | "fixo_variavel";
  componentes: SuggestedComponent[];
  duvidas: string[];
  confianca: number;
}

export async function generateProductSuggestion(
  prompt: string,
  availableMaterials: { id: string; nome: string; categoria: string }[]
): Promise<ProductSuggestion> {
  const materialsList = availableMaterials
    .map((m) => `ID: ${m.id}, Nome: ${m.nome}, Categoria: ${m.categoria}`)
    .join("\n");

  const systemPrompt = `Você é um especialista técnico em indústria gráfica e comunicação visual brasileira.
Sua tarefa é analisar um pedido de criação de produto e sugerir a configuração técnica completa.

Lista de Matérias-Primas disponíveis (tente mapear os componentes para estas se houver correspondência clara):
${materialsList}

Retorne APENAS um JSON estruturado com o seguinte formato:
{
  "nome": "Nome do Produto",
  "categoria": "Categoria Sugerida",
  "descricaoComercial": "Descrição para o cliente",
  "descricaoTecnica": "Detalhes técnicos internos",
  "unidadeVenda": "unidade|m2|par|cento",
  "tipoCalculo": "m2|unidade|metro_linear|perimetro|projeto|fixo_variavel",
  "componentes": [
    {
      "rawMaterialId": "id_da_lista_se_encontrado_ou_null",
      "nomeSugerido": "Nome da matéria-prima sugerida",
      "tipoConsumo": "m2|unidade|ml|perimetro",
      "quantidadeBase": "1.0000",
      "perdaAdicional": "10.00",
      "observacaoTecnica": "Por que usar este componente"
    }
  ],
  "duvidas": ["Lista de possíveis ambiguidades ou alertas sobre a viabilidade"],
  "confianca": 85
}

O tipoCalculo deve ser um destes: m2, unidade, metro_linear, perimetro, projeto, fixo_variavel.
Seja preciso tecnicamente. Se o produto for um Banner, ele precisa de lona, tinta (impressão), tubos e cordão.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Falha ao obter resposta da IA");
  }

  return JSON.parse(content) as ProductSuggestion;
}
