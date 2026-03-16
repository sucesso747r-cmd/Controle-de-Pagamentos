import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-lg">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl">
              GP
            </div>
            <span className="font-bold text-2xl tracking-tight" data-testid="text-app-name">Gestão de Pagamentos</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight font-serif text-slate-900 leading-tight" data-testid="text-hero-title">
              Controle total dos seus
              <span className="text-primary block">pagamentos</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-hero-description">
              Gerencie fornecedores, registre pagamentos com comprovantes e
              mantenha tudo organizado em um só lugar. Simples, seguro e gratuito.
            </p>
          </div>

          <a href="/auth" data-testid="button-login-hero">
            <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
              Iniciar
            </Button>
          </a>
        </div>
      </main>

      <footer className="border-t border-slate-200/50 bg-white/50 backdrop-blur-sm py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} i9star.com.br. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
