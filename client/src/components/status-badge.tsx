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

interface StatusBadgeProps {
  value: string;
  type: "client" | "seller" | "taskPriority" | "taskStatus";
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
          : taskStatusMap;

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
