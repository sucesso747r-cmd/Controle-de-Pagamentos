import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, UploadCloud } from "lucide-react";

const paymentSchema = z.object({
  supplierId: z.string().min(1, "Selecione um fornecedor"),
  amount: z.string().min(1, "Digite o valor"),
  monthYear: z.string().min(3, "Mês/Ano inválido"),
  pixKey: z.string().optional(),
  status: z.enum(["paid", "pending", "overdue"]),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentPage() {
  const { suppliers, addPayment } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      supplierId: "",
      amount: "",
      monthYear: "jan26",
      pixKey: "",
      status: "paid",
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    addPayment({
      supplierId: data.supplierId,
      amount: parseFloat(data.amount.replace("R$", "").replace(".", "").replace(",", ".")),
      monthYear: data.monthYear,
      pixKey: data.pixKey,
      status: data.status,
    });
    
    toast({
      title: "Pagamento registrado",
      description: "O pagamento foi salvo com sucesso.",
    });

    setLocation("/");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-heading">Registrar Pagamento</h2>
        <p className="text-muted-foreground">Registre um novo pagamento para seus fornecedores.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Pagamento</CardTitle>
          <CardDescription>Preencha as informações abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} - {s.serviceName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input placeholder="0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mês de Referência</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: jan26" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="pixKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave Pix Utilizada (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="CPF, Email, Aleatória..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status do Pagamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                <UploadCloud className="w-8 h-8" />
                <p className="text-sm font-medium">Arraste o comprovante ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">(Funcionalidade Mock)</p>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" type="button" onClick={() => setLocation("/")}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Pagamento</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
