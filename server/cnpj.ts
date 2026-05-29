/**
 * CNPJ Lookup Service
 * Desacoplado da interface — suporta múltiplos providers com fallback automático.
 * Para adicionar um novo provider: implementar CnpjProvider e adicionar à lista.
 *
 * Providers (em ordem de tentativa):
 *   1. publica.cnpj.ws — dados completos + inscrição estadual via SINTEGRA
 *   2. BrasilAPI       — dados básicos oficiais da Receita Federal
 *   3. ReceitaWS       — fallback geral
 */

export interface CnpjData {
  cnpj: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;     // IE principal formatada (pode conter múltiplas: "SP: 000 / MG: 111")
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

// ─── Provider: publica.cnpj.ws ────────────────────────────────────────────────
// Fonte: https://publica.cnpj.ws — dados Receita Federal + SINTEGRA (IE)
// Endpoint: GET /cnpj/{cnpj14}
// Retorna inscrição estadual por UF quando disponível via Sintegra

const publicaCnpjWsProvider: CnpjProvider = {
  name: "publica.cnpj.ws",
  async lookup(cnpj: string): Promise<CnpjLookupResult> {
    const clean = cnpj.replace(/\D/g, "");
    const url = `https://publica.cnpj.ws/cnpj/${clean}`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "GraficaERP/1.0",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, provider: "publica.cnpj.ws", error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }
      const raw = await res.json();

      // A resposta tem dados da empresa (raiz) + dados do estabelecimento (filial/matriz) aninhados
      const estab = raw.estabelecimento || {};

      // Extrair inscrição(ões) estadual(is) — pode haver mais de uma UF
      let inscricaoEstadual: string | undefined;
      const ies = Array.isArray(estab.inscricoes_estaduais) ? estab.inscricoes_estaduais : [];
      if (ies.length > 0) {
        const ativas = ies.filter((ie: any) => ie.ativo);
        const lista = ativas.length > 0 ? ativas : ies;
        // Formatar: "SP: 310.035.324.119 / PE: 0916078-76"
        inscricaoEstadual = lista
          .map((ie: any) => {
            const uf = ie.estado?.sigla || "";
            const num = String(ie.inscricao_estadual || "").trim();
            return uf ? `${uf}: ${num}` : num;
          })
          .filter(Boolean)
          .join(" / ");
        if (!inscricaoEstadual) inscricaoEstadual = undefined;
      }

      // Telefone principal
      let telefone: string | undefined;
      if (estab.ddd1 && estab.telefone1) {
        telefone = `(${estab.ddd1}) ${String(estab.telefone1).replace(/(\d{4,5})(\d{4})$/, "$1-$2")}`;
      }

      // CEP formatado
      const cep = estab.cep
        ? String(estab.cep).replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2")
        : undefined;

      const data: CnpjData = {
        cnpj: clean,
        razaoSocial: raw.razao_social,
        nomeFantasia: estab.nome_fantasia || undefined,
        inscricaoEstadual,
        situacaoCadastral: estab.situacao_cadastral,
        dataAbertura: estab.data_inicio_atividade,
        naturezaJuridica: raw.natureza_juridica?.descricao,
        logradouro: estab.logradouro
          ? `${estab.tipo_logradouro ? estab.tipo_logradouro + " " : ""}${estab.logradouro}`.trim()
          : undefined,
        numero: estab.numero || undefined,
        complemento: estab.complemento || undefined,
        bairro: estab.bairro || undefined,
        cidade: estab.cidade?.nome || undefined,
        estado: estab.estado?.sigla || undefined,
        cep,
        telefone,
        email: estab.email || undefined,
      };

      return { success: true, provider: "publica.cnpj.ws", data, rawResponse: raw };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, provider: "publica.cnpj.ws", error: msg };
    }
  },
};

// ─── Provider: open.cnpja.com ─────────────────────────────────────────────────
// Fonte: https://open.cnpja.com — dados Receita Federal + IEs (melhor cobertura de IE que SINTEGRA)
// Endpoint: GET /office/{cnpj14}
// Retorna `registrations` array com IEs por UF

const openCnpjaProvider: CnpjProvider = {
  name: "open.cnpja.com",
  async lookup(cnpj: string): Promise<CnpjLookupResult> {
    const clean = cnpj.replace(/\D/g, "");
    const url = `https://open.cnpja.com/office/${clean}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "GraficaERP/1.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, provider: "open.cnpja.com", error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }
      const raw = await res.json();

      // Extrair IEs do array registrations
      let inscricaoEstadual: string | undefined;
      const regs = Array.isArray(raw.registrations) ? raw.registrations : [];
      if (regs.length > 0) {
        const ativas = regs.filter((r: any) => r.enabled !== false);
        const lista = ativas.length > 0 ? ativas : regs;
        inscricaoEstadual = lista
          .map((r: any) => {
            const uf = r.state || "";
            const num = String(r.number || "").trim();
            return uf && num ? `${uf}: ${num}` : (num || "");
          })
          .filter(Boolean)
          .join(" / ");
        if (!inscricaoEstadual) inscricaoEstadual = undefined;
      }

      // Telefone
      let telefone: string | undefined;
      if (Array.isArray(raw.phones) && raw.phones.length > 0) {
        const p = raw.phones[0];
        telefone = p.area && p.number ? `(${p.area}) ${p.number}` : undefined;
      }

      // Endereço
      const addr = raw.address || {};
      const cep = addr.zip
        ? String(addr.zip).replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2")
        : undefined;

      const data: CnpjData = {
        cnpj: clean,
        razaoSocial: raw.company?.name,
        nomeFantasia: raw.alias || undefined,
        inscricaoEstadual,
        situacaoCadastral: raw.status?.text,
        dataAbertura: raw.founded,
        naturezaJuridica: raw.nature?.text,
        logradouro: addr.street ? `${addr.street}`.trim() : undefined,
        numero: addr.number || undefined,
        complemento: addr.details || undefined,
        bairro: addr.district || undefined,
        cidade: addr.city,
        estado: addr.state,
        cep,
        telefone,
        email: Array.isArray(raw.emails) && raw.emails.length > 0 ? raw.emails[0].address : undefined,
      };

      return { success: true, provider: "open.cnpja.com", data, rawResponse: raw };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, provider: "open.cnpja.com", error: msg };
    }
  },
};

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

// Ordem de tentativa: publica.cnpj.ws (IE via SINTEGRA) → open.cnpja.com (IE alternativo) → BrasilAPI → ReceitaWS
const providers: CnpjProvider[] = [
  publicaCnpjWsProvider,
  openCnpjaProvider,
  brasilApiProvider,
  receitaWsProvider,
];

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
