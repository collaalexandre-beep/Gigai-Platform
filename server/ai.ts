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
  memoriaCalculo: string;
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

function normalizeSpecialQuoteResult(parsed: Record<string, unknown>): SpecialQuoteResult {
  // AI may return "items" (English) instead of "itens" (Portuguese)
  if (!parsed.itens && parsed.items) {
    parsed.itens = parsed.items;
    delete parsed.items;
  }
  if (!Array.isArray(parsed.itens)) parsed.itens = [];
  if (!Array.isArray(parsed.materiaisNaoEncontrados)) parsed.materiaisNaoEncontrados = [];
  if (typeof parsed.subtotal !== "number") parsed.subtotal = Number(parsed.subtotal) || 0;
  if (typeof parsed.total !== "number") parsed.total = Number(parsed.total) || 0;
  if (typeof parsed.memoriaCalculo !== "string") parsed.memoriaCalculo = "";
  // Ensure all item prices are numbers
  if (Array.isArray(parsed.itens)) {
    parsed.itens = (parsed.itens as Record<string, unknown>[]).map((item) => ({
      ...item,
      quantidade: Number(item.quantidade) || 0,
      precoUnitario: Number(item.precoUnitario) || 0,
      precoTotal: Number(item.precoTotal) || 0,
    }));
  }
  return parsed as unknown as SpecialQuoteResult;
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

  const systemPrompt = `Você é o orçamentista sênior de uma gráfica de comunicação visual no Brasil com 20 anos de experiência.
Você conhece profundamente os preços praticados no mercado brasileiro de impressão, plotagem, adesivos, lona, ACM, policarbonato, metalon, iluminação, instalação e afins.

REGRA FUNDAMENTAL: NUNCA retorne preço zero. Se o material não estiver no cadastro, use seu conhecimento de mercado brasileiro atual para estimar um preço realista. Você DEVE calcular um valor para cada item.

MATÉRIAS-PRIMAS CADASTRADAS (use estes preços quando disponíveis — prioridade máxima):
${matList || "Nenhuma cadastrada ainda — use preços de mercado."}

PRODUTOS CADASTRADOS:
${prodList || "Nenhum cadastrado ainda."}

REGRAS DE ORÇAMENTO DA EMPRESA (aplique obrigatoriamente):
${rulesList || "Sem regras específicas."}

TABELA DE PREÇOS DE REFERÊNCIA BRASIL (use quando material não estiver no cadastro):
- Lona impressa (banner/faixa): R$ 35-55/m² (impressão inclusa)
- Lona crua sem impressão: R$ 8-15/m²
- Vinil adesivo comum: R$ 25-45/m²
- Vinil premium (Mactac, 3M): R$ 55-90/m²
- Polipropileno / Couché: R$ 0,08-0,25/folha A4
- ACM (Alumínio Composto) 3mm: R$ 120-180/m²
- Policarbonato 4mm: R$ 180-280/m²
- Policarbonato 6mm: R$ 250-380/m²
- Acrílico 3mm: R$ 90-140/m²
- Acrílico 5mm: R$ 140-200/m²
- MDF 15mm: R$ 70-110/m²
- Metalon 20×20 (6m): R$ 35-55/barra
- Metalon 30×30 (6m): R$ 55-80/barra
- Perfil de alumínio: R$ 40-80/m
- LED Neon flex/strip: R$ 30-70/m
- Letra caixa em acrílico/ACM: R$ 150-400/letra (tamanho médio)
- Mão de obra instalação externa simples: R$ 80-150/h
- Mão de obra instalação complexa/altura: R$ 120-250/h
- Plotagem A0: R$ 12-25/folha
- Impressão digital grande formato: R$ 30-80/m²
- Recorte a laser/plotter: R$ 15-40/m linear

COMO CALCULAR:
- Faixas/banners: calcule área total (L×A) + 10% margem corte → impressão lona + acabamento (ilhós/bastão)
- Fachadas ACM: área da fachada + estrutura metalon (perímetro × 3 barras/m²) + fixação + instalação
- Adesivos: área aplicada + 15% perda de corte
- Letras caixa: contagem de letras × custo/letra + instalação
- Impressão: área × preço/m² do substrato + acabamento
- Horas de trabalho: estime o tempo real necessário (montagem, aplicação, instalação)

MEMÓRIA DE CÁLCULO obrigatória: detalhe cada conta passo a passo.
Exemplo: "Lona: 3,00m × 1,10m (c/ margem) = 3,30m² × R$45/m² = R$148,50 | Ilhós: 10un × R$1,50 = R$15,00"

Retorne APENAS um JSON com este formato exato (todos os campos obrigatórios, sem exceção):
{
  "titulo": "Título descritivo do trabalho",
  "itens": [
    {
      "descricao": "Nome do material/serviço",
      "quantidade": 3.30,
      "unidade": "m²",
      "precoUnitario": 45.00,
      "precoTotal": 148.50,
      "materialId": "id_do_cadastro_ou_null",
      "materialNome": "nome_exato_do_cadastro_ou_null",
      "encontrado": false
    }
  ],
  "memoriaCalculo": "Passo a passo detalhado de como cada valor foi calculado, linha por linha",
  "subtotal": 163.50,
  "total": 163.50,
  "observacoes": "Margens aplicadas, substituições, prazo estimado, observações técnicas relevantes",
  "materiaisNaoEncontrados": ["material1 — preço estimado por mercado", "material2"],
  "novoMaterial": null
}

IMPORTANTE: subtotal e total devem ser a soma exata de todos os precoTotal dos itens. Nunca retorne 0 nesses campos.`;

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
  return normalizeSpecialQuoteResult(JSON.parse(content));
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

  const systemPrompt = `Você é o orçamentista sênior de uma gráfica de comunicação visual no Brasil com 20 anos de experiência.
Você está em modo de APRENDIZADO e AJUSTE — o vendedor está corrigindo ou ensinando informações ao sistema.

REGRA FUNDAMENTAL: NUNCA retorne preço zero. Aplique todos os ajustes solicitados e recalcule tudo.

MATÉRIAS-PRIMAS CADASTRADAS (preços atualizados pelo vendedor têm prioridade máxima):
${matList || "Nenhuma cadastrada ainda."}

REGRAS DE ORÇAMENTO DA EMPRESA:
${rulesList || "Sem regras específicas."}

O QUE O VENDEDOR PODE ENSINAR NESTE CAMPO:
- Corrigir preços: "a lona custa R$38/m², não R$45" → corrija o preço e recalcule
- Cadastrar material novo: "o acrílico 5mm aqui custa R$160/m²" → crie em novoMaterial
- Aplicar percentual: "coloque 30% de margem de lucro" → aplique ao total
- Corrigir quantidade: "são 3 peças, não 1" → ajuste e recalcule
- Remover item: "não precisa de instalação" → remova o item
- Adicionar item: "adicione 2 horas de arte" → insira novo item
- Trocar material: "use lona fria em vez de lona quente" → substitua
- Regra nova: "clientes da região ganham 5% de desconto" → aplique e mencione nas observações

INSTRUÇÕES:
1. Interprete o ajuste do vendedor e aplique EXATAMENTE o que foi pedido
2. Se o vendedor informar um preço real de material, use esse preço para recalcular todos os itens afetados
3. Se for um novo material com preço, preencha "novoMaterial" para ser salvo no cadastro
4. Atualize a memória de cálculo refletindo os novos valores
5. Mantenha itens não afetados pelo ajuste inalterados
6. Recalcule subtotal e total após qualquer mudança — nunca deixe valores desatualizados

Retorne APENAS um JSON com o mesmo formato, completamente atualizado (incluindo memoriaCalculo):
{
  "titulo": "...",
  "itens": [...],
  "memoriaCalculo": "Memória de cálculo atualizada refletindo todos os ajustes feitos",
  "subtotal": 0.00,
  "total": 0.00,
  "observacoes": "Explique quais ajustes foram feitos e por quê",
  "materiaisNaoEncontrados": [],
  "novoMaterial": {
    "nome": "Nome do material a cadastrar",
    "categoria": "chapas|impressao|estruturas|iluminacao|fixacao|adesivos|tintas|acabamento|instalacao|servicos_terceirizados|outros",
    "custoUnitario": 100.00,
    "unidade": "m²",
    "descricao": "Descrição opcional"
  }
}
Se não houver novo material para cadastrar, use "novoMaterial": null.`;

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
  return normalizeSpecialQuoteResult(JSON.parse(content));
}
