import { useState } from "react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  PackageOpen,
  Clock,
  CheckCircle2,
  ShoppingCart,
  Truck,
  XCircle,
  RotateCcw,
  Search,
} from "lucide-react";

const STATUS_VARIANTS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  aguardando_informacoes:   { label: "Aguardando informações", variant: "secondary" },
  aguardando_aprovacao:     { label: "Aguardando aprovação",    variant: "secondary" },
  aprovado:                 { label: "Aprovado",                    variant: "default" },
  em_cotacao:               { label: "Em cotação",                  variant: "default" },
  comprado:                 { label: "Comprado",                    variant: "default" },
  aguardando_entrega:       { label: "Aguardando entrega",        variant: "secondary" },
  recebido:                 { label: "Recebido",                    variant: "default" },
  cancelado:                { label: "Cancelado",                   variant: "destructive" },
};

const STATUS_OPTIONS = [
  { value: "aguardando_informacoes", label: "Aguardando informações" },
  { value: "aguardando_aprovacao",   label: "Aguardando aprovação" },
  { value: "aprovado",               label: "Aprovado" },
  { value: "em_cotacao",             label: "Em cotação" },
  { value: "comprado",               label: "Comprado" },
  { value: "aguardando_entrega",     label: "Aguardando entrega" },
  { value: "recebido",               label: "Recebido" },
  { value: "cancelado",              label: "Cancelado" },
];

const TIPO_OPTIONS = [
  { value: "os",          label: "OS" },
  { value: "estoque",     label: "Estoque" },
  { value: "expediente",  label: "Expediente" },
  { value: "manutencao",  label: "Manutenção" },
  { value: "outro",       label: "Outro" },
];

const URGENCIA_OPTIONS = [
  { value: "normal",       label: "Normal" },
  { value: "urgente",      label: "Urgente" },
  { value: "muito_urgente", label: "Muito urgente" },
];

interface PurchaseRow {
  id: string;
  codigo: string;
  data: string;
  solicitante: string;
  material: string;
  quantidade: string;
  unidade: string;
  os: string;
  tipo: string;
  urgencia: string;
  status: string;
}

const DEMO_DATA: PurchaseRow[] = [
  {
    id: "1",
    codigo: "SOL-2026-0001",
    data: "20/05/2026",
    solicitante: "João da Silva",
    material: "Tinta vinílica vermelha",
    quantidade: "10",
    unidade: "litros",
    os: "OS-456",
    tipo: "os",
    urgencia: "urgente",
    status: "aguardando_aprovacao",
  },
  {
    id: "2",
    codigo: "SOL-2026-0002",
    data: "19/05/2026",
    solicitante: "Maria Santos",
    material: "Papel offset A3 120g",
    quantidade: "500",
    unidade: "folhas",
    os: "",
    tipo: "estoque",
    urgencia: "normal",
    status: "aprovado",
  },
  {
    id: "3",
    codigo: "SOL-2026-0003",
    data: "18/05/2026",
    solicitante: "Pedro Oliveira",
    material: "Lona frontlight 440g",
    quantidade: "3",
    unidade: "rolos",
    os: "OS-789",
    tipo: "os",
    urgencia: "muito_urgente",
    status: "em_cotacao",
  },
];

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = DEMO_DATA.filter((row) =>
    row.material.toLowerCase().includes(search.toLowerCase()) ||
    row.solicitante.toLowerCase().includes(search.toLowerCase()) ||
    row.codigo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PackageOpen className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
        </div>
        <p className="text-muted-foreground">
          Solicitações de compra e reposição de materiais
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar material, solicitante ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-purchase-search"
          />
        </div>
        <Button onClick={() => setOpen(true)} data-testid="button-nova-solicitacao">
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Solicitação
        </Button>
      </div>

      {/* Status badges legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Status da solicitação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Badge
                key={s.value}
                variant={STATUS_VARIANTS[s.value]?.variant ?? "secondary"}
                className="text-xs"
              >
                {STATUS_VARIANTS[s.value]?.label ?? s.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Código</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Urgência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  Nenhuma solicitação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const statusMeta = STATUS_VARIANTS[row.status];
                return (
                  <TableRow key={row.id} data-testid={`row-purchase-${row.id}`}>
                    <TableCell className="font-mono text-xs">{row.codigo}</TableCell>
                    <TableCell className="text-xs">{row.data}</TableCell>
                    <TableCell className="text-sm">{row.solicitante}</TableCell>
                    <TableCell className="text-sm font-medium">{row.material}</TableCell>
                    <TableCell className="text-xs">{row.quantidade} {row.unidade}</TableCell>
                    <TableCell className="text-xs font-mono">{row.os || "—"}</TableCell>
                    <TableCell className="text-xs capitalize">{row.tipo}</TableCell>
                    <TableCell className="text-xs capitalize">{row.urgencia.replace("_", " ")}</TableCell>
                    <TableCell>
                      <Badge variant={statusMeta?.variant ?? "secondary"} className="text-xs whitespace-nowrap">
                        {statusMeta?.label ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ver detalhes">
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Nova Solicitação */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Compra</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="solicitante">Solicitante</Label>
                <Input id="solicitante" placeholder="Nome do solicitante" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="material">Material</Label>
                <Input id="material" placeholder="Ex: Tinta vermelha" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantidade">Quantidade</Label>
                <Input id="quantidade" type="number" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unidade">Unidade</Label>
                <Input id="unidade" placeholder="litros, kg, unidades..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="os">OS relacionada</Label>
                <Input id="os" placeholder="Ex: OS-123" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipo">Tipo da compra</Label>
                <Select>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="urgencia">Urgência</Label>
                <Select>
                  <SelectTrigger id="urgencia">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCIA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea id="observacao" placeholder="Detalhes adicionais..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Solicitação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
