import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, UserCheck, Phone, Briefcase, CheckSquare, Calendar, Clock, TrendingUp, ArrowRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { DashboardStats, Contact, Timeline } from "@shared/schema";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const timelineIcons: Record<string, string> = {
  cadastro_criado: "🏢",
  cnpj_consultado: "🔍",
  contato_adicionado: "👤",
  contato_editado: "✏️",
  contato_removido: "🗑️",
  vendedor_vinculado: "🤝",
  vendedor_desvinculado: "👋",
  observacao_criada: "📝",
  status_alterado: "🔄",
  interacao_registrada: "💬",
  tarefa_criada: "✅",
  tarefa_concluida: "🎯",
  tag_adicionada: "🏷️",
};

const timelineColors: Record<string, string> = {
  cadastro_criado: "bg-blue-500",
  cnpj_consultado: "bg-purple-500",
  contato_adicionado: "bg-green-500",
  contato_editado: "bg-yellow-500",
  vendedor_vinculado: "bg-indigo-500",
  interacao_registrada: "bg-pink-500",
  tarefa_criada: "bg-orange-500",
  tarefa_concluida: "bg-emerald-500",
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  href,
  loading,
}: {
  title: string;
  value?: number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <Card className="hover-elevate cursor-pointer group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
                {value?.toLocaleString("pt-BR") ?? "—"}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        {href && (
          <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Ver detalhes</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function birthdayLabel(dateStr: string | null): string {
  if (!dateStr) return "";
  const dt = parseISO(dateStr);
  const today = new Date();
  const thisYear = new Date(today.getFullYear(), dt.getMonth(), dt.getDate());
  if (isToday(thisYear)) return "Hoje!";
  if (isTomorrow(thisYear)) return "Amanhã";
  return format(thisYear, "dd/MM", { locale: ptBR });
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" data-testid="button-new-client">
            <Link href="/clients/new">
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Clientes Ativos"
          value={stats?.totalClientes}
          icon={Users}
          color="bg-blue-600"
          href="/clients?status=ativo"
          loading={isLoading}
        />
        <StatCard
          title="Prospects"
          value={stats?.totalProspects}
          subtitle="Em prospecção"
          icon={TrendingUp}
          color="bg-indigo-600"
          href="/clients?status=prospect"
          loading={isLoading}
        />
        <StatCard
          title="Contatos"
          value={stats?.totalContatos}
          icon={Phone}
          color="bg-purple-600"
          loading={isLoading}
        />
        <StatCard
          title="Vendedores"
          value={stats?.totalVendedores}
          icon={UserCheck}
          color="bg-teal-600"
          href="/sellers"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarefas Pendentes */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
              Tarefas Pendentes
            </CardTitle>
            <Link href="/crm">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground" data-testid="stat-tarefas-pendentes">
                    {stats?.tarefasPendentes ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">tarefas em aberto</p>
                  {(stats?.tarefasPendentes ?? 0) > 0 && (
                    <Link href="/crm">
                      <Button size="sm" className="mt-4" data-testid="button-view-tasks">
                        Ver tarefas
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aniversários Próximos */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Aniversários (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats?.aniversariosProximos && stats.aniversariosProximos.length > 0 ? (
              <div className="space-y-2">
                {(stats.aniversariosProximos as Contact[]).map((c) => {
                  const label = birthdayLabel(c.dataNascimento);
                  const isHoje = label === "Hoje!";
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 py-1.5"
                      data-testid={`birthday-contact-${c.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.nomeCompleto}
                        </p>
                        {c.cargo && (
                          <p className="text-xs text-muted-foreground truncate">{c.cargo}</p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`flex-shrink-0 text-xs no-default-active-elevate ${isHoje ? "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" : ""}`}
                      >
                        {label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Nenhum aniversário nos próximos 30 dias</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Atividades */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Últimas Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats?.ultimasAtividades && stats.ultimasAtividades.length > 0 ? (
              <div className="space-y-3">
                {(stats.ultimasAtividades as Timeline[]).slice(0, 6).map((event) => (
                  <div key={event.id} className="flex items-start gap-2.5" data-testid={`activity-${event.id}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${timelineColors[event.eventType] || "bg-gray-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{event.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "dd/MM HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" data-testid="quick-new-client">
              <Link href="/clients/new">
                <Users className="w-4 h-4 mr-1.5" />
                Novo Cliente
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" data-testid="quick-new-seller">
              <Link href="/sellers/new">
                <UserCheck className="w-4 h-4 mr-1.5" />
                Novo Vendedor
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" data-testid="quick-view-crm">
              <Link href="/crm">
                <Briefcase className="w-4 h-4 mr-1.5" />
                Ver CRM
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
