import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { payments, user } = useStore();

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOverdue = payments
    .filter(p => p.status === 'overdue')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
    .slice(0, 5);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-heading">Status</h2>
        <p className="text-muted-foreground">Resumo financeiro deste mês.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +20.1% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              3 pagamentos agendados
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Vencido</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-destructive/80 mt-1">
              Ação necessária
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold font-heading">Atividade Recente</h3>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="divide-y">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      payment.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {payment.status === 'paid' ? <CheckCircle2 className="w-5 h-5" /> : 
                       payment.status === 'overdue' ? <AlertCircle className="w-5 h-5" /> :
                       <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">Pagamento #{payment.id.slice(0, 4)}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {format(new Date(payment.registrationDate), "d 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(payment.amount)}</p>
                    <Badge variant={
                      payment.status === 'paid' ? 'default' : 
                      payment.status === 'overdue' ? 'destructive' : 'outline'
                    } className="text-[10px] h-5 px-1.5 uppercase tracking-wide">
                      {payment.status === 'paid' ? 'Pago' : 
                       payment.status === 'overdue' ? 'Vencido' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
