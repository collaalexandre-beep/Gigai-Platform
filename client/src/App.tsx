import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients/index";
import ClientDetailPage from "@/pages/clients/detail";
import ClientFormPage from "@/pages/clients/form";
import SellersPage from "@/pages/sellers/index";
import SellerDetailPage from "@/pages/sellers/detail";
import SellerFormPage from "@/pages/sellers/form";
import CrmPage from "@/pages/crm";
import PaymentTermsPage from "@/pages/payment-terms/index";

function Router() {
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
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const sidebarStyle = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full overflow-hidden">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40 h-12">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
