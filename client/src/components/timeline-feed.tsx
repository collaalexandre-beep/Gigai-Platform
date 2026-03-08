import { useQuery } from "@tanstack/react-query";
import {
  Building2, Search, User, UserCheck, MessageSquare, CheckSquare,
  Tag, FileText, RefreshCw, UserMinus, Pencil, UserX, Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Timeline } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const eventConfig: Record<string, { icon: React.ElementType; color: string }> = {
  cadastro_criado: { icon: Building2, color: "bg-blue-500" },
  cnpj_consultado: { icon: Search, color: "bg-purple-500" },
  contato_adicionado: { icon: User, color: "bg-green-500" },
  contato_editado: { icon: Pencil, color: "bg-yellow-500" },
  contato_removido: { icon: UserX, color: "bg-red-500" },
  vendedor_vinculado: { icon: UserCheck, color: "bg-indigo-500" },
  vendedor_desvinculado: { icon: UserMinus, color: "bg-gray-500" },
  observacao_criada: { icon: FileText, color: "bg-gray-500" },
  status_alterado: { icon: RefreshCw, color: "bg-orange-500" },
  interacao_registrada: { icon: MessageSquare, color: "bg-pink-500" },
  tarefa_criada: { icon: CheckSquare, color: "bg-orange-400" },
  tarefa_concluida: { icon: CheckSquare, color: "bg-emerald-500" },
  tag_adicionada: { icon: Tag, color: "bg-teal-500" },
};

interface TimelineFeedProps {
  clientId: string;
}

export function TimelineFeed({ clientId }: TimelineFeedProps) {
  const { data: events, isLoading } = useQuery<Timeline[]>({
    queryKey: ["/api/clients", clientId, "timeline"],
    queryFn: () => fetch(`/api/clients/${clientId}/timeline`).then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-1">
        {events.map((event, i) => {
          const config = eventConfig[event.eventType] || { icon: Clock, color: "bg-gray-400" };
          const Icon = config.icon;
          return (
            <div key={event.id} className="flex gap-3 relative" data-testid={`timeline-event-${event.id}`}>
              <div
                className={`w-7 h-7 rounded-full ${config.color} flex items-center justify-center flex-shrink-0 z-10 relative`}
              >
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="pb-4 flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">{event.titulo}</p>
                {event.descricao && (
                  <p className="text-xs text-muted-foreground mt-0.5">{event.descricao}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
