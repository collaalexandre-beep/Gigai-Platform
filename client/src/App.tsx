import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusLightsBar } from "@/components/status-lights";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients/index";
import ClientDetailPage from "@/pages/clients/detail";
import ClientFormPage from "@/pages/clients/form";
import SellersPage from "@/pages/sellers/index";
import SellerDetailPage from "@/pages/sellers/detail";
import SellerFormPage from "@/pages/sellers/form";
import CrmPage from "@/pages/crm";
import PaymentTermsPage from "@/pages/payment-terms/index";
import PaymentMethodsPage from "@/pages/payment-methods/index";
import RawMaterialsPage from "@/pages/raw-materials/index";
import RawMaterialFormPage from "@/pages/raw-materials/form";
import ProductsPage from "@/pages/products/index";
import ProductFormPage from "@/pages/products/form";
import AiGeneratorPage from "@/pages/products/ai-generator";
import QuotesPage from "@/pages/quotes/index";
import QuoteFormPage from "@/pages/quotes/form";
import QuoteDetailPage from "@/pages/quotes/detail";
import QuotePrintPage from "@/pages/quotes/print";
import SpecialQuotePage from "@/pages/quotes/special";
import OrdersPage from "@/pages/orders/index";
import OrderDetailPage from "@/pages/orders/detail";
import OrderPrintPage from "@/pages/orders/print";
import CompaniesPage from "@/pages/companies/index";
import CompanyFormPage from "@/pages/companies/form";
import WhatsappPage from "@/pages/whatsapp";
import VehiclesPage from "@/pages/vehicles/index";
import VehicleFormPage from "@/pages/vehicles/form";
import VehicleDetailPage from "@/pages/vehicles/detail";
import VehicleExitsPage from "@/pages/vehicles/exits/index";
import VehicleExitFormPage from "@/pages/vehicles/exits/form";
import VehicleExitDetailPage from "@/pages/vehicles/exits/detail";
import PurchasesPage from "@/pages/inventory/purchases";
import PurchasePrintPage from "@/pages/inventory/purchases/print";
import SuppliersPage from "@/pages/inventory/suppliers";
import AiAgentPage from "@/pages/settings/ai-agent";
import QuoteAgentPage from "@/pages/quotes/agent";
import UsersAdminPage from "@/pages/admin/users";
import ReceivingPage from "@/pages/inventory/receiving";
import AccountsPayablePage from "@/pages/financial/accounts-payable";
import SuppliesAttentionPage from "@/pages/supplies/attention";

function PrintRouter() {
  return (
    <Switch>
      <Route path="/quotes/:id/print" component={QuotePrintPage} />
      <Route path="/orders/:id/print" component={OrderPrintPage} />
      <Route path="/inventory/purchases/:id/print" component={PurchasePrintPage} />
    </Switch>
  );
}

function AppRouter() {
  const { user } = useAuth();
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/clients/new" component={ClientFormPage} />
      <Route path="/clients/:id/edit" component={ClientFormPage} />
      <Route path="/clients/:id" component={ClientDetailPage} />
      <Route path="/sellers" component={SellersPage} />
      <Route path="/sellers/new" component={SellerFormPage} />
      <Route path="/sellers/:id/edit" component={SellerFormPage} />
      <Route path="/sellers/:id" component={SellerDetailPage} />
      <Route path="/crm" component={CrmPage} />
      <Route path="/payment-terms" component={PaymentTermsPage} />
      <Route path="/payment-methods" component={PaymentMethodsPage} />
      <Route path="/raw-materials" component={RawMaterialsPage} />
      <Route path="/raw-materials/new" component={RawMaterialFormPage} />
      <Route path="/raw-materials/:id/edit" component={RawMaterialFormPage} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/products/ai-generator" component={AiGeneratorPage} />
      <Route path="/products/new" component={ProductFormPage} />
      <Route path="/products/:id/edit" component={ProductFormPage} />
      <Route path="/quotes" component={QuotesPage} />
      <Route path="/quotes/new" component={QuoteFormPage} />
      <Route path="/quotes/special" component={SpecialQuotePage} />
      <Route path="/quotes/agent" component={QuoteAgentPage} />
      <Route path="/quotes/:id/edit" component={QuoteFormPage} />
      <Route path="/quotes/:id/print" component={QuotePrintPage} />
      <Route path="/quotes/:id" component={QuoteDetailPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/orders/:id/print" component={OrderPrintPage} />
      <Route path="/orders/:id" component={OrderDetailPage} />
      <Route path="/companies" component={CompaniesPage} />
      <Route path="/companies/new" component={CompanyFormPage} />
      <Route path="/companies/:id/edit" component={CompanyFormPage} />
      <Route path="/whatsapp" component={WhatsappPage} />
      <Route path="/vehicles" component={VehiclesPage} />
      <Route path="/vehicles/exits" component={VehicleExitsPage} />
      <Route path="/vehicles/exits/new" component={VehicleExitFormPage} />
      <Route path="/vehicles/exits/:id" component={VehicleExitDetailPage} />
      <Route path="/vehicles/new" component={VehicleFormPage} />
      <Route path="/vehicles/:id/edit" component={VehicleFormPage} />
      <Route path="/vehicles/:id" component={VehicleDetailPage} />
      <Route path="/inventory/purchases" component={PurchasesPage} />
      <Route path="/inventory/suppliers" component={SuppliersPage} />
      <Route path="/inventory/receiving" component={ReceivingPage} />
      <Route path="/supplies/attention" component={SuppliesAttentionPage} />
      <Route path="/financial/accounts-payable" component={AccountsPayablePage} />
      <Route path="/settings/ai-agent" component={AiAgentPage} />
      {user?.role === "admin" && (
        <Route path="/admin/users" component={UsersAdminPage} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const isPrintPage = location.endsWith("/print");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  if (isPrintPage) {
    return (
      <>
        <PrintRouter />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40 h-12">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-1">
                <StatusLightsBar />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <AppRouter />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
