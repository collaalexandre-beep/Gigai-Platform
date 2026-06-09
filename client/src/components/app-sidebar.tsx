import { useLocation, Link } from "wouter";
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
  Settings,
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
} from "lucide-react";

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
];

const configItems = [
  { title: "Empresas", url: "/companies", icon: Building2 },
  { title: "Prazos de Pagamento", url: "/payment-terms", icon: Clock },
  { title: "Formas de Pagamento", url: "/payment-methods", icon: CreditCard },
  { title: "Treinamento do Agente IA", url: "/settings/ai-agent", icon: Bot },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/dashboard") return location === "/dashboard" || location === "/";
    return location.startsWith(url);
  };

  const renderMenuItems = (items: { title: string, url: string, icon: any }[]) => {
    return items.map((item) => {
      const active = isActive(item.url);
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
              {active && (
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
            Configurações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(configItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 py-3 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-sidebar-foreground">
              <Link href="/settings" className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
