import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Kanban,
  Printer,
  ChevronRight,
  Clock,
  FlaskConical,
  Box,
  FileText,
  Package,
  CreditCard,
  Building2,
  MessageCircle,
  Car,
  LogOut,
  PackageOpen,
  Truck,
  Bot,
  ShieldCheck,
  UserCog,
  Wallet,
  ScanBarcode,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Equipe", url: "/sellers", icon: UserCheck },
  { title: "CRM", url: "/crm", icon: Kanban },
];

const comercialItems = [
  { title: "Orçamentos", url: "/quotes", icon: FileText },
  { title: "Agente de Orçamento", url: "/quotes/agent", icon: Bot },
  { title: "Pedidos", url: "/orders", icon: Package },
  { title: "WhatsApp Bot", url: "/whatsapp", icon: MessageCircle },
];

const cadastroItems = [
  { title: "Matérias-primas", url: "/raw-materials", icon: FlaskConical },
  { title: "Produtos", url: "/products", icon: Box },
];

const vehicleItems = [
  { title: "Frota", url: "/vehicles", icon: Car },
  { title: "Saídas", url: "/vehicles/exits", icon: LogOut },
];

const inventoryItems = [
  { title: "Compras", url: "/inventory/purchases", icon: PackageOpen },
  { title: "Fornecedores", url: "/inventory/suppliers", icon: Truck },
  { title: "Recebimento NF-e", url: "/inventory/receiving", icon: ScanBarcode },
];

const financeiroItems = [
  { title: "Contas a Pagar", url: "/financial/accounts-payable", icon: Wallet },
];

const configItems = [
  { title: "Empresas", url: "/companies", icon: Building2 },
  { title: "Prazos de Pagamento", url: "/payment-terms", icon: Clock },
  { title: "Formas de Pagamento", url: "/payment-methods", icon: CreditCard },
  { title: "Treinamento do Agente IA", url: "/settings/ai-agent", icon: Bot },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: pendingData } = useQuery<{ total: number }>({
    queryKey: ["/api/purchase-requests", { status: "aguardando_aprovacao" }],
    queryFn: () =>
      fetch("/api/purchase-requests?status=aguardando_aprovacao&limit=1", { credentials: "include" })
        .then((r) => r.json()),
    refetchInterval: 60_000,
  });
  const pendingCount = pendingData?.total ?? 0;

  const isActive = (url: string) => {
    if (url === "/dashboard") return location === "/dashboard" || location === "/";
    return location.startsWith(url);
  };

  const renderMenuItems = (items: { title: string, url: string, icon: any }[]) => {
    return items.map((item) => {
      const active = isActive(item.url);
      const showBadge = item.url === "/inventory/purchases" && pendingCount > 0;
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            className={
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground"
            }
            data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Link href={item.url} className="flex items-center gap-2.5">
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{item.title}</span>
              {showBadge && (
                <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
              {active && !showBadge && (
                <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Printer className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground leading-none">Gráfica+</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sistema de Gestão</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-2 mb-1">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(navItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-2 mb-1">
            Comercial
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(comercialItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-2 mb-1">
            Cadastros
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(cadastroItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-2 mb-1">
            Veículos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(vehicleItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-2 mb-1">
            Estoque
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(inventoryItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-2 mb-1">
            Financeiro
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(financeiroItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-2 mb-1">
            Configurações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(configItems)}
              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className={
                      isActive("/admin/users")
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground"
                    }
                    data-testid="nav-usuarios"
                  >
                    <Link href="/admin/users" className="flex items-center gap-2.5">
                      <UserCog className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Usuários</span>
                      {isActive("/admin/users") && (
                        <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 py-3 border-t border-sidebar-border">
        <div className="px-2 py-2 rounded-lg bg-sidebar-accent/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-sidebar-primary-foreground">
                {(user?.nome || user?.username || "?").slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate leading-none">
                {user?.nome || user?.username}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {user?.role === "admin" && <ShieldCheck className="w-2.5 h-2.5 text-primary flex-shrink-0" />}
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role === "admin" ? "Administrador" : user?.role === "gerente" ? "Gerente" : "Operador"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="button-logout"
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
