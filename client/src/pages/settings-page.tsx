import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Mail, Loader2, CheckCircle, ShieldCheck, MailCheck, BarChart3, Key, XCircle, ExternalLink } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [isSending, setIsSending] = useState(false);

  const [destEmail, setDestEmail] = useState(user?.destEmail || "");
  const [sendCopy, setSendCopy] = useState(user?.sendCopy || false);
  const [copyType, setCopyType] = useState<"cc" | "bcc">((user?.copyType as "cc" | "bcc") || "cc");
  const [copyEmail, setCopyEmail] = useState(user?.copyEmail || "");
  const [initialYear, setInitialYearLocal] = useState((user?.initialYear || 2025).toString());
  const [resendApiKey, setResendApiKey] = useState("");
  const [emailProvider, setEmailProvider] = useState(user?.emailProvider || "none");
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isDisconnectingGmail, setIsDisconnectingGmail] = useState(false);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const handleSaveEmailConfig = () => {
    if (!destEmail.includes("@")) {
      toast({ variant: "destructive", title: "Erro ao salvar. Verifique os emails e tente novamente." });
      return;
    }
    updateSettingsMutation.mutate({ destEmail, sendCopy, copyType, copyEmail }, {
      onSuccess: () => toast({ title: "Configurações de email salvas com sucesso!" }),
    });
  };

  const handleSaveDataConfig = () => {
    updateSettingsMutation.mutate({ initialYear: parseInt(initialYear) }, {
      onSuccess: () => toast({ title: "Ano inicial configurado com sucesso!" }),
    });
  };

  const handleTestArchive = () => {
    toast({ title: "ZIP de teste gerado!", description: "Arquivos mantidos no sistema." });
  };

  const handleSendTestEmail = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setShowEmailModal(false);
      toast({ title: `Email de teste enviado para ${testEmail}!`, description: "Verifique sua caixa de entrada." });
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-heading">Configurações</h2>
        <p className="text-muted-foreground">Gerencie seu perfil e realize testes do sistema.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Nome:</Label>
                <Input value={`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.email?.split('@')[0] || "Usuário"} readOnly className="bg-muted/50" data-testid="text-user-name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Email:</Label>
                <Input value={user?.email || ""} readOnly className="bg-muted/50" data-testid="text-user-email" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <MailCheck className="w-5 h-5 text-emerald-500" />Email
            </CardTitle>
            <CardDescription>Configure como você recebe os comprovantes de pagamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dest-email-config">Email de destino para comprovantes</Label>
              <Input id="dest-email-config" type="email" value={destEmail} onChange={(e) => setDestEmail(e.target.value)} placeholder="exemplo@empresa.com.br" data-testid="input-dest-email" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="send-copy" checked={sendCopy} onCheckedChange={(val) => setSendCopy(val as boolean)} data-testid="checkbox-send-copy" />
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
                    <Input id="copy-email" type="email" value={copyEmail} onChange={(e) => setCopyEmail(e.target.value)} placeholder="outro@empresa.com.br" />
                  </div>
                </div>
              )}
            </div>
            <Button onClick={handleSaveEmailConfig} className="w-full sm:w-auto" data-testid="button-save-email">Salvar Configurações de Email</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />Provedor de Email
            </CardTitle>
            <CardDescription>Escolha como enviar comprovantes: Gmail (OAuth, gratuito) ou Resend API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={emailProvider} onValueChange={setEmailProvider}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="provider-none" />
                <Label htmlFor="provider-none" className="cursor-pointer">Nenhum (desativado)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gmail" id="provider-gmail" />
                <Label htmlFor="provider-gmail" className="cursor-pointer">Gmail (gratuito)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="resend" id="provider-resend" />
                <Label htmlFor="provider-resend" className="cursor-pointer">Resend API</Label>
              </div>
            </RadioGroup>

            {emailProvider === "gmail" && (
              <div className="space-y-4 pl-4 border-l-2 border-amber-200 animate-in fade-in slide-in-from-left-2 duration-200">
                {(user as any)?.gmailConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800" data-testid="text-gmail-connected">Gmail conectado como: {user?.gmailEmail}</p>
                        {user?.gmailConnectedAt && (
                          <p className="text-xs text-emerald-600">Conectado em {new Date(user.gmailConnectedAt).toLocaleDateString("pt-BR")}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={isDisconnectingGmail}
                      data-testid="button-disconnect-gmail"
                      onClick={async () => {
                        setIsDisconnectingGmail(true);
                        try {
                          await apiRequest("POST", "/api/gmail/disconnect");
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                          setEmailProvider("none");
                          toast({ title: "Gmail desconectado com sucesso." });
                        } catch {
                          toast({ variant: "destructive", title: "Erro ao desconectar Gmail." });
                        } finally {
                          setIsDisconnectingGmail(false);
                        }
                      }}
                    >
                      {isDisconnectingGmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Desconectar Gmail
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Conecte sua conta Gmail para enviar comprovantes diretamente. Usamos autorização segura do Google (OAuth) — nenhuma senha é armazenada.
                    </p>
                    <Button
                      className="gap-2"
                      disabled={isConnectingGmail}
                      data-testid="button-connect-gmail"
                      onClick={async () => {
                        setIsConnectingGmail(true);
                        try {
                          const res = await apiRequest("GET", "/api/gmail/auth");
                          const { url } = await res.json();
                          window.location.href = url;
                        } catch {
                          toast({ variant: "destructive", title: "Erro ao iniciar autorização do Gmail. Verifique se as credenciais OAuth estão configuradas." });
                          setIsConnectingGmail(false);
                        }
                      }}
                    >
                      {isConnectingGmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      Conectar Gmail
                    </Button>
                  </div>
                )}
              </div>
            )}

            {emailProvider === "resend" && (
              <div className="space-y-4 pl-4 border-l-2 border-amber-200 animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="space-y-2">
                  <Label htmlFor="resend-api-key">Chave da API Resend</Label>
                  <Input id="resend-api-key" type="password" value={resendApiKey} onChange={(e) => setResendApiKey(e.target.value)} placeholder={(user as any)?.hasResendApiKey ? "••••••••••••••••••••••••••••" : "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} data-testid="input-resend-api-key" />
                  <p className="text-xs text-muted-foreground">
                    Obtenha em <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">resend.com</a>.
                  </p>
                  {(user as any)?.hasResendApiKey && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Chave configurada
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                const data: any = { emailProvider };
                if (emailProvider === "resend") {
                  if (resendApiKey.trim()) {
                    data.resendApiKey = resendApiKey.trim();
                  }
                }
                updateSettingsMutation.mutate(data, {
                  onSuccess: () => {
                    toast({ title: "Provedor de email salvo com sucesso!" });
                    setResendApiKey("");
                  },
                });
              }}
              className="w-full sm:w-auto"
              data-testid="button-save-provider"
            >
              Salvar Provedor
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />Dados
            </CardTitle>
            <CardDescription>Configure parâmetros de exibição dos dados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="initial-year">Ano inicial dos dados</Label>
              <Select value={initialYear} onValueChange={setInitialYearLocal}>
                <SelectTrigger id="initial-year" className="w-full sm:w-[200px]" data-testid="select-initial-year">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (<SelectItem key={y} value={y.toString()}>{y}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selecione o ano mais antigo para o qual você tem dados. Anos anteriores não serão exibidos na navegação.</p>
            </div>
            <Button onClick={handleSaveDataConfig} className="w-full sm:w-auto" data-testid="button-save-data">Salvar</Button>
          </CardContent>
        </Card>

        {/* Testes section - hidden for now
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-orange-500" />Testes
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="flex-1 gap-2 border-orange-200 bg-orange-50/30 text-orange-700 hover:bg-orange-50" onClick={handleTestArchive} data-testid="button-test-archive">
              <FlaskConical className="w-4 h-4" />Testar Arquivamento (últimos 2 meses)
            </Button>
            <Button variant="outline" className="flex-1 gap-2 border-orange-200 bg-orange-50/30 text-orange-700 hover:bg-orange-50" onClick={() => setShowEmailModal(true)} data-testid="button-test-email">
              <Mail className="w-4 h-4" />Testar Envio de Email
            </Button>
          </CardContent>
        </Card>
        */}

        {/* Planos section - hidden for now
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-xl font-heading text-muted-foreground">Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div>
                <p className="font-semibold" data-testid="text-plan">Plano Atual: {user?.subscriptionPlan || "Starter"}</p>
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
        */}
      </div>

      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="font-heading">Testar Envio de Email</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dest-email">Email de destino:</Label>
              <Input id="dest-email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="seu-email@exemplo.com" />
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
