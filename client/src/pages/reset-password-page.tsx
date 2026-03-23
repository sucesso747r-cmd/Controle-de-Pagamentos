import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocation, useSearch } from "wouter";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { passwordSchema } from "@shared/schema";

const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

const requirements = [
  { label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  { label: "1 letra maiúscula", test: (v: string) => /[A-Z]/.test(v) },
  { label: "1 letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { label: "1 número", test: (v: string) => /[0-9]/.test(v) },
  { label: "1 caractere especial (!@#$%^&*)", test: (v: string) => /[!@#$%^&*]/.test(v) },
];

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  const password = form.watch("newPassword");

  const onSubmit = async (data: ResetPasswordData) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });

      if (res.ok) {
        setLocation("/auth");
      } else {
        const body = await res.json();
        setErrorMsg(body.message ?? "Erro ao redefinir senha.");
      }
    } catch {
      setErrorMsg("Erro de conexão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-slate-200/60">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Link de recuperação inválido.</p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setLocation("/auth")}>
              Voltar para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl mb-4">
          GP
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Pagamentos</h1>
      </div>

      <Card className="w-full max-w-md shadow-lg border-slate-200/60">
        <CardHeader>
          <CardTitle>Nova senha</CardTitle>
          <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showNewPassword ? "text" : "password"} placeholder="Nova senha" className="pr-10" {...field} />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <ul className="mt-2 space-y-1">
                      {requirements.map((req) => {
                        const ok = req.test(password ?? "");
                        return (
                          <li key={req.label} className="flex items-center gap-2 text-xs">
                            {ok ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                            )}
                            <span className={ok ? "text-green-700" : "text-muted-foreground"}>
                              {req.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder="Repita a nova senha" className="pr-10" {...field} />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {errorMsg && (
                <p className="text-sm font-medium text-destructive">{errorMsg}</p>
              )}
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Redefinir senha"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
