import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  TrendingUp,
  Eye,
  RefreshCw,
  ShoppingCart,
  Package,
  FileText,
  Wallet,
  Truck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AttentionType = "urgent" | "risk" | "attention" | "opportunity" | "info";
type AttentionModule = "estoque" | "compras" | "xml" | "financeiro" | "fornecedor";

interface StockMetadata {
  materialNome: string;
  quantidadeSugerida: number;
  unidade: string;
  urgencia: string;
  justificativa: string;
}

interface AttentionItem {
  id: string;
  type: AttentionType;
  title: string;
  description: string;
  module: AttentionModule;
  entityId?: string;
  entityType?: string;
  actionLabel?: string;
  actionUrl?: string;
  secondaryActionLabel?: string;
  secondaryActionUrl?: string;
  nextStep?: string;
  priorityScore: number;
  createdAt?: string;
  metadata?: StockMetadata;
}

const typeConfig: Record<AttentionType, {
  label: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  nextStepClass: string;
  icon: React.ElementType;
}> = {
  urgent: {
    label: "Urgente",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    borderClass: "border-l-red-500",
    bgClass: "bg-red-50/50 dark:bg-red-950/20",
    nextStepClass: "text-red-700 dark:text-red-400",
    icon: AlertOctagon,
  },
  risk: {
    label: "Risco",
    badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    borderClass: "border-l-orange-500",
    bgClass: "bg-orange-50/50 dark:bg-orange-950/20",
    nextStepClass: "text-orange-700 dark:text-orange-400",
    icon: AlertTriangle,
  },
  attention: {
    label: "Atenção",
    badgeClass: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    borderClass: "border-l-yellow-500",
    bgClass: "bg-yellow-50/50 dark:bg-yellow-950/20",
    nextStepClass: "text-yellow-700 dark:text-yellow-500",
    icon: Eye,
  },
  opportunity: {
    label: "Oportunidade",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    borderClass: "border-l-green-500",
    bgClass: "bg-green-50/50 dark:bg-green-950/20",
    nextStepClass: "text-green-700 dark:text-green-400",
    icon: TrendingUp,
  },
  info: {
    label: "Info",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    borderClass: "border-l-blue-500",
    bgClass: "bg-blue-50/50 dark:bg-blue-950/20",
    nextStepClass: "text-blue-700 dark:text-blue-400",
    icon: Info,
  },
};

const moduleConfig: Record<AttentionModule, {
  label: string;
  icon: React.ElementType;
}> = {
  estoque: { label: "Estoque", icon: Package },
  compras: { label: "Compras", icon: ShoppingCart },
  xml: { label: "NF-e / XML", icon: FileText },
  financeiro: { label: "Financeiro", icon: Wallet },
  fornecedor: { label: "Fornecedor", icon: Truck },
};

function SummaryCard({ type, count }: { type: AttentionType; count: number }) {
  const cfg = typeConfig[type];
  const Icon = cfg.icon;
  return (
    <Card className={`border-l-4 ${cfg.borderClass}`}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2 ${cfg.bgClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{count}</p>
          <p className="text-xs text-muted-foreground">
            {cfg.label}{count !== 1 ? "s" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const [, setLocation] = useLocation();
  const typeCfg = typeConfig[item.type];
  const modCfg = moduleConfig[item.module];
  const TypeIcon = typeCfg.icon;
  const ModIcon = modCfg.icon;

  return (
    <div
      className={`rounded-lg border-l-4 border border-border ${typeCfg.borderClass} ${typeCfg.bgClass} p-4`}
      data-testid={`attention-item-${item.id}`}
    >
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 mt-0.5">
          <TypeIcon className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges de tipo e módulo */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-semibold ${typeCfg.badgeClass}`}
            >
              {typeCfg.label}
            </Badge>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ModIcon className="w-3 h-3" />
              {modCfg.label}
            </span>
          </div>

          {/* Título */}
          <p className="font-semibold text-sm text-foreground leading-tight">
            {item.title}
          </p>

          {/* Descrição */}
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {item.description}
          </p>

          {/* Próximo passo sugerido */}
          {item.nextStep && (
            <div className="flex items-center gap-1.5 mt-2">
              <ArrowRight className={`w-3 h-3 flex-shrink-0 ${typeCfg.nextStepClass}`} />
              <span className={`text-[11px] font-medium ${typeCfg.nextStepClass}`}>
                Próximo passo: {item.nextStep}
              </span>
            </div>
          )}
        </div>

        {/* Botões de ação */}
        {(item.actionUrl || item.secondaryActionUrl) && (
          <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
            {item.actionUrl && item.actionLabel && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 whitespace-nowrap"
                onClick={() => setLocation(item.actionUrl!)}
                data-testid={`attention-action-${item.id}`}
              >
                {item.actionLabel}
              </Button>
            )}
            {item.secondaryActionUrl && item.secondaryActionLabel && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 whitespace-nowrap text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (item.module === "estoque" && item.metadata) {
                    const p = new URLSearchParams({
                      new: "1",
                      material: item.metadata.materialNome,
                      quantidade: String(item.metadata.quantidadeSugerida),
                      unidade: item.metadata.unidade,
                      urgencia: item.metadata.urgencia,
                      obs: item.metadata.justificativa,
                    });
                    setLocation(`/inventory/purchases?${p.toString()}`);
                  } else {
                    setLocation(item.secondaryActionUrl!);
                  }
                }}
                data-testid={`attention-secondary-${item.id}`}
              >
                {item.secondaryActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-lg border border-border p-4 flex gap-4">
          <Skeleton className="w-5 h-5 rounded flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SuppliesAttentionPage() {
  const { data: items = [], isLoading, refetch, isFetching } = useQuery<AttentionItem[]>({
    queryKey: ["/api/supplies/attention"],
    refetchInterval: 5 * 60 * 1000,
  });

  const counts = {
    urgent: items.filter((i) => i.type === "urgent").length,
    risk: items.filter((i) => i.type === "risk").length,
    attention: items.filter((i) => i.type === "attention").length,
    opportunity: items.filter((i) => i.type === "opportunity").length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Suprimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">O que precisa da sua atenção agora</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh"
          className="flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard type="urgent" count={counts.urgent} />
        <SummaryCard type="risk" count={counts.risk} />
        <SummaryCard type="attention" count={counts.attention} />
        <SummaryCard type="opportunity" count={counts.opportunity} />
      </div>

      {/* Lista principal */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-lg font-semibold text-foreground">
              Nenhum ponto crítico no momento.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Todos os indicadores estão dentro do esperado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide px-0.5">
            {items.length} item{items.length !== 1 ? "s" : ""} ordenado{items.length !== 1 ? "s" : ""} por prioridade
          </p>
          {items.map((item) => (
            <AttentionCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
