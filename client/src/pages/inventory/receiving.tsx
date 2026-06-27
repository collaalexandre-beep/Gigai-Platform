import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Search,
  PackageCheck, Eye, X, ArrowLeft, ChevronRight, Save, Ban, Info,
} from "lucide-react";
import { Link } from "wouter";

type RawMaterial = { id: string; nome: string; unidadeCompra: string };
type Supplier = { id: string; nome: string; cnpjCpf?: string | null };

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

const STATUS_VARIANTS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

const fmt = (v: number | string | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtQty = (v: number) =>
  v % 1 === 0 ? v.toFixed(0) : v.toFixed(4).replace(/\.?0+$/, "");

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const parts = d.substring(0, 10).split("-");
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
    matchedSupplier: Supplier | null;
    alreadyImported: boolean;
    xmlContent: string;
  } | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [duplicatas, setDuplicatas] = useState<ParsedDup[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payTarget, setPayTarget] = useState<any | null>(null);
  const [payValor, setPayValor] = useState("");
  const [payForma, setPayForma] = useState("boleto");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const { data: suppliersData } = useQuery<{ data: Supplier[] } | Supplier[]>({
    queryKey: ["/api/suppliers"],
  });
  const suppliers: Supplier[] = Array.isArray(suppliersData)
    ? suppliersData
    : (suppliersData as any)?.data ?? [];

  const { data: viewData } = useQuery<NfeImport & { items: any[] }>({
    queryKey: ["/api/nfe/imports", viewId],
    queryFn: () => fetch(`/api/nfe/imports/${viewId}`, { credentials: "include" }).then((r) => r.json()),
    enabled: step === "view" && !!viewId,
  });

  const saveAndConfirmMutation = useMutation({
    mutationFn: async () => {
      if (!parsedData) throw new Error("Sem dados");
      const { parsed, xmlContent } = parsedData;
      const header = {
        chaveAcesso: parsed.chaveAcesso,
        numeroNfe: parsed.numeroNfe,
        serie: parsed.serie,
        dataEmissao: parsed.dataEmissao,
        fornecedorCnpj: parsed.fornecedorCnpj,
        fornecedorNome: parsed.fornecedorNome,
        fornecedorIe: parsed.fornecedorIe,
        supplierId: supplierId || null,
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
      const saved = await apiRequest("POST", "/api/nfe/imports", { header, items: itemsToSave });
      const nfe = await saved.json();
      const confirmed = await apiRequest("POST", `/api/nfe/imports/${nfe.id}/confirm`, {
        duplicatas,
        supplierId: supplierId || null,
      });
      return confirmed.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfe/imports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts-payable"] });
      toast({ title: "Recebimento confirmado!", description: "Estoque atualizado e contas a pagar geradas." });
      setStep("list");
      setParsedData(null);
    },
    onError: () => toast({ title: "Erro", description: "Falha ao confirmar recebimento.", variant: "destructive" }),
  });

  const saveAliasMutation = useMutation({
    mutationFn: async (data: {
      rawMaterialId: string;
      supplierDescricao: string;
      fatorConversao: string;
      unidadeFornecedor: string | null;
      supplierId?: string | null;
    }) => {
      const r = await apiRequest("POST", "/api/supplier-aliases", {
        ...data,
        supplierId: supplierId || null,
      });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Alias salvo", description: "Este produto será reconhecido automaticamente nas próximas notas." });
    },
  });

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".xml") && !file.name.endsWith(".XML")) {
      toast({ title: "Arquivo inválido", description: "Selecione um arquivo XML de NF-e.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("xml", file);
      const res = await fetch("/api/nfe/parse", { method: "POST", credentials: "include", body: form });
      if (!res.ok) throw new Error("Falha ao processar XML");
      const data = await res.json();
      if (data.alreadyImported) {
        toast({ title: "NF-e duplicada", description: "Esta chave de acesso já foi importada.", variant: "destructive" });
        setUploading(false);
        return;
      }
      setParsedData(data);
      setItems(data.parsed.items);
      setDuplicatas(data.parsed.duplicatas);
      setSupplierId(data.matchedSupplier?.id ?? null);
      setStep("review");
    } catch {
      toast({ title: "Erro", description: "Não foi possível processar o XML.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], ...patch };
      if (patch.rawMaterialId !== undefined || patch.fatorConversao !== undefined) {
        const rm = rawMaterials.find((r) => r.id === (patch.rawMaterialId ?? next[idx].rawMaterialId));
        const fc = patch.fatorConversao ?? next[idx].fatorConversao;
        updated.quantidadeInterna = updated.quantidade * fc;
        if (rm || patch.rawMaterialId) updated.statusMatch = "mapeado";
      }
      next[idx] = updated;
      return next;
    });
  };

  const updateDup = (idx: number, patch: Partial<ParsedDup>) => {
    setDuplicatas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const pendingCount = items.filter((i) => i.statusMatch === "nao_mapeado").length;

  if (step === "list") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Recebimento de NF-e</h1>
            <p className="text-muted-foreground text-sm mt-1">Importe notas fiscais XML para dar entrada no estoque</p>
          </div>
          <Button onClick={() => setStep("upload")} data-testid="button-new-import">
            <Upload className="w-4 h-4 mr-2" />
            Importar NF-e
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
                <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <PackageCheck className="w-10 h-10 opacity-30" />
                    <p>Nenhuma NF-e importada ainda</p>
                    <Button variant="outline" size="sm" onClick={() => setStep("upload")}>Importar primeira NF-e</Button>
                  </div>
                </TableCell></TableRow>
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
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setViewId(nfe.id); setStep("view"); }}>
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

  if (step === "upload") {
    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("list")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
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
          <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Processando XML...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="font-medium text-lg">Arraste o arquivo XML aqui</p>
                <p className="text-muted-foreground text-sm mt-1">ou clique para selecionar</p>
              </div>
              <Badge variant="outline" className="text-xs">Arquivo XML de NF-e (NF-e / nfeProc)</Badge>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "view" && viewData) {
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
        <h3 className="font-semibold">Itens</h3>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto NF-e</TableHead>
                <TableHead>Qtd. NF-e</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead>Mat. Interna</TableHead>
                <TableHead>Qtd. Interna</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">{item.rawMaterialId ? "Mapeado" : "—"}</TableCell>
                  <TableCell className="text-sm">{item.quantidadeInterna ? fmtQty(Number(item.quantidadeInterna)) : "—"}</TableCell>
                  <TableCell>
                    {item.statusMatch === "mapeado" && <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Mapeado</Badge>}
                    {item.statusMatch === "ignorado" && <Badge variant="outline" className="text-xs">Ignorado</Badge>}
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

  if (step === "review" && parsedData) {
    const { parsed } = parsedData;
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setStep("upload"); setParsedData(null); }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold">Revisar NF-e {parsed.numeroNfe ?? ""}</h1>
              <p className="text-muted-foreground text-sm">{parsed.fornecedorNome} — {fmt(parsed.valorTotal)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => saveAndConfirmMutation.mutate()}
              disabled={saveAndConfirmMutation.isPending}
              data-testid="button-confirm-receipt"
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              {saveAndConfirmMutation.isPending ? "Confirmando..." : "Confirmar Recebimento"}
            </Button>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{pendingCount} {pendingCount === 1 ? "item não mapeado" : "itens não mapeados"} — mapeie ou ignore antes de confirmar.</span>
          </div>
        )}

        {/* Supplier */}
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-sm">Fornecedor</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground block text-xs">Razão Social</span><strong>{parsed.fornecedorNome}</strong></div>
            <div><span className="text-muted-foreground block text-xs">CNPJ</span>{parsed.fornecedorCnpj ?? "—"}</div>
            <div><span className="text-muted-foreground block text-xs">NF-e nº</span>{parsed.numeroNfe ?? "—"}/{parsed.serie ?? "1"}</div>
            <div><span className="text-muted-foreground block text-xs">Emissão</span>{fmtDate(parsed.dataEmissao)}</div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vincular ao fornecedor cadastrado</Label>
            <Select value={supplierId ?? "__none__"} onValueChange={(v) => setSupplierId(v === "__none__" ? null : v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Não vincular</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Itens da Nota ({items.length})</h3>
          <div className="border rounded-lg divide-y">
            {items.map((item, idx) => (
              <ItemRow
                key={idx}
                item={item}
                idx={idx}
                rawMaterials={rawMaterials}
                supplierId={supplierId}
                onUpdate={(patch) => updateItem(idx, patch)}
                onSaveAlias={(d) => saveAliasMutation.mutate(d)}
              />
            ))}
          </div>
        </div>

        {/* Duplicatas / Contas a Pagar */}
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-sm">Contas a Pagar (Duplicatas)</h3>
          <div className="space-y-2">
            {duplicatas.map((dup, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-3 items-center">
                <div className="space-y-1">
                  <Label className="text-xs">Parcela</Label>
                  <Input className="h-8 text-sm" value={dup.numeroParcela ?? ""} onChange={(e) => updateDup(idx, { numeroParcela: e.target.value })} placeholder="001" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vencimento</Label>
                  <Input type="date" className="h-8 text-sm" value={dup.dataVencimento ?? ""} onChange={(e) => updateDup(idx, { dataVencimento: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input className="h-8 text-sm" value={dup.valor} onChange={(e) => updateDup(idx, { valor: Number(e.target.value) })} type="number" step="0.01" />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setDuplicatas((prev) => [...prev, { numeroParcela: String(prev.length + 1).padStart(3, "0"), dataVencimento: null, valor: 0 }])}
            >
              + Adicionar parcela
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ItemRow({
  item, idx, rawMaterials, supplierId, onUpdate, onSaveAlias,
}: {
  item: ParsedItem;
  idx: number;
  rawMaterials: RawMaterial[];
  supplierId: string | null;
  onUpdate: (patch: Partial<ParsedItem>) => void;
  onSaveAlias: (d: any) => void;
}) {
  const [expanded, setExpanded] = useState(item.statusMatch === "nao_mapeado");
  const [search, setSearch] = useState("");
  const [saveAlias, setSaveAlias] = useState(false);
  const filtered = rawMaterials.filter((r) =>
    r.nome.toLowerCase().includes(search.toLowerCase())
  );
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

  const matchColor = {
    mapeado: "text-green-600 dark:text-green-400",
    ignorado: "text-muted-foreground",
    nao_mapeado: "text-yellow-600 dark:text-yellow-400",
  }[item.statusMatch];

  const MatchIcon = item.statusMatch === "mapeado" ? CheckCircle2 : item.statusMatch === "ignorado" ? Ban : AlertTriangle;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <MatchIcon className={`w-4 h-4 shrink-0 ${matchColor}`} />
            <span className="font-medium text-sm truncate">{item.descricaoProduto}</span>
            {item.codigoProduto && <span className="text-xs text-muted-foreground font-mono">[{item.codigoProduto}]</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 ml-6">
            NF-e: {item.quantidade} {item.unidadeComercial ?? ""} × {fmt(item.valorUnitario)} = {fmt(item.valorTotal)}
            {item.statusMatch === "mapeado" && selectedRm && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                → {selectedRm.nome}: {item.quantidadeInterna.toFixed(4).replace(/\.?0+$/, "")} {selectedRm.unidadeCompra}
                {item.fatorConversao !== 1 && <span> (fator {item.fatorConversao})</span>}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {item.statusMatch !== "ignorado" && (
            <Button
              size="sm" variant="ghost" className="h-7 text-xs px-2"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Fechar" : "Mapear"}
            </Button>
          )}
          <Button
            size="sm" variant="ghost"
            className={`h-7 text-xs px-2 ${item.statusMatch === "ignorado" ? "text-muted-foreground" : "text-red-500"}`}
            onClick={() => onUpdate({ statusMatch: item.statusMatch === "ignorado" ? "nao_mapeado" : "ignorado", rawMaterialId: null })}
          >
            {item.statusMatch === "ignorado" ? "Desfazer" : "Ignorar"}
          </Button>
        </div>
      </div>

      {expanded && item.statusMatch !== "ignorado" && (
        <div className="ml-6 space-y-3 p-3 rounded-lg bg-muted/40 border">
          <div className="space-y-1.5">
            <Label className="text-xs">Matéria-prima interna</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Buscar matéria-prima..."
              value={search || selectedRm?.nome || ""}
              onChange={(e) => { setSearch(e.target.value); onUpdate({ rawMaterialId: null, statusMatch: "nao_mapeado" }); }}
            />
            {search && filtered.length > 0 && (
              <div className="border rounded-md bg-popover shadow-md max-h-36 overflow-y-auto">
                {filtered.slice(0, 8).map((rm) => (
                  <div
                    key={rm.id}
                    className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent"
                    onClick={() => {
                      onUpdate({ rawMaterialId: rm.id, statusMatch: "mapeado", quantidadeInterna: item.quantidade * item.fatorConversao });
                      setSearch("");
                    }}
                  >
                    {rm.nome} <span className="text-xs text-muted-foreground">({rm.unidadeCompra})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Fator de conversão
                <Info className="inline w-3 h-3 ml-1 text-muted-foreground" title="1 unidade do fornecedor = X unidades internas" />
              </Label>
              <Input
                type="number"
                step="0.000001"
                className="h-8 text-sm"
                value={item.fatorConversao}
                onChange={(e) => onUpdate({ fatorConversao: Number(e.target.value), quantidadeInterna: item.quantidade * Number(e.target.value) })}
              />
              {selectedRm && (
                <p className="text-xs text-muted-foreground">
                  {item.quantidade} {item.unidadeComercial} × {item.fatorConversao} = {(item.quantidade * item.fatorConversao).toFixed(4).replace(/\.?0+$/, "")} {selectedRm.unidadeCompra}
                </p>
              )}
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAlias}
                  onChange={(e) => setSaveAlias(e.target.checked)}
                  className="rounded"
                />
                Salvar alias para próximas notas
              </label>
            </div>
          </div>

          {item.rawMaterialId && (
            <Button size="sm" className="h-7 text-xs" onClick={handleConfirm}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmar mapeamento
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
