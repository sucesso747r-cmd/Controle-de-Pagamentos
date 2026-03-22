import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Receipt,
  Pencil,
  Trash2,
  Loader2,
  Mail,
  Download
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
  DialogFooter,
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
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UsageStatsData {
  db: { bytes: number; limitBytes: number };
  files: { bytes: number; limitBytes: number };
  emails: { count: number; limitCount: number };
}

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 * 1024
    ? (bytes / (1024 * 1024)).toFixed(1) + " MB"
    : (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";

const getBarColor = (pct: number) =>
  pct < 60 ? "bg-green-500" : pct < 85 ? "bg-yellow-500" : "bg-red-500";
import SupplierEditModal from "@/components/supplier-edit-modal";

interface Supplier {
  id: string;
  name: string;
  serviceName: string;
  isRecurring: boolean;
  dueDay: number | null;
  ownerId: string;
}

interface Payment {
  id: string;
  supplierId: string;
  amount: number;
  monthYear: string;
  pixKey: string | null;
  dueDay: number | null;
  fileUrl: string | null;
  receiptUrl: string | null;
  registrationDate: string;
  isArchived: boolean;
  status: string;
}

const MONTHS = [
  { id: 'jan', label: 'jan' }, { id: 'fev', label: 'fev' }, { id: 'mar', label: 'mar' },
  { id: 'abr', label: 'abr' }, { id: 'mai', label: 'mai' }, { id: 'jun', label: 'jun' },
  { id: 'jul', label: 'jul' }, { id: 'ago', label: 'ago' }, { id: 'set', label: 'set' },
  { id: 'out', label: 'out' }, { id: 'nov', label: 'nov' }, { id: 'dez', label: 'dez' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // const [showRealModal, setShowRealModal] = useState(false);
  // const [showConfirmModal, setShowConfirmModal] = useState(false);
  // const [isArchiving, setIsArchiving] = useState(false);

  const { data: usageStats } = useQuery<UsageStatsData>({
    queryKey: ["/api/stats/usage"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({ title: "Pagamento excluído", description: "O registro e os arquivos foram removidos com sucesso." });
      setPaymentToDelete(null);
      setSelectedPayment(null);
    },
  });

  const sendReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await apiRequest("POST", `/api/payments/${paymentId}/send-receipt`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro ao enviar email");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Comprovante enviado com sucesso", description: `Email enviado para: ${user?.destEmail}` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  /* ARCHIVE FEATURE REMOVED — archive mutation commented out
  const archiveMutation = useMutation({
    mutationFn: async (year: number) => {
      await apiRequest("POST", `/api/payments/archive/${year}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({ title: `Ano ${selectedYear} arquivado!`, description: "Storage liberado." });
      setShowConfirmModal(false);
    },
  });
  */

  const initialYear = user?.initialYear || 2025;
  const currentYearSuffix = selectedYear.toString().slice(-2);

  const handlePrevYear = () => {
    if (selectedYear > initialYear) setSelectedYear(selectedYear - 1);
  };

  const handleNextYear = () => setSelectedYear(selectedYear + 1);

  const handleCellClick = (supplier: Supplier, monthId: string) => {
    const monthYear = `${monthId}${currentYearSuffix}`;
    const payment = payments.find(p => p.supplierId === supplier.id && p.monthYear === monthYear);
    if (payment) {
      setSelectedPayment(payment);
    } else {
      setLocation(`/pagamentos/novo?supplierId=${supplier.id}&monthYear=${monthYear}`);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getCellContent = (supplier: Supplier, monthId: string) => {
    const monthYear = `${monthId}${currentYearSuffix}`;
    const payment = payments.find(p => p.supplierId === supplier.id && p.monthYear === monthYear);
    
    if (payment) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full h-full flex items-center justify-center bg-[#d4edda] text-[#155724] text-[10px] font-semibold cursor-pointer hover:bg-[#c3e6cb] transition-colors">
                {formatCurrency(payment.amount)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clique para ver detalhes do pagamento</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (supplier.isRecurring) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full h-full flex items-center justify-center bg-[#f8d7da] text-[#721c24] font-bold cursor-pointer hover:bg-[#f5c6cb] transition-colors">
                ?
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clique para registrar pagamento</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full h-full bg-[#f8f9fa] cursor-pointer hover:bg-[#e9ecef] transition-colors" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Clique para registrar pagamento</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getMonthTotal = (monthId: string) => {
    const monthYear = `${monthId}${currentYearSuffix}`;
    return payments.filter(p => p.monthYear === monthYear).reduce((acc, curr) => acc + curr.amount, 0);
  };

  /* ARCHIVE FEATURE REMOVED — archive handlers commented out
  const handleRealArchive = () => {
    setIsArchiving(true);
    setTimeout(() => {
      setIsArchiving(false);
      setShowRealModal(false);
      setShowConfirmModal(true);
    }, 2000);
  };

  const handleConfirmArchive = () => {
    archiveMutation.mutate(selectedYear);
  };
  */

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-heading">Status</h2>
          <p className="text-muted-foreground text-sm">Olá, {user?.firstName || user?.email?.split("@")[0]}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open(`/api/payments/export/${selectedYear}`, '_blank')}
            data-testid="button-export-xlsx"
          >
            <Download className="w-4 h-4" />
            Exportar XLSX
          </Button>
          {/* ARCHIVE FEATURE REMOVED — archive button was here */}
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="bg-muted/30 p-4 border-b flex items-center justify-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrevYear}
              disabled={selectedYear <= initialYear}
              data-testid="button-prev-year"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-xl font-bold font-heading" data-testid="text-year">{selectedYear}</span>
            <Button variant="ghost" size="icon" onClick={handleNextYear} data-testid="button-next-year">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-[180px] font-bold text-foreground sticky left-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">Fornecedor</TableHead>
                  <TableHead className="w-[150px] font-bold text-foreground hidden sm:table-cell">Serviço</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m.id} className="text-center font-bold text-foreground min-w-[75px]">
                      {m.label}{currentYearSuffix}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-muted/20">
                    <TableCell 
                      className="font-medium cursor-pointer hover:underline decoration-primary hover:text-primary transition-colors sticky left-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10"
                      onClick={() => setEditingSupplier(supplier)}
                      data-testid={`cell-supplier-${supplier.id}`}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{supplier.name}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Clique para editar fornecedor</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{supplier.serviceName}</TableCell>
                    {MONTHS.map(m => (
                      <TableCell 
                        key={m.id} 
                        className="p-0 h-14 border-l first:border-l-0"
                        onClick={() => handleCellClick(supplier, m.id)}
                        data-testid={`cell-payment-${supplier.id}-${m.id}`}
                      >
                        {getCellContent(supplier, m.id)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow className="hover:bg-transparent bg-[#cfe2ff] text-[#084298] font-bold border-t border-[#084298]/20">
                  <TableCell className="font-bold sticky left-0 bg-[#cfe2ff] z-10">TOTAL</TableCell>
                  <TableCell className="bg-[#cfe2ff] hidden sm:table-cell" />
                  {MONTHS.map(m => (
                    <TableCell key={m.id} className="text-center text-[10px] p-0 h-14 border-l border-[#084298]/10 first:border-l-0">
                      <div className="w-full h-full flex items-center justify-center">
                        {formatCurrency(getMonthTotal(m.id))}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="hover:bg-transparent bg-[#0d47a1] text-white font-bold">
                  <TableCell className="font-bold sticky left-0 bg-[#0d47a1] z-10">TOTAL ANO {selectedYear}</TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  {MONTHS.map((m, i) => (
                    <TableCell key={m.id} className="text-center p-0 h-14 border-l border-white/10">
                      {i === MONTHS.length - 1 && (
                        <div className="w-full h-full flex items-center justify-center">
                          {formatCurrency(payments.filter(p => p.monthYear.endsWith(currentYearSuffix)).reduce((acc, p) => acc + p.amount, 0))}
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">Detalhes do Pagamento</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Valor:</p>
                  <p className="font-bold text-lg" data-testid="text-payment-amount">{formatCurrency(selectedPayment.amount)}</p>
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
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  disabled={!selectedPayment.fileUrl}
                  onClick={() => selectedPayment.fileUrl && window.open(selectedPayment.fileUrl, '_blank')}
                  data-testid="button-view-fatura"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  Ver Fatura
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  disabled={!selectedPayment.receiptUrl}
                  onClick={() => selectedPayment.receiptUrl && window.open(selectedPayment.receiptUrl, '_blank')}
                  data-testid="button-view-receipt"
                >
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  Ver Comprovante
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button 
                  variant="secondary" 
                  className="flex-1 gap-2" 
                  onClick={() => {
                    setLocation(`/pagamentos/novo?paymentId=${selectedPayment.id}`);
                    setSelectedPayment(null);
                  }}
                  data-testid="button-edit-payment"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 gap-2 text-destructive hover:bg-destructive/10" 
                  onClick={() => setPaymentToDelete(selectedPayment.id)}
                  data-testid="button-delete-payment"
                >
                  <Trash2 className="w-4 h-4" />
                  Deletar Pagamento
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {selectedPayment && (
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={sendReceiptMutation.isPending || (!selectedPayment.fileUrl && !selectedPayment.receiptUrl)}
                onClick={() => sendReceiptMutation.mutate(selectedPayment.id)}
                data-testid="button-send-receipt"
              >
                {sendReceiptMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {sendReceiptMutation.isPending ? "Enviando..." : "Enviar comprovante por email"}
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setSelectedPayment(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ARCHIVE FEATURE REMOVED — archive dialogs were here */}

      <AlertDialog open={!!paymentToDelete} onOpenChange={(val) => !val && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai deletar o registro e os arquivos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingSupplier && (
        <SupplierEditModal
          supplier={editingSupplier}
          open={!!editingSupplier}
          onOpenChange={(open: boolean) => !open && setEditingSupplier(null)}
        />
      )}

      {usageStats && (
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-lg font-bold font-heading">Uso do Sistema</h3>
            {[
              {
                label: "Banco de Dados",
                value: `${formatBytes(usageStats.db.bytes)} / 1 GB`,
                pct: Math.min(100, (usageStats.db.bytes / usageStats.db.limitBytes) * 100),
              },
              {
                label: "Arquivos",
                value: `${formatBytes(usageStats.files.bytes)} / 800 MB`,
                pct: Math.min(100, (usageStats.files.bytes / usageStats.files.limitBytes) * 100),
              },
              {
                label: "Emails (mês)",
                value: `${usageStats.emails.count.toLocaleString("pt-BR")} / 3.000`,
                pct: Math.min(100, (usageStats.emails.count / usageStats.emails.limitCount) * 100),
              },
            ].map(({ label, value, pct }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getBarColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
