import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UploadCloud, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const MONTHS = [
  { id: 'jan', label: 'jan' }, { id: 'fev', label: 'fev' }, { id: 'mar', label: 'mar' },
  { id: 'abr', label: 'abr' }, { id: 'mai', label: 'mai' }, { id: 'jun', label: 'jun' },
  { id: 'jul', label: 'jul' }, { id: 'ago', label: 'ago' }, { id: 'set', label: 'set' },
  { id: 'out', label: 'out' }, { id: 'nov', label: 'nov' }, { id: 'dez', label: 'dez' },
];

const paymentSchema = z.object({
  supplierId: z.string().min(1, "Fornecedor: campo obrigatório"),
  amount: z.string().min(1, "Valor: campo obrigatório"),
  monthYear: z.string().min(1, "Mês/ano: campo obrigatório"),
  dueDay: z.string().optional().refine(val => !val || (parseInt(val) >= 1 && parseInt(val) <= 31), {
    message: "Dia do vencimento: deve ser entre 1 e 31"
  }),
  pixKey: z.string().min(10, "Chave Pix: mínimo 10 caracteres"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentPage() {
  const { suppliers, payments, addPayment, updatePayment } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const editingId = params.get("paymentId");
  
  const [step, setStep] = useState(1);
  const [fatura, setFatura] = useState<File | null>(null);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ fatura?: string; comprovante?: string }>({});

  const editingPayment = editingId ? payments.find(p => p.id === editingId) : null;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      supplierId: params.get("supplierId") || "",
      amount: "",
      monthYear: params.get("monthYear") || "jan26",
      dueDay: "",
      pixKey: "",
    },
  });

  useEffect(() => {
    if (editingPayment) {
      form.reset({
        supplierId: editingPayment.supplierId,
        amount: editingPayment.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        monthYear: editingPayment.monthYear,
        dueDay: editingPayment.dueDay?.toString() || "",
        pixKey: editingPayment.pixKey || "",
      });
    }
  }, [editingPayment, form]);

  const handleNext = async () => {
    const isValid = await form.trigger();
    if (isValid) setStep(2);
  };

  const validateFiles = () => {
    if (editingId) return true; // Files optional when editing
    const newErrors: { fatura?: string; comprovante?: string } = {};
    if (!fatura) newErrors.fatura = "Fatura é obrigatória";
    if (!comprovante) newErrors.comprovante = "Comprovante é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'fatura' | 'comprovante') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isMaxSize = file.size <= 10 * 1024 * 1024;
    const isAccepted = type === 'fatura' 
      ? ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
      : ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);

    if (!isMaxSize) {
      toast({ variant: "destructive", title: "Arquivo maior que 10MB. Selecione outro." });
      return;
    }

    if (!isAccepted) {
      toast({ variant: "destructive", title: "Formato não aceito. Use PDF ou JPG." });
      return;
    }

    if (type === 'fatura') setFatura(file);
    else setComprovante(file);
    
    setErrors(prev => ({ ...prev, [type]: undefined }));
  };

  const onSubmit = async (data: PaymentFormValues) => {
    if (!validateFiles()) return;

    const numericAmount = parseFloat(data.amount.replace("R$", "").replace(/\./g, "").replace(",", "."));
    
    if (editingId) {
      updatePayment(editingId, {
        amount: numericAmount,
        monthYear: data.monthYear,
        pixKey: data.pixKey,
        dueDay: data.dueDay ? parseInt(data.dueDay) : undefined,
        fileUrl: fatura ? URL.createObjectURL(fatura) : editingPayment?.fileUrl,
      });
      toast({
        title: "✅ Pagamento atualizado",
        duration: 3000,
        className: "bg-emerald-500 text-white border-none",
      });
    } else {
      // Mock Resend Simulation
      try {
        // Here we would call the server to send email via Resend
        // Since we are frontend only, we simulate success
        addPayment({
          supplierId: data.supplierId,
          amount: numericAmount,
          monthYear: data.monthYear,
          pixKey: data.pixKey,
          dueDay: data.dueDay ? parseInt(data.dueDay) : undefined,
          status: "paid",
          fileUrl: URL.createObjectURL(fatura!),
        });
        
        toast({
          title: "✅ Pagamento registrado! Enviando email...",
          duration: 3000,
          className: "bg-emerald-500 text-white border-none",
        });
      } catch (e) {
        toast({
          variant: "destructive",
          title: "⚠️ Pagamento salvo, mas email falhou. Verifique configuração do Resend.",
        });
      }
    }

    setTimeout(() => setLocation("/"), 500);
  };

  const formatCurrency = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    const formatted = (Number(numeric) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return formatted;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-heading">
            {editingId ? "Editar Pagamento" : "Registrar Pagamento"}
          </h2>
          <p className="text-muted-foreground">Etapa {step} de 2: {step === 1 ? "Dados do Pagamento" : "Anexar Documentos"}</p>
        </div>
        <div className="flex gap-2">
          <div className={cn("w-3 h-3 rounded-full", step === 1 ? "bg-primary" : "bg-muted")} />
          <div className={cn("w-3 h-3 rounded-full", step === 2 ? "bg-primary" : "bg-muted")} />
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {step === 1 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fornecedor</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={!!editingId}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Selecione um fornecedor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-destructive font-medium" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor pago</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-12"
                              placeholder="R$ 0,00" 
                              {...field} 
                              onChange={(e) => field.onChange(formatCurrency(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage className="text-destructive font-medium" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monthYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mês/Ano</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Selecione o período" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MONTHS.map((m) => (
                                <SelectItem key={m.id} value={`${m.id}26`}>
                                  {m.label}26
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-destructive font-medium" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="dueDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia do vencimento</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              className="h-12"
                              placeholder="1 a 31" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-destructive font-medium" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pixKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chave Pix</FormLabel>
                          <FormControl>
                            <Input 
                              className="h-12"
                              placeholder="Digite a chave Pix" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-destructive font-medium" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="button" 
                    className="w-full h-12 text-base font-bold gap-2 mt-4" 
                    onClick={handleNext}
                  >
                    Próximo: Anexar Documentos
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">📄 Selecionar Fatura (PDF ou JPG)</Label>
                    <div className="relative">
                      <input
                        type="file"
                        id="fatura-upload"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'fatura')}
                      />
                      <label
                        htmlFor="fatura-upload"
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                          fatura ? "bg-emerald-50 border-emerald-200" : "bg-muted/30 border-muted hover:bg-muted/50",
                          errors.fatura && "border-destructive bg-destructive/5"
                        )}
                      >
                        {fatura ? (
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-700">{fatura.name}</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {editingId ? "Clique para trocar a fatura (opcional)" : "Clique para fazer upload"}
                            </span>
                          </>
                        )}
                      </label>
                      {errors.fatura && <p className="text-xs text-destructive mt-1 font-medium">{errors.fatura}</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">✅ Selecionar Comprovante (JPG)</Label>
                    <div className="relative">
                      <input
                        type="file"
                        id="comprovante-upload"
                        className="hidden"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'comprovante')}
                      />
                      <label
                        htmlFor="comprovante-upload"
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                          comprovante ? "bg-emerald-50 border-emerald-200" : "bg-muted/30 border-muted hover:bg-muted/50",
                          errors.comprovante && "border-destructive bg-destructive/5"
                        )}
                      >
                        {comprovante ? (
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="w-8 h-8 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-700">{comprovante.name}</span>
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {editingId ? "Clique para trocar o comprovante (opcional)" : "Clique para fazer upload"}
                            </span>
                          </>
                        )}
                      </label>
                      {errors.comprovante && <p className="text-xs text-destructive mt-1 font-medium">{errors.comprovante}</p>}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 px-6 gap-2" 
                      onClick={() => setStep(1)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Voltar
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {editingId ? "Salvar Alterações" : "Registrar Pagamento"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
