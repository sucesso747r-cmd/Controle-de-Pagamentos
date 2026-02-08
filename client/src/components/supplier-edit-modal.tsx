import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore, Supplier } from "@/lib/store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const COMMON_SERVICES = [
  "Energia Elétrica", "Água e Esgoto", "Gás Encanado", "Internet",
  "Telefonia Móvel", "Telefonia Fixa", "Cartão de Crédito VISA",
  "Cartão de Crédito Mastercard", "Cartão de Crédito Elo",
  "Aluguel", "Condomínio", "IPTU", "Seguro", "Consultoria", "Manutenção"
];

const supplierSchema = z.object({
  name: z.string()
    .min(1, "Preencha todos os campos obrigatórios")
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
  serviceName: z.string()
    .min(1, "Preencha todos os campos obrigatórios")
    .max(50, "O nome do serviço deve ter no máximo 50 caracteres"),
  isRecurring: z.boolean().default(false),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierEditModalProps {
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SupplierEditModal({ supplier, open, onOpenChange }: SupplierEditModalProps) {
  const { updateSupplier, suppliers } = useStore();
  const { toast } = useToast();
  const [serviceComboOpen, setServiceComboOpen] = useState(false);

  const distinctServices = Array.from(new Set([...COMMON_SERVICES, ...suppliers.map(s => s.serviceName)]))
    .sort((a, b) => a.localeCompare(b));

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier.name,
      serviceName: supplier.serviceName,
      isRecurring: supplier.isRecurring,
    },
  });

  const onSubmit = (data: SupplierFormValues) => {
    updateSupplier(supplier.id, data);
    toast({
      title: "Alterações salvas",
      description: "Fornecedor atualizado com sucesso.",
      className: "bg-emerald-50 text-emerald-900 border-emerald-200",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Editar Fornecedor</DialogTitle>
          <DialogDescription>
            Atualize os dados deste fornecedor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/30 p-3 rounded-lg text-xs mb-2">
          <p className="text-muted-foreground"><span className="text-destructive font-bold">*</span> Campos obrigatórios</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do fornecedor <span className="text-destructive font-bold">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Vivo" {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive font-medium" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nome do serviço <span className="text-destructive font-bold">*</span></FormLabel>
                  <Popover open={serviceComboOpen} onOpenChange={setServiceComboOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={serviceComboOpen}
                          className={cn(
                            "w-full justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value || "Digite ou selecione um serviço"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar serviço..." 
                          onValueChange={(val) => form.setValue("serviceName", val)}
                        />
                        <CommandEmpty>Nenhum serviço encontrado. Pressione Enter para adicionar.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {distinctServices.map((service) => (
                            <CommandItem
                              key={service}
                              value={service}
                              onSelect={(currentValue) => {
                                field.onChange(currentValue);
                                setServiceComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === service ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {service}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-destructive font-medium" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      É recorrente (mensal)?
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
