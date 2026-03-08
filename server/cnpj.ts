/**
 * CNPJ Lookup Service
 * Desacoplado da interface — suporta múltiplos providers com fallback automático.
 * Para adicionar um novo provider: implementar CnpjProvider e adicionar à lista.
 */

export interface CnpjData {
  cnpj: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  situacaoCadastral?: string;
  dataAbertura?: string;
  naturezaJuridica?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
}

export interface CnpjLookupResult {
  success: boolean;
  provider: string;
  data?: CnpjData;
  error?: string;
  rawResponse?: unknown;
}

interface CnpjProvider {
  name: string;
  lookup(cnpj: string): Promise<CnpjLookupResult>;
}

// ─── Provider: BrasilAPI ──────────────────────────────────────────────────────

const brasilApiProvider: CnpjProvider = {
  name: "BrasilAPI",
  async lookup(cnpj: string): Promise<CnpjLookupResult> {
    const clean = cnpj.replace(/\D/g, "");
    const url = `https://brasilapi.com.br/api/cnpj/v1/${clean}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "GraficaERP/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, provider: "BrasilAPI", error: text };
      }
      const raw = await res.json();
      const data: CnpjData = {
        cnpj: clean,
        razaoSocial: raw.razao_social,
        nomeFantasia: raw.nome_fantasia || undefined,
        situacaoCadastral: raw.descricao_situacao_cadastral,
        dataAbertura: raw.data_inicio_atividade,
        naturezaJuridica: raw.natureza_juridica,
        logradouro: raw.logradouro,
        numero: raw.numero,
        complemento: raw.complemento || undefined,
        bairro: raw.bairro,
        cidade: raw.municipio,
        estado: raw.uf,
        cep: raw.cep?.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"),
        telefone: raw.ddd_telefone_1
          ? `(${raw.ddd_telefone_1.slice(0, 2)}) ${raw.ddd_telefone_1.slice(2)}`
          : undefined,
        email: raw.email || undefined,
      };
      return { success: true, provider: "BrasilAPI", data, rawResponse: raw };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, provider: "BrasilAPI", error: msg };
    }
  },
};

// ─── Provider: ReceitaWS ──────────────────────────────────────────────────────

const receitaWsProvider: CnpjProvider = {
  name: "ReceitaWS",
  async lookup(cnpj: string): Promise<CnpjLookupResult> {
    const clean = cnpj.replace(/\D/g, "");
    const url = `https://www.receitaws.com.br/v1/cnpj/${clean}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "GraficaERP/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, provider: "ReceitaWS", error: text };
      }
      const raw = await res.json();
      if (raw.status === "ERROR") {
        return {
          success: false,
          provider: "ReceitaWS",
          error: raw.message || "Erro desconhecido",
        };
      }
      const data: CnpjData = {
        cnpj: clean,
        razaoSocial: raw.nome,
        nomeFantasia: raw.fantasia || undefined,
        situacaoCadastral: raw.situacao,
        dataAbertura: raw.abertura,
        naturezaJuridica: raw.natureza_juridica,
        logradouro: raw.logradouro,
        numero: raw.numero,
        complemento: raw.complemento || undefined,
        bairro: raw.bairro,
        cidade: raw.municipio,
        estado: raw.uf,
        cep: raw.cep,
        telefone: raw.telefone || undefined,
        email: raw.email || undefined,
      };
      return { success: true, provider: "ReceitaWS", data, rawResponse: raw };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, provider: "ReceitaWS", error: msg };
    }
  },
};

// ─── Service ─────────────────────────────────────────────────────────────────

const providers: CnpjProvider[] = [brasilApiProvider, receitaWsProvider];

export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult> {
  for (const provider of providers) {
    const result = await provider.lookup(cnpj);
    if (result.success) return result;
    console.warn(
      `[CNPJ] Provider ${provider.name} falhou: ${result.error}. Tentando próximo...`
    );
  }
  return {
    success: false,
    provider: "none",
    error: "Todos os providers falharam. Verifique o CNPJ e tente novamente.",
  };
}

export function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function validateCnpj(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  const calc = (len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(clean.charAt(len - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };

  return (
    calc(12) === parseInt(clean.charAt(12)) &&
    calc(13) === parseInt(clean.charAt(13))
  );
}
