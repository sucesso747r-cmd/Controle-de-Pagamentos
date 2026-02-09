import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3,
  Users, 
  LogOut, 
  Settings,
  HelpCircle,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Status", icon: LayoutDashboard },
    ...(user?.subscriptionPlan === "Pro Version" 
      ? [{ href: "/analytics", label: "Dashboard", icon: BarChart3 }] 
      : []),
    { href: "/pagamentos/novo", label: "Registrar Pagamento", icon: PlusCircle },
    { href: "/fornecedores", label: "Fornecedores", icon: Users },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
    { href: "/ajuda", label: "Central de Ajuda", icon: HelpCircle },
  ];

  const handleLogout = () => {
    logout.mutate();
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold font-heading tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <span className="font-bold">GP</span>
          </div>
          Gestão
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Olá, {user?.name?.split(" ")[0]}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:block w-64 border-r bg-card/50 backdrop-blur-xl fixed h-full z-10">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        <header className="md:hidden h-16 border-b flex items-center justify-between px-4 bg-card/80 backdrop-blur-md sticky top-0 z-20">
          <div className="font-bold font-heading">Gestão de Pagamentos</div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <NavContent />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
