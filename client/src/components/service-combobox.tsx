import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  createdAt: string;
}

interface ServiceComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function ServiceCombobox({ value, onChange, className }: ServiceComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/services", { name });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro ao criar serviço");
      }
      return await res.json();
    },
    onSuccess: (newService: Service) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      onChange(newService.name);
      setOpen(false);
      setSearchValue("");
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: err.message });
    },
  });

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const exactMatch = services.some(
    (s) => s.name.toLowerCase() === searchValue.trim().toLowerCase()
  );

  const showCreateOption = searchValue.trim().length > 0 && !exactMatch;

  const handleCreate = () => {
    if (searchValue.trim()) {
      createMutation.mutate(searchValue.trim());
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
          data-testid="button-service-combobox"
        >
          {value || "Digite ou selecione um serviço"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar serviço..."
            value={searchValue}
            onValueChange={setSearchValue}
            data-testid="input-service-search"
          />
          <CommandList>
            <CommandEmpty>
              {searchValue.trim() ? null : "Nenhum serviço cadastrado."}
            </CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {filtered.map((service) => (
                <CommandItem
                  key={service.id}
                  value={service.name}
                  onSelect={() => {
                    onChange(service.name);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  data-testid={`service-option-${service.id}`}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === service.name ? "opacity-100" : "opacity-0")} />
                  {service.name}
                </CommandItem>
              ))}
              {showCreateOption && (
                <CommandItem
                  value={`create-${searchValue}`}
                  onSelect={handleCreate}
                  className="text-primary"
                  data-testid="button-create-service"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Criar novo: {searchValue.trim()}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
