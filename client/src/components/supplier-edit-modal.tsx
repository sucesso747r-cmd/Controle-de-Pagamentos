import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ServiceCombobox from "@/components/service-combobox";

interface Supplier {
  id: string; name: string; serviceName: string; isRecurring: boolean; dueDay: number | null; ownerId: string;
}

const supplierSchema = z.object({
  name: z.string().min(1, "Preencha todos os campos obrigatórios").min(3, "Nome deve ter pelo menos 3 caracteres").max(50, "Nome deve ter no máximo 50 caracteres"),
  serviceName: z.string().min(1, "Preencha todos os campos obrigatórios").max(50, "O nome do serviço deve ter no máximo 50 caracteres"),
  isRecurring: z.boolean().default(false),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierEditModalProps {
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SupplierEditModal({ supplier, open, onOpenChange }: SupplierEditModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data: SupplierFormValues) => {
      const res = await apiRequest("PATCH", `/api/suppliers/${supplier.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Alterações salvas", description: "Fornecedor atualizado com sucesso.", className: "bg-emerald-50 text-emerald-900 border-emerald-200" });
      onOpenChange(false);
    },
  });

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: supplier.name, serviceName: supplier.serviceName, isRecurring: supplier.isRecurring },
  });

  const onSubmit = (data: SupplierFormValues) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Editar Fornecedor</DialogTitle>
          <DialogDescription>Atualize os dados deste fornecedor.</DialogDescription>
        </DialogHeader>
        <div className="bg-muted/30 p-3 rounded-lg text-xs mb-2">
          <p className="text-muted-foreground"><span className="text-destructive font-bold">*</span> Campos obrigatórios</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do fornecedor <span className="text-destructive font-bold">*</span></FormLabel>
                <FormControl><Input placeholder="Ex: Vivo" {...field} /></FormControl>
                <FormMessage className="text-destructive font-medium" />
              </FormItem>
            )} />
            <FormField control={form.control} name="serviceName" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Nome do serviço <span className="text-destructive font-bold">*</span></FormLabel>
                <FormControl>
                  <ServiceCombobox value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage className="text-destructive font-medium" />
              </FormItem>
            )} />
            <FormField control={form.control} name="isRecurring" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none"><FormLabel>É recorrente (mensal)?</FormLabel></div>
              </FormItem>
            )} />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
