import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import SuppliersPage from "@/pages/suppliers-page";
import PaymentPage from "@/pages/payment-page";
import AnalyticsPage from "@/pages/analytics-page";
import SettingsPage from "@/pages/settings-page";
import HelpPage from "@/pages/help-page";
import Layout from "@/components/layout";
import { useStore } from "@/lib/store";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const user = useStore((state) => state.user);
  
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const user = useStore((state) => state.user);

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to="/" /> : <AuthPage />}
      </Route>
      
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
