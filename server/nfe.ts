import { XMLParser } from "fast-xml-parser";

export interface NfeParsedItem {
  codigoProduto: string | null;
  descricaoProduto: string;
  ncm: string | null;
  cfop: string | null;
  unidadeComercial: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface NfeParsedDuplicata {
  numeroParcela: string | null;
  dataVencimento: string | null;
  valor: number;
}

export interface NfeParsed {
  chaveAcesso: string | null;
  numeroNfe: string | null;
  serie: string | null;
  dataEmissao: string | null;
  fornecedorCnpj: string | null;
  fornecedorNome: string;
  fornecedorIe: string | null;
  valorTotal: number;
  items: NfeParsedItem[];
  duplicatas: NfeParsedDuplicata[];
}

function str(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  return String(v).trim();
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? "0").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function cleanCnpj(cnpj: unknown): string | null {
  const s = str(cnpj);
  if (!s) return null;
  return s.replace(/\D/g, "");
}

/** Recursively find a key in an object, case-insensitive, ignoring namespace prefixes */
function deepFind(obj: unknown, key: string): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") return undefined;
  const lk = key.toLowerCase();
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const cleanKey = k.includes(":") ? k.split(":").pop()! : k;
    if (cleanKey.toLowerCase() === lk) return v;
  }
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const found = deepFind(v, key);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** Find a key directly in an object, stripping namespace prefixes */
function get(obj: Record<string, unknown>, key: string): unknown {
  if (key in obj) return obj[key];
  const lk = key.toLowerCase();
  for (const [k, v] of Object.entries(obj)) {
    const cleanKey = k.includes(":") ? k.split(":").pop()! : k;
    if (cleanKey.toLowerCase() === lk) return v;
  }
  return undefined;
}

export function parseNfeXml(xmlContent: string): NfeParsed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    parseTagValue: true,
    trimValues: true,
    removeNSPrefix: true, // strip namespace prefixes like "nfe:"
    isArray: (name) => ["det", "dup", "NFe", "nfeProc"].includes(name),
  });

  const doc = parser.parse(xmlContent);

  // Navigate to infNFe — handle both nfeProc wrapper and bare NFe
  const root = (doc.nfeProc?.[0] ?? doc.nfeProc ?? doc.NFe?.[0] ?? doc.NFe ?? doc) as Record<string, unknown>;

  let infNFe: Record<string, unknown> = {};
  let prot: Record<string, unknown> = {};

  // Try nfeProc > NFe > infNFe
  const nfeArr = get(root, "NFe");
  const nfeObj = (Array.isArray(nfeArr) ? nfeArr[0] : nfeArr) as Record<string, unknown> | null;
  if (nfeObj) {
    infNFe = (get(nfeObj, "infNFe") as Record<string, unknown>) ?? nfeObj;
    prot = ((get(root, "protNFe") as any)?.infProt ?? {}) as Record<string, unknown>;
  } else {
    // Bare NFe or already at infNFe level
    infNFe = (get(root, "infNFe") as Record<string, unknown>) ?? root;
  }

  // If still empty, try a deep search for infNFe
  if (!infNFe || Object.keys(infNFe).length === 0) {
    infNFe = (deepFind(doc, "infNFe") as Record<string, unknown>) ?? {};
  }

  const ide = (get(infNFe, "ide") ?? {}) as Record<string, unknown>;
  const emit = (get(infNFe, "emit") ?? {}) as Record<string, unknown>;
  const totalRoot = (get(infNFe, "total") ?? {}) as Record<string, unknown>;
  const ICMSTot = (get(totalRoot, "ICMSTot") ?? totalRoot) as Record<string, unknown>;
  const cobr = (get(infNFe, "cobr") ?? {}) as Record<string, unknown>;

  // Chave de acesso
  const chave =
    str(get(prot, "chNFe")) ??
    str((infNFe as any)["@_Id"])?.replace(/^NFe/, "") ??
    null;

  const dataEmissao = str(get(ide, "dhEmi") ?? get(ide, "dEmi"));
  const dataEmissaoDate = dataEmissao ? dataEmissao.substring(0, 10) : null;

  const fornecedorCnpj = cleanCnpj(get(emit, "CNPJ") ?? get(emit, "CPF"));
  const fornecedorNome = str(get(emit, "xFant") ?? get(emit, "xNome")) ?? "Fornecedor";
  const fornecedorIe = str(get(emit, "IE"));

  const valorTotal = num(get(ICMSTot, "vNF") ?? get(ICMSTot, "vProd") ?? 0);

  // Items (det)
  const detsRaw = get(infNFe, "det");
  const detArray: unknown[] = Array.isArray(detsRaw)
    ? detsRaw
    : detsRaw != null
    ? [detsRaw]
    : [];

  const items: NfeParsedItem[] = detArray.map((d: unknown) => {
    const det = (d ?? {}) as Record<string, unknown>;
    const prod = ((get(det, "prod") ?? {}) as Record<string, unknown>);
    return {
      codigoProduto: str(get(prod, "cProd")),
      descricaoProduto: str(get(prod, "xProd")) ?? "Produto",
      ncm: str(get(prod, "NCM") ?? get(prod, "ncm")),
      cfop: str(get(prod, "CFOP") ?? get(prod, "cfop")),
      unidadeComercial: str(get(prod, "uCom")),
      quantidade: num(get(prod, "qCom")),
      valorUnitario: num(get(prod, "vUnCom")),
      valorTotal: num(get(prod, "vProd")),
    };
  });

  // Duplicatas
  const dups = get(cobr, "dup");
  const dupArray: unknown[] = Array.isArray(dups)
    ? dups
    : dups != null
    ? [dups]
    : [];

  const duplicatas: NfeParsedDuplicata[] = dupArray.map((d: unknown) => {
    const dup = (d ?? {}) as Record<string, unknown>;
    return {
      numeroParcela: str(get(dup, "nDup")),
      dataVencimento: str(get(dup, "dVenc")),
      valor: num(get(dup, "vDup")),
    };
  });

  // Se não há duplicatas no XML, criar uma com o valor total
  if (duplicatas.length === 0) {
    duplicatas.push({
      numeroParcela: "001",
      dataVencimento: null,
      valor: valorTotal,
    });
  }

  return {
    chaveAcesso: chave,
    numeroNfe: str(get(ide, "nNF")),
    serie: str(get(ide, "serie")),
    dataEmissao: dataEmissaoDate,
    fornecedorCnpj,
    fornecedorNome,
    fornecedorIe,
    valorTotal,
    items,
    duplicatas,
  };
}
