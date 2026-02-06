import { Card, CardContent } from "@/components/ui/card";
import { useStore, Payment, Supplier } from "@/lib/store";
import { useLocation } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  Archive, 
  CheckCircle2, 
  FileText, 
  Receipt,
  Pencil,
  Trash2
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  { id: 'jan', label: 'jan' }, { id: 'fev', label: 'fev' }, { id: 'mar', label: 'mar' },
  { id: 'abr', label: 'abr' }, { id: 'mai', label: 'mai' }, { id: 'jun', label: 'jun' },
  { id: 'jul', label: 'jul' }, { id: 'ago', label: 'ago' }, { id: 'set', label: 'set' },
  { id: 'out', label: 'out' }, { id: 'nov', label: 'nov' }, { id: 'dez', label: 'dez' },
];

export default function DashboardPage() {
  const { payments, suppliers, user, selectedYear, setYear, deletePayment } = useStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const currentYearSuffix = selectedYear.toString().slice(-2);
  
  const handleCellClick = (supplier: Supplier, monthId: string) => {
    const monthYear = `${monthId}${currentYearSuffix}`;
    const payment = payments.find(p => p.supplierId === supplier.id && p.monthYear === monthYear);
    
    if (payment) {
      setSelectedPayment(payment);
    } else if (supplier.isRecurring) {
      setLocation(`/pagamentos/novo?supplierId=${supplier.id}&monthYear=${monthYear}`);
    }
  };

  const getCellContent = (supplier: Supplier, monthId: string) => {
    const monthYear = `${monthId}${currentYearSuffix}`;
    const payment = payments.find(p => p.supplierId === supplier.id && p.monthYear === monthYear);
    
    if (payment) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
        </div>
      );
    }

    if (supplier.isRecurring) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 font-bold border border-rose-100 hover:bg-rose-100 transition-colors">
            ?
          </div>
        </div>
      );
    }

    return null;
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDeletePayment = () => {
    if (paymentToDelete) {
      deletePayment(paymentToDelete);
      toast({
        title: "Pagamento excluído",
        description: "O registro e os arquivos foram removidos com sucesso.",
      });
      setPaymentToDelete(null);
      setSelectedPayment(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-heading">Status</h2>
          <p className="text-muted-foreground text-sm">Olá, {user?.name}</p>
        </div>
        <Button variant="outline" className="gap-2" disabled={selectedYear >= 2026}>
          <Archive className="w-4 h-4" />
          🗄️ Arquivar Ano
        </Button>
      </div>

      <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="bg-muted/30 p-4 border-b flex items-center justify-center gap-6">
            <Button variant="ghost" size="icon" onClick={() => setYear(selectedYear - 1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-xl font-bold font-heading">{selectedYear}</span>
            <Button variant="ghost" size="icon" onClick={() => setYear(selectedYear + 1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-[200px] font-bold text-foreground">Fornecedor</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m.id} className="text-center font-bold text-foreground min-w-[70px]">
                      {m.label}{currentYearSuffix}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    {MONTHS.map(m => (
                      <TableCell 
                        key={m.id} 
                        className="p-0 h-14 cursor-pointer border-l first:border-l-0"
                        onClick={() => handleCellClick(supplier, m.id)}
                      >
                        {getCellContent(supplier, m.id)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">Detalhes do Pagamento</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Valor:</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Data:</p>
                  <p className="font-semibold">{new Date(selectedPayment.registrationDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Chave Pix:</p>
                  <p className="font-mono text-sm bg-muted p-2 rounded truncate">
                    {selectedPayment.pixKey || "Não informada"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Dia de Vencimento:</p>
                  <p className="font-semibold">{selectedPayment.dueDay || "-"}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <Button variant="outline" className="gap-2" onClick={() => window.open(selectedPayment.fileUrl || '#', '_blank')}>
                  <FileText className="w-4 h-4 text-primary" />
                  Ver Fatura
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => window.open(selectedPayment.fileUrl || '#', '_blank')}>
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  Ver Comprovante
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="secondary" 
                  className="flex-1 gap-2" 
                  onClick={() => {
                    setLocation(`/pagamentos/novo?paymentId=${selectedPayment.id}`);
                    setSelectedPayment(null);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  ✏️ Editar
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 gap-2 text-destructive hover:bg-destructive/10" 
                  onClick={() => setPaymentToDelete(selectedPayment.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  🗑️ Deletar Pagamento
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setSelectedPayment(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paymentToDelete} onOpenChange={(val) => !val && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai deletar o registro e os arquivos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
