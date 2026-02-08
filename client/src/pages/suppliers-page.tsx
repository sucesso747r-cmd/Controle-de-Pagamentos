import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useStore, Supplier } from "@/lib/store";
import { Plus, Search, Pencil, Trash2, Building2, Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useStore();
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [serviceComboOpen, setServiceComboOpen] = useState(false);
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const distinctServices = Array.from(new Set([...COMMON_SERVICES, ...suppliers.map(s => s.serviceName)]))
    .sort((a, b) => a.localeCompare(b));

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      serviceName: "",
      isRecurring: false,
    },
  });

  const onSubmit = (data: SupplierFormValues) => {
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, data);
      toast({
        title: "Alterações salvas",
        description: "Fornecedor atualizado com sucesso.",
        className: "bg-emerald-50 text-emerald-900 border-emerald-200",
      });
    } else {
      addSupplier(data);
      toast({
        title: "✅ Fornecedor cadastrado",
        description: `${data.name} foi cadastrado com sucesso.`,
        duration: 3000,
        className: "bg-emerald-50 text-emerald-900 border-emerald-200",
      });
    }
    setOpen(false);
    setEditingSupplier(null);
    form.reset();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.reset({
      name: supplier.name,
      serviceName: supplier.serviceName,
      isRecurring: supplier.isRecurring,
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteSupplier(id);
    setSupplierToDelete(null);
    toast({
      description: "Fornecedor removido",
    });
  };

  const sortedSuppliers = [...suppliers]
    .filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.serviceName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-heading">Gerenciar Fornecedores</h2>
          <p className="text-muted-foreground">Adicione, edite ou remova seus prestadores de serviço.</p>
        </div>
        
        <Button className="gap-2" onClick={() => {
          setEditingSupplier(null);
          form.reset({ name: "", serviceName: "", isRecurring: false });
          setOpen(true);
        }}>
          <Plus className="w-4 h-4" />
          Adicionar Fornecedor
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setEditingSupplier(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor abaixo.
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSupplier ? "Salvar Alterações" : "Adicionar Fornecedor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="flex items-center py-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            ) : (
              sortedSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="group">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Building2 className="w-4 h-4" />
                      </div>
                      {supplier.name}
                    </div>
                  </TableCell>
                  <TableCell>{supplier.serviceName}</TableCell>
                  <TableCell>
                    {supplier.isRecurring ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                        MENSAL
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">
                        EVENTUAL
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(supplier)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setSupplierToDelete(supplier.id)}
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!supplierToDelete} onOpenChange={(val) => !val && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso não deleta os pagamentos registrados, apenas o fornecedor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => supplierToDelete && handleDelete(supplierToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
