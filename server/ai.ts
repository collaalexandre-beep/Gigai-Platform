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

// ─── SPECIAL QUOTE GENERATION ─────────────────────────────────────────────────

export interface SpecialQuoteItem {
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  precoTotal: number;
  materialId?: string | null;
  materialNome?: string | null;
  encontrado: boolean;
}

export interface SpecialQuoteResult {
  titulo: string;
  itens: SpecialQuoteItem[];
  subtotal: number;
  total: number;
  observacoes: string;
  materiaisNaoEncontrados: string[];
  novoMaterial?: {
    nome: string;
    categoria: string;
    custoUnitario: number;
    unidade: string;
    descricao?: string;
  } | null;
}

export async function generateSpecialQuote(
  prompt: string,
  rawMaterials: { id: string; nome: string; categoria: string; custoUnitario: string | null; unidadeCompra: string }[],
  products: { id: string; nome: string; categoria: string; tipoCalculo: string; unidadeVenda: string }[],
  rules: { nome: string; regra: string }[]
): Promise<SpecialQuoteResult> {
  const matList = rawMaterials.map((m) =>
    `ID: ${m.id} | Nome: ${m.nome} | Categoria: ${m.categoria} | Custo: R$${m.custoUnitario ?? "?"} / ${m.unidadeCompra}`
  ).join("\n");

  const prodList = products.map((p) =>
    `ID: ${p.id} | Nome: ${p.nome} | Categoria: ${p.categoria} | Cálculo: ${p.tipoCalculo} / ${p.unidadeVenda}`
  ).join("\n");

  const rulesList = rules.filter((r) => r.regra).map((r) => `- ${r.nome}: ${r.regra}`).join("\n");

  const systemPrompt = `Você é um especialista em orçamentos de gráfica e comunicação visual brasileira.
Analise o pedido do cliente e gere um orçamento detalhado consultando a lista de matérias-primas e produtos.

MATÉRIAS-PRIMAS DISPONÍVEIS:
${matList || "Nenhuma matéria-prima cadastrada."}

PRODUTOS DISPONÍVEIS:
${prodList || "Nenhum produto cadastrado."}

REGRAS DE ORÇAMENTO:
${rulesList || "Sem regras específicas."}

INSTRUÇÕES:
1. Analise o pedido e identifique todos os materiais necessários
2. Consulte a lista de matérias-primas para encontrar os itens mais próximos
3. Se não encontrar um material exato, use o mais similar e anote na observação
4. Calcule as quantidades com base nas dimensões informadas (adicione 5cm de margem para corte)
5. Use os preços do cadastro quando disponíveis; caso contrário, estime preços de mercado brasileiros
6. Aplique as regras de orçamento quando relevantes
7. Liste claramente os materiais não encontrados no cadastro

Retorne APENAS um JSON com este formato exato:
{
  "titulo": "Título descritivo do trabalho",
  "itens": [
    {
      "descricao": "Nome do material/serviço",
      "quantidade": 1.0,
      "unidade": "m²",
      "precoUnitario": 100.00,
      "precoTotal": 100.00,
      "materialId": "id_se_encontrado_ou_null",
      "materialNome": "nome_exato_da_lista_ou_null",
      "encontrado": true
    }
  ],
  "subtotal": 100.00,
  "total": 100.00,
  "observacoes": "Notas técnicas importantes, substituições realizadas, margens aplicadas etc.",
  "materiaisNaoEncontrados": ["Lista de materiais pedidos mas não encontrados no cadastro"],
  "novoMaterial": null
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Falha ao obter resposta da IA");
  return JSON.parse(content) as SpecialQuoteResult;
}

export async function adjustSpecialQuote(
  originalPrompt: string,
  previousResult: SpecialQuoteResult,
  adjustment: string,
  rawMaterials: { id: string; nome: string; categoria: string; custoUnitario: string | null; unidadeCompra: string }[],
  products: { id: string; nome: string; categoria: string; tipoCalculo: string; unidadeVenda: string }[],
  rules: { nome: string; regra: string }[]
): Promise<SpecialQuoteResult> {
  const matList = rawMaterials.map((m) =>
    `ID: ${m.id} | Nome: ${m.nome} | Categoria: ${m.categoria} | Custo: R$${m.custoUnitario ?? "?"} / ${m.unidadeCompra}`
  ).join("\n");

  const rulesList = rules.filter((r) => r.regra).map((r) => `- ${r.nome}: ${r.regra}`).join("\n");

  const systemPrompt = `Você é um especialista em orçamentos de gráfica e comunicação visual brasileira.
Você receberá um orçamento existente e uma instrução de ajuste do vendedor.

MATÉRIAS-PRIMAS DISPONÍVEIS:
${matList || "Nenhuma matéria-prima cadastrada."}

REGRAS DE ORÇAMENTO:
${rulesList || "Sem regras específicas."}

INSTRUÇÕES:
1. Analise o ajuste solicitado pelo vendedor
2. Se o vendedor mencionar um novo material com preço, inclua-o no campo "novoMaterial" para ser cadastrado
3. Recalcule o orçamento com base no ajuste
4. Mantenha os itens já corretos e modifique apenas o necessário
5. Se uma nova regra for sugerida, aplique-a e inclua nas observações

Retorne APENAS um JSON com o mesmo formato do orçamento anterior, atualizado.
Se um novo material for identificado para cadastro, preencha "novoMaterial":
{
  "novoMaterial": {
    "nome": "Nome do material",
    "categoria": "chapas|impressao|estruturas|iluminacao|fixacao|adesivos|tintas|acabamento|instalacao|servicos_terceirizados|outros",
    "custoUnitario": 100.00,
    "unidade": "m²",
    "descricao": "Descrição opcional"
  }
}`;

  const previousResultStr = JSON.stringify(previousResult, null, 2);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Pedido original: ${originalPrompt}\n\nOrçamento atual:\n${previousResultStr}\n\nAjuste solicitado: ${adjustment}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Falha ao obter resposta da IA");
  return JSON.parse(content) as SpecialQuoteResult;
}
