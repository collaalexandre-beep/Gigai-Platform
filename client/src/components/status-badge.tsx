import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const clientStatusMap: Record<string, { label: string; className: string }> = {
  ativo: {
    label: "Ativo",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  inativo: {
    label: "Inativo",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  prospect: {
    label: "Prospect",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  bloqueado: {
    label: "Bloqueado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const sellerStatusMap: Record<string, { label: string; className: string }> = {
  ativo: {
    label: "Ativo",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  inativo: {
    label: "Inativo",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  afastado: {
    label: "Afastado",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
};

const taskPriorityMap: Record<string, { label: string; className: string }> = {
  baixa: {
    label: "Baixa",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  media: {
    label: "Média",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  alta: {
    label: "Alta",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  urgente: {
    label: "Urgente",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const taskStatusMap: Record<string, { label: string; className: string }> = {
  pendente: {
    label: "Pendente",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  em_andamento: {
    label: "Em andamento",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  concluida: {
    label: "Concluída",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

const rawMaterialCategoryMap: Record<string, { label: string; className: string }> = {
  chapas: {
    label: "Chapas",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  impressao: {
    label: "Impressão",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  estruturas: {
    label: "Estruturas",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  },
  iluminacao: {
    label: "Iluminação",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  fixacao: {
    label: "Fixação",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  },
  adesivos: {
    label: "Adesivos",
    className: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  },
  tintas: {
    label: "Tintas",
    className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  acabamento: {
    label: "Acabamento",
    className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  instalacao: {
    label: "Instalação",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  servicos_terceirizados: {
    label: "Serviços Terceirizados",
    className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
  },
  outros: {
    label: "Outros",
    className: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400",
  },
};

const quoteStatusMap: Record<string, { label: string; className: string }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  enviado: {
    label: "Enviado",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  reprovado: {
    label: "Reprovado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

const orderStatusMap: Record<string, { label: string; className: string }> = {
  aguardando_producao: {
    label: "Aguardando Produção",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  em_producao: {
    label: "Em Produção",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  finalizado: {
    label: "Finalizado",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  entregue: {
    label: "Entregue",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

interface StatusBadgeProps {
  value: string;
  type: "client" | "seller" | "taskPriority" | "taskStatus" | "rawMaterialCategory" | "quote" | "order";
  className?: string;
}

export function StatusBadge({ value, type, className }: StatusBadgeProps) {
  const map =
    type === "client"
      ? clientStatusMap
      : type === "seller"
        ? sellerStatusMap
        : type === "taskPriority"
          ? taskPriorityMap
          : type === "taskStatus"
            ? taskStatusMap
            : type === "quote"
              ? quoteStatusMap
              : type === "order"
                ? orderStatusMap
                : rawMaterialCategoryMap;

  const config = map[value] || { label: value, className: "" };

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs font-medium border-0 no-default-active-elevate",
        config.className,
        className
      )}
      data-testid={`badge-status-${value}`}
    >
      {config.label}
    </Badge>
  );
}
