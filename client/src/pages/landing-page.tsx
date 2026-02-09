import { Button } from "@/components/ui/button";
import { CheckCircle2, Shield, BarChart3, FileText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex flex-col">
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
              GP
            </div>
            <span className="font-bold text-lg tracking-tight">Gestão de Pagamentos</span>
          </div>
          <a href="/api/login" data-testid="button-login-nav">
            <Button size="sm" className="font-medium">
              Entrar com Google
            </Button>
          </a>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-16">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-serif text-slate-900 leading-tight">
                  Controle total dos seus
                  <span className="text-primary block">pagamentos</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                  Gerencie fornecedores, registre pagamentos com comprovantes e 
                  mantenha tudo organizado em um só lugar. Simples, seguro e gratuito.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/api/login" data-testid="button-login-hero">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                    Entrar com Google
                  </Button>
                </a>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Gratuito para sempre</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Sem cartão de crédito</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-blue-500/10 to-indigo-500/10 rounded-3xl blur-2xl" />
                <div className="relative bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-8 space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">GP</div>
                    <div>
                      <p className="font-semibold text-sm">Painel de Status</p>
                      <p className="text-xs text-muted-foreground">Ano 2026</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {["Enel", "Sabesp Água", "Vivo Internet"].map((name, i) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-32 truncate">{name}</span>
                        <div className="flex gap-1 flex-1">
                          {Array.from({ length: 6 }, (_, j) => (
                            <div
                              key={j}
                              className={`h-6 flex-1 rounded text-[8px] flex items-center justify-center font-semibold ${
                                j <= i + 2
                                  ? "bg-[#d4edda] text-[#155724]"
                                  : i === 0 && j > 3
                                  ? "bg-[#f8d7da] text-[#721c24]"
                                  : "bg-slate-100"
                              }`}
                            >
                              {j <= i + 2 ? "R$" : j > 3 && i === 0 ? "?" : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
            <div className="group bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 hover:bg-white hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Controle Completo</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Registre pagamentos com faturas e comprovantes anexados. Tudo organizado por fornecedor e mês.
              </p>
            </div>

            <div className="group bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 hover:bg-white hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Seguro e Privado</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Login seguro via Google. Seus dados são protegidos e isolados por usuário.
              </p>
            </div>

            <div className="group bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 hover:bg-white hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Relatórios</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dashboard analítico com gráficos de despesas por serviço, fornecedor e comparativo mensal.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/50 bg-white/50 backdrop-blur-sm py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Gestão de Pagamentos. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
