import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register.mutateAsync({ name, email, password });
      } else {
        await login.mutateAsync({ email, password });
      }
      setLocation("/");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: err.message || "Erro ao autenticar",
      });
    }
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {isRegister ? "Criar Conta" : "Bem-vindo"}
            </CardTitle>
            <CardDescription className="text-base">
              {isRegister
                ? "Crie sua conta para começar a gerenciar pagamentos."
                : "Gerencie seus pagamentos de fornecedores com facilidade."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full font-medium text-base h-12 gap-2"
              disabled={isPending}
              data-testid="button-submit"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRegister ? (
                "Criar Conta"
              ) : (
                "Entrar"
              )}
            </Button>
            <div className="text-center pt-2">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setIsRegister(!isRegister)}
                data-testid="link-toggle-auth"
              >
                {isRegister
                  ? "Já tem conta? Entrar"
                  : "Não tem conta? Criar uma"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
