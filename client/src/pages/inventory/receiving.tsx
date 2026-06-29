import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Upload, PackageCheck, Eye, ArrowLeft, CheckCircle2, AlertTriangle, Ban, Info, Plus, X,
} from "lucide-react";

const RAW_MATERIAL_CATEGORIES: { value: string; label: string }[] = [
  { value: "chapas",                label: "Chapas" },
  { value: "impressao",             label: "Impressão" },
  { value: "estruturas",            label: "Estruturas" },
  { value: "iluminacao",            label: "Iluminação" },
  { value: "fixacao",               label: "Fixação" },
  { value: "adesivos",              label: "Adesivos" },
  { value: "tintas",                label: "Tintas" },
  { value: "acabamento",            label: "Acabamento" },
  { value: "instalacao",            label: "Instalação" },
  { value: "servicos_terceirizados",label: "Serviços terceirizados" },
  { value: "outros",                label: "Outros" },
];

type RawMaterial = { id: string; nome: string; unidadeCompra: string };

type ParsedItem = {
  codigoProduto: string | null;
  descricaoProduto: string;
  ncm: string | null;
  cfop: string | null;
  unidadeComercial: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  aliasId: string | null;
  rawMaterialId: string | null;
  fatorConversao: number;
  quantidadeInterna: number;
  statusMatch: "nao_mapeado" | "mapeado" | "ignorado";
};

type ParsedDup = { numeroParcela: string | null; dataVencimento: string | null; valor: number };

type ParsedNfe = {
  chaveAcesso: string | null;
  numeroNfe: string | null;
  serie: string | null;
  dataEmissao: string | null;
  fornecedorCnpj: string | null;
  fornecedorNome: string;
  fornecedorIe: string | null;
  valorTotal: number;
  items: ParsedItem[];
  duplicatas: ParsedDup[];
};

type NfeImport = {
  id: string;
  numeroNfe: string | null;
  serie: string | null;
  dataEmissao: string | null;
  fornecedorNome: string;
  fornecedorCnpj: string | null;
  valorTotal: string | null;
  status: string;
  createdAt: string;
};

type MatchedSupplier = { id: string; nome: string } | null;

const STATUS_VARIANTS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pendente:   { label: "Pendente",   variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "default" },
  cancelado:  { label: "Cancelado",  variant: "destructive" },
};

const fmt = (v: number | string | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtQty = (v: number) =>
  v % 1 === 0 ? v.toFixed(0) : v.toFixed(4).replace(/\.?0+$/, "");

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const parts = String(d).substring(0, 10).split("-");
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

type Step = "list" | "upload" | "review" | "view";

export default function ReceivingPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("list");
  const [viewId, setViewId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [parsedData, setParsedData] = useState<{
    parsed: ParsedNfe;
    matchedSupplier: MatchedSupplier;
    xmlContent: string;
  } | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [duplicatas, setDuplicatas] = useState<ParsedDup[]>([]);
  const [localRawMaterials, setLocalRawMaterials] = useState<RawMaterial[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: listData, isLoading: listLoading } = useQuery<{ data: NfeImport[]; total: number }>({
    queryKey: ["/api/nfe/imports"],
    queryFn: () => fetch("/api/nfe/imports", { credentials: "include" }).then((r) => r.json()),
    enabled: step === "list",
  });

  const { data: rawMatsData } = useQuery<{ data: RawMaterial[] } | RawMaterial[]>({
    queryKey: ["/api/raw-materials"],
  });
  const rawMaterials: RawMaterial[] = Array.isArray(rawMatsData)
    ? rawMatsData
    : (rawMatsData as any)?.data ?? [];

  const { data: viewData } = useQuery<NfeImport & { items: any[] }>({
    queryKey: ["/api/nfe/imports", viewId],
    queryFn: () => fetch(`/api/nfe/imports/${viewId}`, { credentials: "include" }).then((r) => r.json()),
    enabled: step === "view" && !!viewId,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!parsedData) throw new Error("Sem dados");
      const { parsed, xmlContent, matchedSupplier } = parsedData;

      const header = {
        chaveAcesso: parsed.chaveAcesso,
        numeroNfe: parsed.numeroNfe,
        serie: parsed.serie,
        dataEmissao: parsed.dataEmissao,
        fornecedorCnpj: parsed.fornecedorCnpj,
        fornecedorNome: parsed.fornecedorNome,
        fornecedorIe: parsed.fornecedorIe,
        supplierId: matchedSupplier?.id ?? null,
        valorTotal: String(parsed.valorTotal),
        xmlContent,
      };

      const itemsToSave = items.map((i) => ({
        codigoProduto: i.codigoProduto,
        descricaoProduto: i.descricaoProduto,
        ncm: i.ncm,
        cfop: i.cfop,
        unidadeComercial: i.unidadeComercial,
        quantidade: String(i.quantidade),
        valorUnitario: String(i.valorUnitario),
        valorTotal: String(i.valorTotal),
        rawMaterialId: i.rawMaterialId || null,
        aliasId: i.aliasId || null,
        fatorConversao: String(i.fatorConversao),
        quantidadeInterna: String(i.quantidadeInterna),
        statusMatch: i.statusMatch,
      }));

      // Save the NF-e
      const savedRes = await apiRequest("POST", "/api/nfe/imports", { header, items: itemsToSave });
      const nfe = await savedRes.json();

      // Confirm (updates stock + creates accounts payable)
      const confirmedRes = await apiRequest("POST", `/api/nfe/imports/${nfe.id}/confirm`, {
        duplicatas,
        supplierId: matchedSupplier?.id ?? null,
      });
      return confirmedRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfe/imports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable/summary"] });
      toast({ title: "Recebimento confirmado!", description: "Estoque atualizado e contas a pagar geradas." });
      setStep("list");
      setParsedData(null);
    },
    onError: (e: any) => toast({ title: "Erro ao confirmar", description: e?.message ?? "Tente novamente.", variant: "destructive" }),
  });

  const saveAliasMutation = useMutation({
    mutationFn: async (data: {
      rawMaterialId: string;
      supplierDescricao: string;
      fatorConversao: string;
      unidadeFornecedor: string | null;
      supplierId?: string | null;
    }) => (await apiRequest("POST", "/api/supplier-aliases", data)).json(),
    onSuccess: () => toast({ title: "Alias salvo", description: "Reconhecido automaticamente nas próximas notas." }),
  });

  // ── File handling ─────────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast({ title: "Arquivo inválido", description: "Selecione um arquivo XML de NF-e.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("xml", file);
      const res = await fetch("/api/nfe/parse", { method: "POST", credentials: "include", body: form });

      if (res.status === 401) {
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/login"; }, 1500);
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro ${res.status} ao processar XML`);
      }

      const data = await res.json();

      if (data.alreadyImported) {
        toast({ title: "NF-e duplicada", description: "Esta chave de acesso já foi importada.", variant: "destructive" });
        return;
      }

      if (!data.parsed?.items || data.parsed.items.length === 0) {
        toast({
          title: "Aviso: nenhum item encontrado",
          description: "O XML foi lido mas não contém itens (det). Verifique se é uma NF-e de entrada válida.",
          variant: "destructive",
        });
      }

      setParsedData({ parsed: data.parsed, matchedSupplier: data.matchedSupplier, xmlContent: data.xmlContent });
      setItems(data.parsed.items ?? []);
      setDuplicatas(data.parsed.duplicatas ?? []);
      setLocalRawMaterials(rawMaterials); // snapshot atual para uso local + novos criados inline
      setStep("review");
    } catch (e: any) {
      toast({ title: "Erro ao processar XML", description: e.message ?? "Não foi possível processar o XML.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Item helpers ──────────────────────────────────────────────────────────────

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], ...patch };
      if (patch.rawMaterialId !== undefined || patch.fatorConversao !== undefined) {
        const fc = patch.fatorConversao ?? next[idx].fatorConversao;
        updated.quantidadeInterna = updated.quantidade * fc;
        if (patch.rawMaterialId) updated.statusMatch = "mapeado";
      }
      next[idx] = updated;
      return next;
    });
  };

  const updateDup = (idx: number, patch: Partial<ParsedDup>) => {
    setDuplicatas((prev) => { const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n; });
  };

  const pendingCount = items.filter((i) => i.statusMatch === "nao_mapeado").length;
  const mappedCount  = items.filter((i) => i.statusMatch === "mapeado").length;

  // ── RENDER: list ──────────────────────────────────────────────────────────────

  if (step === "list") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Recebimento de NF-e</h1>
            <p className="text-muted-foreground text-sm mt-1">Importe notas fiscais XML para dar entrada no estoque</p>
          </div>
          <Button onClick={() => setStep("upload")} data-testid="button-new-import">
            <Upload className="w-4 h-4 mr-2" /> Importar NF-e
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NF-e</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !listData?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <PackageCheck className="w-10 h-10 opacity-30" />
                      <p>Nenhuma NF-e importada ainda</p>
                      <Button variant="outline" size="sm" onClick={() => setStep("upload")}>Importar primeira NF-e</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : listData.data.map((nfe) => {
                const sv = STATUS_VARIANTS[nfe.status] ?? { label: nfe.status, variant: "secondary" as const };
                return (
                  <TableRow key={nfe.id} data-testid={`row-nfe-${nfe.id}`}>
                    <TableCell className="font-mono text-sm font-semibold">
                      {nfe.numeroNfe ? `NF-e ${nfe.numeroNfe}/${nfe.serie ?? "1"}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(nfe.dataEmissao)}</TableCell>
                    <TableCell className="text-sm">
                      <div>{nfe.fornecedorNome}</div>
                      {nfe.fornecedorCnpj && <div className="text-xs text-muted-foreground font-mono">{nfe.fornecedorCnpj}</div>}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{fmt(nfe.valorTotal)}</TableCell>
                    <TableCell>
                      <Badge variant={sv.variant} className="text-xs">{sv.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => { setViewId(nfe.id); setStep("view"); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── RENDER: upload ────────────────────────────────────────────────────────────

  if (step === "upload") {
    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("list")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-xl font-bold">Importar NF-e</h1>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors cursor-pointer
            ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          data-testid="drop-zone-xml"
        >
          <input ref={fileRef} type="file" accept=".xml,.XML" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Processando XML…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="font-medium text-lg">Arraste o arquivo XML aqui</p>
                <p className="text-muted-foreground text-sm mt-1">ou clique para selecionar</p>
              </div>
              <Badge variant="outline" className="text-xs">Arquivo XML de NF-e (nfeProc / NFe)</Badge>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: view ──────────────────────────────────────────────────────────────

  if (step === "view") {
    if (!viewData) return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => setStep("list")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        <p className="mt-4 text-muted-foreground">Carregando…</p>
      </div>
    );
    const sv = STATUS_VARIANTS[viewData.status] ?? { label: viewData.status, variant: "secondary" as const };
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("list")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
          <h1 className="text-xl font-bold">NF-e {viewData.numeroNfe ?? "—"}</h1>
          <Badge variant={sv.variant}>{sv.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Fornecedor:</span> <strong>{viewData.fornecedorNome}</strong></div>
          <div><span className="text-muted-foreground">CNPJ:</span> {viewData.fornecedorCnpj ?? "—"}</div>
          <div><span className="text-muted-foreground">Data de emissão:</span> {fmtDate(viewData.dataEmissao)}</div>
          <div><span className="text-muted-foreground">Valor total:</span> <strong>{fmt(viewData.valorTotal)}</strong></div>
        </div>

        <Separator />
        <h3 className="font-semibold">Itens ({(viewData as any).items?.length ?? 0})</h3>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto NF-e</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Qtd Interna</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(viewData as any).items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{item.descricaoProduto}</div>
                    {item.codigoProduto && <div className="text-xs text-muted-foreground">Cód: {item.codigoProduto}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{fmtQty(Number(item.quantidade))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.unidadeComercial ?? "—"}</TableCell>
                  <TableCell className="text-sm">{fmt(item.valorUnitario)}</TableCell>
                  <TableCell className="text-sm">{item.quantidadeInterna ? fmtQty(Number(item.quantidadeInterna)) : "—"}</TableCell>
                  <TableCell>
                    {item.statusMatch === "mapeado"     && <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Mapeado</Badge>}
                    {item.statusMatch === "ignorado"    && <Badge variant="outline" className="text-xs">Ignorado</Badge>}
                    {item.statusMatch === "nao_mapeado" && <Badge variant="secondary" className="text-xs">Não mapeado</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // ── RENDER: review ────────────────────────────────────────────────────────────

  if (step === "review" && parsedData) {
    const { parsed, matchedSupplier } = parsedData;

    return (
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setParsedData(null); }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                NF-e {parsed.numeroNfe ? `${parsed.numeroNfe}/${parsed.serie ?? "1"}` : "(sem número)"}
              </h1>
              <p className="text-muted-foreground text-sm">{parsed.fornecedorNome} — {fmt(parsed.valorTotal)}</p>
            </div>
          </div>
          <Button
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
            data-testid="button-confirm-receipt"
          >
            <PackageCheck className="w-4 h-4 mr-2" />
            {confirmMutation.isPending ? "Confirmando…" : "Confirmar Recebimento"}
          </Button>
        </div>

        {/* Aviso de itens não mapeados */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {pendingCount} {pendingCount === 1 ? "item não mapeado" : "itens não mapeados"} — não entrarão no estoque. Mapeie ou ignore cada um antes de confirmar.
            </span>
          </div>
        )}

        {/* Info NF-e */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">Fornecedor</span>
              <strong>{parsed.fornecedorNome}</strong>
              {matchedSupplier && (
                <Badge variant="outline" className="ml-2 text-xs py-0">cadastrado</Badge>
              )}
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">CNPJ</span>
              <span className="font-mono">{parsed.fornecedorCnpj ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">NF-e / Série</span>
              {parsed.numeroNfe ?? "—"} / {parsed.serie ?? "1"}
            </div>
            <div>
              <span className="text-muted-foreground block text-xs mb-0.5">Emissão</span>
              {fmtDate(parsed.dataEmissao)}
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              Itens da Nota ({items.length})
              {mappedCount > 0 && (
                <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                  {mappedCount} mapeado{mappedCount > 1 ? "s" : ""}
                </span>
              )}
            </h3>
          </div>

          {items.length === 0 ? (
            <div className="p-8 border rounded-lg text-center text-muted-foreground text-sm">
              Nenhum item encontrado no XML desta nota.
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {items.map((item, idx) => (
                <ItemRow
                  key={idx}
                  item={item}
                  rawMaterials={localRawMaterials}
                  supplierId={matchedSupplier?.id ?? null}
                  fornecedorNome={parsed.fornecedorNome}
                  onUpdate={(patch) => updateItem(idx, patch)}
                  onSaveAlias={(d) => saveAliasMutation.mutate(d)}
                  onRawMaterialCreated={(rm) => {
                    setLocalRawMaterials((prev) => [...prev, rm]);
                    queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Duplicatas / Contas a Pagar */}
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-sm">Contas a Pagar (Duplicatas)</h3>
          <div className="space-y-2">
            {duplicatas.map((dup, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-3 items-center">
                <div className="space-y-1">
                  <Label className="text-xs">Parcela</Label>
                  <Input className="h-8 text-sm" value={dup.numeroParcela ?? ""}
                    onChange={(e) => updateDup(idx, { numeroParcela: e.target.value })} placeholder="001" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vencimento</Label>
                  <Input type="date" className="h-8 text-sm" value={dup.dataVencimento ?? ""}
                    onChange={(e) => updateDup(idx, { dataVencimento: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input className="h-8 text-sm" type="number" step="0.01" value={dup.valor}
                    onChange={(e) => updateDup(idx, { valor: Number(e.target.value) })} />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs"
              onClick={() => setDuplicatas((p) => [...p, {
                numeroParcela: String(p.length + 1).padStart(3, "0"),
                dataVencimento: null,
                valor: 0,
              }])}>
              + Adicionar parcela
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({
  item, rawMaterials, supplierId, fornecedorNome, onUpdate, onSaveAlias, onRawMaterialCreated,
}: {
  item: ParsedItem;
  rawMaterials: RawMaterial[];
  supplierId: string | null;
  fornecedorNome: string;
  onUpdate: (patch: Partial<ParsedItem>) => void;
  onSaveAlias: (d: any) => void;
  onRawMaterialCreated: (rm: RawMaterial) => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded]   = useState(item.statusMatch === "nao_mapeado");
  const [search, setSearch]       = useState("");
  const [saveAlias, setSaveAlias] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  // Form state for new raw material
  const [newNome, setNewNome]           = useState(item.descricaoProduto.substring(0, 80));
  const [newCategoria, setNewCategoria] = useState("outros");
  const [newUnidade, setNewUnidade]     = useState(item.unidadeComercial ?? "UN");
  const [newCusto, setNewCusto]         = useState(String(item.valorUnitario > 0 ? item.valorUnitario : ""));
  const [newFornecedor, setNewFornecedor] = useState(fornecedorNome);
  const [newEstMin, setNewEstMin]       = useState("");
  const [creating, setCreating]         = useState(false);

  const filtered = search
    ? rawMaterials.filter((r) => r.nome.toLowerCase().includes(search.toLowerCase()))
    : [];
  const selectedRm = rawMaterials.find((r) => r.id === item.rawMaterialId);

  const handleConfirm = () => {
    if (saveAlias && item.rawMaterialId) {
      onSaveAlias({
        rawMaterialId: item.rawMaterialId,
        supplierDescricao: item.descricaoProduto,
        fatorConversao: String(item.fatorConversao),
        unidadeFornecedor: item.unidadeComercial,
        supplierId,
      });
    }
    setExpanded(false);
  };

  const handleCreateRawMaterial = async () => {
    if (!newNome.trim() || !newCategoria || !newUnidade.trim()) {
      toast({ title: "Campos obrigatórios", description: "Nome, categoria e unidade são obrigatórios.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        nome: newNome.trim(),
        categoria: newCategoria,
        unidadeCompra: newUnidade.trim(),
        unidadeUso: newUnidade.trim(),
        fornecedor: newFornecedor.trim() || null,
      };
      if (newCusto) payload.custoUnitario = newCusto;
      if (newEstMin) payload.estoqueMinimo = newEstMin;

      const res = await apiRequest("POST", "/api/raw-materials", payload);
      const created = await res.json();

      if (!res.ok) throw new Error(created.error ?? "Erro ao criar matéria-prima");

      toast({ title: "Matéria-prima criada!", description: `"${created.nome}" adicionada ao cadastro.` });
      onRawMaterialCreated({ id: created.id, nome: created.nome, unidadeCompra: created.unidadeCompra });
      onUpdate({ rawMaterialId: created.id, statusMatch: "mapeado", quantidadeInterna: item.quantidade * item.fatorConversao });
      setCreateMode(false);
      setSearch("");
      // Automatically save alias
      onSaveAlias({
        rawMaterialId: created.id,
        supplierDescricao: item.descricaoProduto,
        fatorConversao: String(item.fatorConversao),
        unidadeFornecedor: item.unidadeComercial,
        supplierId,
      });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message ?? "Não foi possível criar.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const MatchIcon = item.statusMatch === "mapeado" ? CheckCircle2 : item.statusMatch === "ignorado" ? Ban : AlertTriangle;
  const matchColor = {
    mapeado:     "text-green-600 dark:text-green-400",
    ignorado:    "text-muted-foreground",
    nao_mapeado: "text-yellow-600 dark:text-yellow-400",
  }[item.statusMatch];

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <MatchIcon className={`w-4 h-4 shrink-0 ${matchColor}`} />
            <span className="font-medium text-sm truncate">{item.descricaoProduto}</span>
            {item.codigoProduto && (
              <span className="text-xs text-muted-foreground font-mono shrink-0">[{item.codigoProduto}]</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 ml-6">
            {item.quantidade} {item.unidadeComercial ?? ""} × {fmt(item.valorUnitario)} = <strong>{fmt(item.valorTotal)}</strong>
            {item.statusMatch === "mapeado" && selectedRm && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                → {selectedRm.nome}: {fmtQty(item.quantidadeInterna)} {selectedRm.unidadeCompra}
                {item.fatorConversao !== 1 && ` (fator ${item.fatorConversao})`}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          {item.statusMatch !== "ignorado" && (
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
              onClick={() => { setExpanded((e) => !e); setCreateMode(false); }}>
              {expanded ? "Fechar" : item.statusMatch === "mapeado" ? "Editar" : "Mapear"}
            </Button>
          )}
          <Button
            size="sm" variant="ghost"
            className={`h-7 text-xs px-2 ${item.statusMatch === "ignorado" ? "" : "text-red-500 hover:text-red-600"}`}
            onClick={() => {
              if (item.statusMatch === "ignorado") {
                onUpdate({ statusMatch: "nao_mapeado", rawMaterialId: null });
                setExpanded(true);
              } else {
                onUpdate({ statusMatch: "ignorado", rawMaterialId: null });
                setExpanded(false);
                setCreateMode(false);
              }
            }}>
            {item.statusMatch === "ignorado" ? "Desfazer" : "Ignorar"}
          </Button>
        </div>
      </div>

      {expanded && item.statusMatch !== "ignorado" && (
        <div className="ml-6 space-y-3 p-3 rounded-lg bg-muted/40 border">

          {/* ── Modo: busca de matéria-prima existente ── */}
          {!createMode && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Matéria-prima interna</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Digite para buscar…"
                  value={selectedRm && !search ? selectedRm.nome : search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (e.target.value === "") onUpdate({ rawMaterialId: null, statusMatch: "nao_mapeado" });
                  }}
                />
                {search && filtered.length > 0 && (
                  <div className="border rounded-md bg-popover shadow-md max-h-40 overflow-y-auto">
                    {filtered.slice(0, 10).map((rm) => (
                      <div key={rm.id} className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent"
                        onClick={() => {
                          onUpdate({ rawMaterialId: rm.id, statusMatch: "mapeado", quantidadeInterna: item.quantidade * item.fatorConversao });
                          setSearch("");
                        }}>
                        {rm.nome} <span className="text-xs text-muted-foreground">({rm.unidadeCompra})</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Botão "Criar nova" quando não há resultados */}
                {search && filtered.length === 0 && (
                  <div className="flex items-center justify-between px-1 pt-0.5">
                    <p className="text-xs text-muted-foreground">Nenhuma encontrada para "{search}"</p>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1"
                      onClick={() => { setNewNome(search || item.descricaoProduto.substring(0, 80)); setCreateMode(true); setSearch(""); }}>
                      <Plus className="w-3 h-3" /> Criar nova
                    </Button>
                  </div>
                )}
                {/* Botão "Criar nova" quando campo está vazio e não há seleção */}
                {!search && !selectedRm && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2 gap-1 text-muted-foreground"
                    onClick={() => setCreateMode(true)}>
                    <Plus className="w-3 h-3" /> Criar nova matéria-prima
                  </Button>
                )}
              </div>

              {/* Fator de conversão */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    Fator de conversão
                    <Info className="w-3 h-3 text-muted-foreground" title="1 unidade do fornecedor = X unidades internas" />
                  </Label>
                  <Input type="number" step="0.000001" className="h-8 text-sm"
                    value={item.fatorConversao}
                    onChange={(e) => onUpdate({
                      fatorConversao: Number(e.target.value),
                      quantidadeInterna: item.quantidade * Number(e.target.value),
                    })} />
                  {selectedRm && (
                    <p className="text-xs text-muted-foreground">
                      {item.quantidade} {item.unidadeComercial} × {item.fatorConversao} ={" "}
                      {fmtQty(item.quantidade * item.fatorConversao)} {selectedRm.unidadeCompra}
                    </p>
                  )}
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={saveAlias} onChange={(e) => setSaveAlias(e.target.checked)} className="rounded" />
                    Salvar para próximas notas
                  </label>
                </div>
              </div>

              {item.rawMaterialId && (
                <Button size="sm" className="h-7 text-xs" onClick={handleConfirm}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmar mapeamento
                </Button>
              )}
            </>
          )}

          {/* ── Modo: criar nova matéria-prima ── */}
          {createMode && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Nova matéria-prima
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                  onClick={() => setCreateMode(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Nome */}
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Nome <span className="text-red-500">*</span></Label>
                  <Input className="h-8 text-sm" value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome da matéria-prima" />
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <Label className="text-xs">Categoria <span className="text-red-500">*</span></Label>
                  <Select value={newCategoria} onValueChange={setNewCategoria}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RAW_MATERIAL_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unidade */}
                <div className="space-y-1">
                  <Label className="text-xs">Unidade de compra <span className="text-red-500">*</span></Label>
                  <Input className="h-8 text-sm" value={newUnidade} onChange={(e) => setNewUnidade(e.target.value)} placeholder="UN, M2, KG…" />
                </div>

                {/* Custo unitário */}
                <div className="space-y-1">
                  <Label className="text-xs">Custo unitário (R$)</Label>
                  <Input type="number" step="0.0001" className="h-8 text-sm" value={newCusto} onChange={(e) => setNewCusto(e.target.value)} placeholder="0,00" />
                </div>

                {/* Estoque mínimo */}
                <div className="space-y-1">
                  <Label className="text-xs">Estoque mínimo</Label>
                  <Input type="number" step="0.0001" className="h-8 text-sm" value={newEstMin} onChange={(e) => setNewEstMin(e.target.value)} placeholder="0" />
                </div>

                {/* Fornecedor */}
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Fornecedor</Label>
                  <Input className="h-8 text-sm" value={newFornecedor} onChange={(e) => setNewFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                O alias desta descrição será salvo automaticamente para reconhecimento em próximas notas.
              </p>

              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleCreateRawMaterial} disabled={creating}>
                  <Plus className="w-3 h-3 mr-1" />
                  {creating ? "Criando…" : "Criar e mapear"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCreateMode(false)} disabled={creating}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
