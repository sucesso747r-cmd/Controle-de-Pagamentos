import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { CheckCircle2 } from "lucide-react";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const login = useStore((state) => state.login);

  const handleLogin = () => {
    // Mock login
    login({
      id: "user_123",
      name: "João Silva",
      email: "joao@exemplo.com",
      avatarUrl: "https://github.com/shadcn.png"
    });
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo</CardTitle>
            <CardDescription className="text-base">
              Gerencie seus pagamentos de fornecedores com facilidade.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            size="lg" 
            className="w-full font-medium text-base h-12 gap-2" 
            onClick={handleLogin}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.347.533 12S5.867 24 12.48 24c3.44 0 6.013-1.133 8.053-3.24 2.08-2.16 2.627-5.467 2.627-8.24 0-.787-.067-1.52-.187-2.267H12.48z" />
            </svg>
            Entrar com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
