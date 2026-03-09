import OpenAI from "openai";

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

export interface QuoteItemSuggestion {
  productId: string | null;
  descricao: string;
  largura: number | null;
  altura: number | null;
  area: number | null;
  quantidade: number;
  unidade: string;
  custoCalculado: number;
  precoUnitario: number;
  precoTotal: number;
  observacoes: string;
}

export async function suggestQuoteItem(
  prompt: string,
  availableProducts: { id: string; nome: string; categoria: string; tipoCalculo: string; unidadeVenda: string }[]
): Promise<QuoteItemSuggestion> {
  const productsList = availableProducts
    .map((p) => `ID: ${p.id}, Nome: ${p.nome}, Categoria: ${p.categoria}, Cálculo: ${p.tipoCalculo}, Unidade: ${p.unidadeVenda}`)
    .join("\n");

  const systemPrompt = `Você é um assistente especializado em orçamentos de gráfica e comunicação visual brasileira.
Analise o pedido do cliente e sugira um item de orçamento com medidas e preço estimado.

Produtos disponíveis no catálogo (use o ID se encontrar correspondência):
${productsList || "Nenhum produto cadastrado ainda."}

Retorne APENAS um JSON com este formato exato:
{
  "productId": "id_do_produto_se_encontrado_ou_null",
  "descricao": "Descrição clara do item",
  "largura": 1.0,
  "altura": 1.0,
  "area": 1.0,
  "quantidade": 1,
  "unidade": "un",
  "custoCalculado": 0,
  "precoUnitario": 50.00,
  "precoTotal": 50.00,
  "observacoes": "Observações técnicas relevantes"
}

Regras:
- Se o produto for m2 (banner, lona, adesivo), calcule largura × altura = area e baseie o preço nisso
- Se for unidade (camiseta, brinde), deixe largura e altura como null e area como null
- precoUnitario deve ser um valor de mercado realista em R$ para o Brasil
- precoTotal = precoUnitario × quantidade (para m2, precoUnitario é o preço por m2)
- unidade: "m²" para área, "un" para unidade, "ml" para metro linear`;

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

  return JSON.parse(content) as QuoteItemSuggestion;
}
