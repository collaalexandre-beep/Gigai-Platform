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

export function parseNfeXml(xmlContent: string): NfeParsed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    parseTagValue: true,
    trimValues: true,
    isArray: (name) =>
      ["det", "dup", "NFe", "nfeProc"].includes(name),
  });

  const doc = parser.parse(xmlContent);

  const root = doc.nfeProc || doc.NFe || doc;
  const nfe = root.NFe?.[0] ?? root.NFe ?? root;
  const infNFe = nfe.infNFe ?? nfe;

  const ide = infNFe.ide ?? {};
  const emit = infNFe.emit ?? {};
  const total = infNFe.total?.ICMSTot ?? {};
  const cobr = infNFe.cobr ?? {};
  const prot = root.protNFe?.infProt ?? {};

  const chave =
    str(prot.chNFe) ??
    str(infNFe["@_Id"])?.replace(/^NFe/, "") ??
    null;

  const dataEmissao = str(ide.dhEmi ?? ide.dEmi);
  const dataEmissaoDate = dataEmissao
    ? dataEmissao.substring(0, 10)
    : null;

  const fornecedorCnpj = cleanCnpj(emit.CNPJ ?? emit.CPF);
  const fornecedorNome = str(emit.xFant ?? emit.xNome) ?? "Fornecedor";
  const fornecedorIe = str(emit.IE);

  const valorTotal = num(total.vNF ?? total.vProd ?? 0);

  const dets = infNFe.det;
  const detArray: unknown[] = Array.isArray(dets)
    ? dets
    : dets != null
    ? [dets]
    : [];

  const items: NfeParsedItem[] = detArray.map((d: unknown) => {
    const det = d as Record<string, unknown>;
    const prod = (det.prod ?? {}) as Record<string, unknown>;
    return {
      codigoProduto: str(prod.cProd),
      descricaoProduto: str(prod.xProd) ?? "Produto",
      ncm: str(prod.NCM),
      cfop: str(prod.CFOP),
      unidadeComercial: str(prod.uCom),
      quantidade: num(prod.qCom),
      valorUnitario: num(prod.vUnCom),
      valorTotal: num(prod.vProd),
    };
  });

  const dups = cobr.dup;
  const dupArray: unknown[] = Array.isArray(dups)
    ? dups
    : dups != null
    ? [dups]
    : [];

  const duplicatas: NfeParsedDuplicata[] = dupArray.map((d: unknown) => {
    const dup = d as Record<string, unknown>;
    return {
      numeroParcela: str(dup.nDup),
      dataVencimento: str(dup.dVenc),
      valor: num(dup.vDup),
    };
  });

  if (duplicatas.length === 0) {
    duplicatas.push({
      numeroParcela: "001",
      dataVencimento: null,
      valor: valorTotal,
    });
  }

  return {
    chaveAcesso: chave,
    numeroNfe: str(ide.nNF),
    serie: str(ide.serie),
    dataEmissao: dataEmissaoDate,
    fornecedorCnpj,
    fornecedorNome,
    fornecedorIe,
    valorTotal,
    items,
    duplicatas,
  };
}
