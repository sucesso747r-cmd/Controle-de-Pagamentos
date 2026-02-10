import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing-page";
import DashboardPage from "@/pages/dashboard-page";
import SuppliersPage from "@/pages/suppliers-page";
import PaymentPage from "@/pages/payment-page";
import AnalyticsPage from "@/pages/analytics-page";
import SettingsPage from "@/pages/settings-page";
import HelpPage from "@/pages/help-page";
import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <ProtectedRoute component={DashboardPage} />
      </Route>

      <Route path="/analytics">
        <ProtectedRoute component={AnalyticsPage} />
      </Route>

      <Route path="/fornecedores">
        <ProtectedRoute component={SuppliersPage} />
      </Route>

      <Route path="/pagamentos/novo">
        <ProtectedRoute component={PaymentPage} />
      </Route>

      <Route path="/configuracoes">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      <Route path="/ajuda">
        <ProtectedRoute component={HelpPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function GmailOAuthHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailConnected = params.get("gmail_connected");
    const gmailError = params.get("gmail_error");

    if (gmailConnected === "true") {
      toast({ title: "Gmail conectado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gmailError) {
      const messages: Record<string, string> = {
        denied: "Autorização do Gmail negada. É necessário autorizar para enviar emails.",
        no_code: "Erro na autorização do Gmail. Tente novamente.",
        no_refresh_token: "Erro na autorização do Gmail. Tente novamente revogando o acesso anterior em myaccount.google.com.",
        token_exchange_failed: "Erro ao trocar o código de autorização. Tente novamente.",
      };
      toast({ variant: "destructive", title: messages[gmailError] || "Erro na autorização do Gmail." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <GmailOAuthHandler />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
