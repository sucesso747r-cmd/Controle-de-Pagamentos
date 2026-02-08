import { useStore, Payment } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Wallet, 
  Calendar, 
  ArrowUp, 
  ArrowDown 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { useState } from "react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsDashboard() {
  const { payments, suppliers, selectedYear, setYear } = useStore();
  const [year, setYearLocal] = useState(selectedYear.toString());

  const currentYearPayments = payments.filter(p => p.monthYear.endsWith(year.slice(-2)));
  
  const totalGasto = currentYearPayments.reduce((acc, p) => acc + p.amount, 0);
  const mediaMensal = totalGasto / 12;
  
  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const month = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][i];
    const monthYear = `${month}${year.slice(-2)}`;
    const total = currentYearPayments.filter(p => p.monthYear === monthYear).reduce((acc, p) => acc + p.amount, 0);
    return { name: month, total };
  });

  const sortedMonths = [...monthlyTotals].sort((a, b) => b.total - a.total);
  const maiorDespesa = sortedMonths[0];
  const menorDespesa = [...monthlyTotals].filter(m => m.total > 0).sort((a, b) => a.total - b.total)[0] || { name: '-', total: 0 };

  const servicesData = suppliers.map(s => {
    const total = currentYearPayments.filter(p => p.supplierId === s.id).reduce((acc, p) => acc + p.amount, 0);
    return { name: s.serviceName, value: total };
  }).filter(s => s.value > 0);

  const topSuppliers = suppliers.map(s => {
    const total = currentYearPayments.filter(p => p.supplierId === s.id).reduce((acc, p) => acc + p.amount, 0);
    return { name: s.name, total };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-heading">Dashboard Analítico</h2>
          <p className="text-muted-foreground">Visualize suas despesas e tendências</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Ano:</span>
          <Select value={year} onValueChange={setYearLocal}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto {year}</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGasto)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média Mensal</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mediaMensal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Maior Despesa</CardTitle>
            <ArrowUp className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(maiorDespesa.total)}</div>
            <p className="text-xs text-muted-foreground capitalize">{maiorDespesa.name} {year}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Menor Despesa</CardTitle>
            <ArrowDown className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(menorDespesa.total)}</div>
            <p className="text-xs text-muted-foreground capitalize">{menorDespesa.name} {year}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardTitle className="text-lg font-heading mb-4">Despesas por Tipo de Serviço</CardTitle>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={servicesData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {servicesData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle className="text-lg font-heading mb-4">Tendência Mensal</CardTitle>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTotals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle className="text-lg font-heading mb-4">Top 5 Fornecedores Mais Caros</CardTitle>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSuppliers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle className="text-lg font-heading mb-4">Comparativo Mensal</CardTitle>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTotals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total">
                  {monthlyTotals.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total > mediaMensal ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
