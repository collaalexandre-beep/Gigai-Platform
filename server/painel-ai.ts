import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export const FUEL_LABELS: Record<string, string> = {
  vazio: "Vazio",
  quarto: "1/4",
  metade: "1/2",
  tres_quartos: "3/4",
  cheio: "Cheio",
};

export const CONFIANCA_THRESHOLD = 60;

export interface PainelAnalise {
  km: number | null;
  combustivel: "vazio" | "quarto" | "metade" | "tres_quartos" | "cheio" | null;
  alertas: string[];
  confiancaKm: number;
  confiancaCombustivel: number;
  confiancaGeral: number;
  numeroVeiculo: number | null;
  raw: string;
  sucesso: boolean;
  erro?: string;
}

const SYSTEM_PROMPT = `Você é um especialista em leitura de painéis de veículos.
Analise a foto do painel/dashboard do veículo e retorne APENAS um JSON com o seguinte formato:
{
  "km": <número inteiro do odômetro, ex: 82415, ou null se não visível/legível>,
  "combustivel": <"vazio" | "quarto" | "metade" | "tres_quartos" | "cheio" | null>,
  "alertas": [<lista de strings com alertas/luzes de aviso visíveis no painel, em português>],
  "confiancaKm": <0 a 100, sua confiança na leitura do km>,
  "confiancaCombustivel": <0 a 100, sua confiança na leitura do combustível>,
  "confiancaGeral": <0 a 100, confiança geral na análise>,
  "numeroVeiculo": <número inteiro se houver adesivo/etiqueta/cartão com número do veículo visível no painel (ex: "1", "2", "CARRO 1", "VEI 2"), ou null se não houver>
}

REGRAS:
- Se o odômetro não estiver visível, legível ou presente: km=null, confiancaKm=0
- Para combustível use apenas: "vazio", "quarto", "metade", "tres_quartos", "cheio" ou null
  - vazio = tanque vazio ou abaixo de 1/8
  - quarto = ~25% do tanque
  - metade = ~50% do tanque
  - tres_quartos = ~75% do tanque
  - cheio = tanque cheio ou acima de 7/8
- Alertas: liste apenas os que você vê com clareza (luz do motor, pressão de pneus, bateria, airbag, ABS, temperatura, óleo, etc.)
- numeroVeiculo: procure etiquetas, adesivos ou cartões com número de identificação do veículo (pode estar no painel, espelho retrovisor, viseira ou pára-sol). Retorne apenas o número inteiro (ex: 1, 2, 3), ou null se não encontrar.
- Use confiança alta (>80) apenas quando os valores são claramente legíveis
- Retorne APENAS o JSON, sem nenhum texto adicional ou markdown`;

function imageToBase64(localPath: string): string {
  const fullPath = localPath.startsWith("/")
    ? path.join(process.cwd(), localPath)
    : path.join(process.cwd(), localPath);
  const buffer = fs.readFileSync(fullPath);
  return buffer.toString("base64");
}

export async function analisarPainelVeiculo(
  imagePathOrUrl: string
): Promise<PainelAnalise> {
  const emptyResult: PainelAnalise = {
    km: null,
    combustivel: null,
    alertas: [],
    confiancaKm: 0,
    confiancaCombustivel: 0,
    confiancaGeral: 0,
    numeroVeiculo: null,
    raw: "",
    sucesso: false,
  };

  try {
    let imageUrl: string;

    if (imagePathOrUrl.startsWith("http://") || imagePathOrUrl.startsWith("https://")) {
      imageUrl = imagePathOrUrl;
    } else {
      const base64 = imageToBase64(imagePathOrUrl);
      imageUrl = `data:image/jpeg;base64,${base64}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 600,
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content ?? "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[PainelAI] Resposta sem JSON válido:", raw);
      return { ...emptyResult, raw, erro: "Resposta sem JSON válido" };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const validFuels = ["vazio", "quarto", "metade", "tres_quartos", "cheio"];
    const combustivel = validFuels.includes(parsed.combustivel)
      ? (parsed.combustivel as PainelAnalise["combustivel"])
      : null;

    return {
      km: typeof parsed.km === "number" ? Math.round(parsed.km) : null,
      combustivel,
      alertas: Array.isArray(parsed.alertas) ? parsed.alertas.filter((a: unknown) => typeof a === "string") : [],
      confiancaKm: Math.min(100, Math.max(0, Number(parsed.confiancaKm ?? 0))),
      confiancaCombustivel: Math.min(100, Math.max(0, Number(parsed.confiancaCombustivel ?? 0))),
      confiancaGeral: Math.min(100, Math.max(0, Number(parsed.confiancaGeral ?? 0))),
      numeroVeiculo: typeof parsed.numeroVeiculo === "number" ? Math.round(parsed.numeroVeiculo) : null,
      raw,
      sucesso: true,
    };
  } catch (err) {
    console.error("[PainelAI] Erro na análise:", err);
    return { ...emptyResult, raw: String(err), erro: String(err) };
  }
}

export function parseFuelLevel(msgNorm: string): PainelAnalise["combustivel"] | null {
  const map: Record<string, PainelAnalise["combustivel"]> = {
    vazio: "vazio",
    "0": "vazio",
    "0/4": "vazio",
    "sem combustivel": "vazio",
    "sem combustível": "vazio",
    "1/4": "quarto",
    quarto: "quarto",
    "um quarto": "quarto",
    "25%": "quarto",
    "1/2": "metade",
    metade: "metade",
    meio: "metade",
    "50%": "metade",
    "3/4": "tres_quartos",
    "tres quartos": "tres_quartos",
    "três quartos": "tres_quartos",
    "75%": "tres_quartos",
    cheio: "cheio",
    "100%": "cheio",
    "4/4": "cheio",
    completo: "cheio",
    full: "cheio",
  };
  return map[msgNorm] ?? null;
}

export function formatAlerts(alertasJson: string | null | undefined): string {
  if (!alertasJson) return "";
  try {
    const arr = JSON.parse(alertasJson) as string[];
    return arr.length > 0 ? arr.join(", ") : "";
  } catch {
    return "";
  }
}
