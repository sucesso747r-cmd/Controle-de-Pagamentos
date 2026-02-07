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
  Trash2,
  FlaskConical,
  Loader2
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
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import SupplierEditModal from "./supplier-edit-modal";

const MONTHS = [
  { id: 'jan', label: 'jan' }, { id: 'fev', label: 'fev' }, { id: 'mar', label: 'mar' },
  { id: 'abr', label: 'abr' }, { id: 'mai', label: 'mai' }, { id: 'jun', label: 'jun' },
  { id: 'jul', label: 'jul' }, { id: 'ago', label: 'ago' }, { id: 'set', label: 'set' },
  { id: 'out', label: 'out' }, { id: 'nov', label: 'nov' }, { id: 'dez', label: 'dez' },
];

export default function DashboardPage() {
  const { payments, suppliers, user, selectedYear, setYear, deletePayment, archiveYear } = useStore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Archiving states
  const [showTestModal, setShowTestModal] = useState(false);
  const [showRealModal, setShowRealModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const currentYearSuffix = selectedYear.toString().slice(-2);
  const isRealButtonEnabled = false; // For MVP simulation, real year end is false

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
    return payments
      .filter(p => p.monthYear === monthYear)
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

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

  const handleTestArchive = () => {
    toast({
      title: "✅ ZIP de teste gerado!",
      description: "Arquivos mantidos no sistema.",
    });
    setShowTestModal(false);
  };

  const handleRealArchive = () => {
    setIsArchiving(true);
    setTimeout(() => {
      setIsArchiving(false);
      setShowRealModal(false);
      setShowConfirmModal(true);
    }, 2000);
  };

  const handleConfirmArchive = () => {
    archiveYear(selectedYear);
    toast({
      title: `✅ Ano ${selectedYear} arquivado!`,
      description: "Storage liberado.",
    });
    setShowConfirmModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-heading">Status</h2>
          <p className="text-muted-foreground text-sm">Olá, {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 border-orange-200 bg-orange-50/30 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
            onClick={() => setShowTestModal(true)}
          >
            <FlaskConical className="w-4 h-4" />
            🧪 Testar Arquivamento (últimos 2 meses)
            <Badge variant="outline" className="ml-1 bg-orange-100 border-orange-200 text-orange-800 font-bold text-[10px]">MODO TESTE</Badge>
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    variant="outline" 
                    className="gap-2" 
                    disabled={!isRealButtonEnabled}
                    onClick={() => setShowRealModal(true)}
                  >
                    <Archive className="w-4 h-4" />
                    🗄️ Arquivar Ano [{selectedYear}]
                  </Button>
                </span>
              </TooltipTrigger>
              {!isRealButtonEnabled && (
                <TooltipContent>
                  <p>Disponível apenas no fim do ano</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
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
                    <TableCell 
                      className="font-medium cursor-pointer hover:underline decoration-primary hover:text-primary transition-colors"
                      onClick={() => setEditingSupplier(supplier)}
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
                    {MONTHS.map(m => (
                      <TableCell 
                        key={m.id} 
                        className="p-0 h-14 border-l first:border-l-0"
                        onClick={() => handleCellClick(supplier, m.id)}
                      >
                        {getCellContent(supplier, m.id)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* TOTALS ROW */}
                <TableRow className="hover:bg-transparent bg-[#cfe2ff] text-[#084298] font-bold border-t border-[#084298]/20">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  {MONTHS.map(m => (
                    <TableCell key={m.id} className="text-center text-[10px] p-0 h-14 border-l border-[#084298]/10 first:border-l-0">
                      <div className="w-full h-full flex items-center justify-center">
                        {formatCurrency(getMonthTotal(m.id))}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">Detalhes do Pagamento</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              {selectedPayment.isArchived && (
                <div className="bg-muted/50 p-3 rounded-lg flex items-center gap-2 text-muted-foreground text-sm border">
                  <Archive className="w-4 h-4" />
                  📦 Arquivos arquivados. Consulte historico_{selectedYear}.zip
                </div>
              )}
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
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  disabled={selectedPayment.isArchived}
                  onClick={() => window.open(selectedPayment.fileUrl || '#', '_blank')}
                >
                  <FileText className="w-4 h-4 text-primary" />
                  Ver Fatura
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  disabled={selectedPayment.isArchived}
                  onClick={() => window.open(selectedPayment.receiptUrl || '#', '_blank')}
                >
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  Ver Comprovante
                </Button>
              </div>

              {!selectedPayment.isArchived && (
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
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setSelectedPayment(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Archive Modal */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">🧪 Modo de Teste - Arquivamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm">Isso vai gerar um arquivo ZIP de TESTE contendo apenas os últimos 2 meses com pagamentos registrados.</p>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-2">
              <p className="text-sm font-bold text-amber-800">⚠️ IMPORTANTE:</p>
              <ul className="text-xs text-amber-700 list-disc pl-4 space-y-1">
                <li>Arquivos NÃO serão deletados do sistema</li>
                <li>Use apenas para validar se a funcionalidade funciona</li>
                <li>No fim do ano real, use o botão "Arquivar Ano"</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowTestModal(false)}>Cancelar</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleTestArchive}>Gerar ZIP de Teste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real Archive Modal */}
      <Dialog open={showRealModal} onOpenChange={setShowRealModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Arquivar Ano {selectedYear}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-sm flex items-center gap-2">✅ Gerar arquivo <span className="font-mono">historico_{selectedYear}.zip</span> contendo:</p>
              <ul className="text-xs text-muted-foreground list-disc pl-8 space-y-1">
                <li>Planilha Excel com todos 12 meses</li>
                <li>Todas faturas (PDFs/JPGs)</li>
                <li>Todos comprovantes (JPGs)</li>
              </ul>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg">
              <p className="text-sm text-rose-800">
                <span className="font-bold">⚠️ Atenção:</span> Após download e confirmação, os arquivos serão <span className="font-bold">REMOVIDOS</span> do sistema (Dados dos pagamentos continuam visíveis, mas sem arquivos anexados).
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRealModal(false)}>Cancelar</Button>
            <Button disabled={isArchiving} onClick={handleRealArchive}>
              {isArchiving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : "Gerar e Baixar Arquivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Download Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">✅ Arquivo gerado com sucesso!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium">📥 Download iniciado (verificar pasta Downloads)</p>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2 text-blue-800">
              <p className="text-xs font-bold uppercase tracking-wider">⚠️ IMPORTANTE:</p>
              <p className="text-sm">Salve este arquivo em local seguro (nuvem pessoal, HD externo, etc)</p>
              <p className="text-xs">O arquivo <span className="font-mono font-bold">historico_{selectedYear}.zip</span> contém TUDO do ano {selectedYear}.</p>
            </div>
            <Button variant="link" className="px-0 h-auto text-xs" onClick={handleRealArchive}>
              Download não iniciou? Clique aqui para baixar novamente
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>❌ Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmArchive}>✅ Confirmar: Baixei o Arquivo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              onClick={handleDeletePayment}
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
    </div>
  );
}
