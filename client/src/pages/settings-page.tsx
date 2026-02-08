import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Mail, Loader2, CheckCircle, ShieldCheck, MailCheck, Copy, Eye, EyeOff } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function SettingsPage() {
  const { user } = useStore();
  const { toast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [isSending, setIsSending] = useState(false);

  // Email Configuration State
  const [destEmail, setDestEmail] = useState("exemplo@empresa.com.br");
  const [sendCopy, setSendCopy] = useState(false);
  const [copyType, setCopyType] = useState<"cc" | "bcc">("cc");
  const [copyEmail, setCopyEmail] = useState("");

  const handleSaveEmailConfig = () => {
    if (!destEmail.includes("@")) {
      toast({ variant: "destructive", title: "⚠️ Erro ao salvar. Verifique os emails e tente novamente." });
      return;
    }
    toast({ title: "✅ Configurações de email salvas com sucesso!" });
  };

  const handleTestArchive = () => {
    toast({
      title: "✅ ZIP de teste gerado!",
      description: "Arquivos mantidos no sistema.",
    });
  };

  const handleSendTestEmail = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setShowEmailModal(false);
      toast({
        title: `✅ Email de teste enviado para ${testEmail}!`,
        description: "Verifique sua caixa de entrada.",
      });
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-heading">Configurações</h2>
        <p className="text-muted-foreground">Gerencie seu perfil e realize testes do sistema.</p>
      </div>

      <div className="grid gap-6">
        {/* PERFIL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Nome:</Label>
                <Input value={user?.name || "Usuário"} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Email:</Label>
                <Input value={user?.email || "email@exemplo.com"} readOnly className="bg-muted/50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EMAIL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <MailCheck className="w-5 h-5 text-emerald-500" />
              Email
            </CardTitle>
            <CardDescription>Configure como você recebe os comprovantes de pagamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dest-email-config">Email de destino para comprovantes</Label>
              <Input 
                id="dest-email-config" 
                type="email"
                value={destEmail}
                onChange={(e) => setDestEmail(e.target.value)}
                placeholder="exemplo@empresa.com.br"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="send-copy" 
                  checked={sendCopy}
                  onCheckedChange={(val) => setSendCopy(val as boolean)}
                />
                <Label htmlFor="send-copy" className="cursor-pointer">Enviar cópia?</Label>
              </div>

              {sendCopy && (
                <div className="space-y-4 pl-6 border-l-2 border-muted animate-in fade-in slide-in-from-left-2 duration-200">
                  <RadioGroup value={copyType} onValueChange={(val) => setCopyType(val as "cc" | "bcc")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cc" id="cc-opt" />
                      <Label htmlFor="cc-opt" className="cursor-pointer">CC (com cópia visível)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bcc" id="bcc-opt" />
                      <Label htmlFor="bcc-opt" className="cursor-pointer">CCO (cópia oculta)</Label>
                    </div>
                  </RadioGroup>

                  <div className="space-y-2">
                    <Label htmlFor="copy-email">Email para CC/CCO</Label>
                    <Input 
                      id="copy-email" 
                      type="email"
                      value={copyEmail}
                      onChange={(e) => setCopyEmail(e.target.value)}
                      placeholder="outro@empresa.com.br"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleSaveEmailConfig} className="w-full sm:w-auto">
              Salvar Configurações de Email
            </Button>
          </CardContent>
        </Card>

        {/* TESTES */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-orange-500" />
              Testes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline" 
              className="flex-1 gap-2 border-orange-200 bg-orange-50/30 text-orange-700 hover:bg-orange-50"
              onClick={handleTestArchive}
            >
              <FlaskConical className="w-4 h-4" />
              Testar Arquivamento (últimos 2 meses)
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 gap-2 border-blue-200 bg-blue-50/30 text-blue-700 hover:bg-blue-50"
              onClick={() => setShowEmailModal(true)}
            >
              <Mail className="w-4 h-4" />
              Testar Envio de Email
            </Button>
          </CardContent>
        </Card>

        {/* PLANO */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-xl font-heading text-muted-foreground">Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div>
                <p className="font-semibold">Plano Atual: Starter</p>
                <p className="text-sm text-muted-foreground">Gratuito para uso individual</p>
              </div>
              <CheckCircle className="text-emerald-500 w-5 h-5" />
            </div>
            
            <div className="opacity-50 grayscale pointer-events-none">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div>
                  <p className="font-semibold text-muted-foreground">Pro Version</p>
                  <p className="text-sm">(recursos premium em breve)</p>
                </div>
                <Button variant="secondary" size="sm">Upgrade</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Test Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Testar Envio de Email</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dest-email">Email de destino:</Label>
              <Input 
                id="dest-email" 
                value={testEmail} 
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
              />
            </div>
            <div className="bg-muted p-3 rounded text-xs space-y-2">
              <p className="font-bold uppercase text-muted-foreground">Conteúdo do Teste:</p>
              <p>Fornecedor: Exemplo Fornecedor Ltda</p>
              <p>Serviço: Serviço de Exemplo</p>
              <p>Valor pago: R$ 100,00</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>Cancelar</Button>
            <Button onClick={handleSendTestEmail} disabled={isSending} className="gap-2">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar Email de Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
