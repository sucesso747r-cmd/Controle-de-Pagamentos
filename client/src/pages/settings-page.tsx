import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { FlaskConical, Mail, Loader2, ShieldCheck, MailCheck, BarChart3, Archive, Database } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [versionInfo, setVersionInfo] = useState<{ version: string; commit: string } | null>(null);

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((data) => setVersionInfo(data))
      .catch(() => {});
  }, []);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [isSending, setIsSending] = useState(false);

  const [destEmail, setDestEmail] = useState(user?.destEmail || "");
  const [sendCopy, setSendCopy] = useState(user?.sendCopy || false);
  const [copyType, setCopyType] = useState<"cc" | "bcc">((user?.copyType as "cc" | "bcc") || "cc");
  const [copyEmail, setCopyEmail] = useState(user?.copyEmail || "");
  const [initialYear, setInitialYearLocal] = useState((user?.initialYear || 2025).toString());
  const currentYearSuffix = new Date().getFullYear().toString().slice(-2);
  const [maintenanceYear, setMaintenanceYear] = useState(currentYearSuffix);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadConfirmed, setDownloadConfirmed] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  const { data: usageStats } = useQuery<UsageStatsData>({
    queryKey: ["/api/stats/usage"],
  });

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

  /* ARCHIVE FEATURE REMOVED
  const handleTestArchive = () => {
    toast({ title: "ZIP de teste gerado!", description: "Arquivos mantidos no sistema." });
  };
  */

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
            {/* <div className="space-y-4">
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
            </div> */}
            <Button onClick={handleSaveEmailConfig} className="w-full sm:w-auto" data-testid="button-save-email">Salvar Configurações de Email</Button>
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

        {usageStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-heading flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-500" />Uso do Sistema
              </CardTitle>
              <CardDescription>Consumo atual dos recursos da plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <Archive className="w-5 h-5 text-violet-500" />Manutenção
            </CardTitle>
            <CardDescription>Backup e limpeza de arquivos por ano.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select
                value={maintenanceYear}
                onValueChange={(val) => {
                  setMaintenanceYear(val);
                  setDownloadConfirmed(false);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const minYear = user?.initialYear || currentYear;
                    const years = [];
                    for (let y = currentYear; y >= minYear; y--) {
                      years.push(y);
                    }
                    return years.map((year) => {
                      const suffix = year.toString().slice(-2);
                      return (
                        <SelectItem key={suffix} value={suffix}>
                          {year}
                        </SelectItem>
                      );
                    });
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="gap-2"
                disabled={isDownloading}
                onClick={async () => {
                  setIsDownloading(true);
                  try {
                    const res = await fetch(`/api/backup/${maintenanceYear}`, { credentials: "include" });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `backup_20${maintenanceYear}.zip`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setDownloadConfirmed(true);
                  } catch {
                    toast({ variant: "destructive", title: "Erro ao gerar backup." });
                  } finally {
                    setIsDownloading(false);
                  }
                }}
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                {isDownloading ? "Gerando..." : "Baixar Backup ZIP"}
              </Button>

              <Button
                variant="destructive"
                className="gap-2"
                disabled={!downloadConfirmed}
                onClick={() => setShowCleanupDialog(true)}
              >
                Limpar Arquivos do Ano
              </Button>
            </div>
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

      <div className="pt-6 pb-2 space-y-1">
        <p className="text-xs text-muted-foreground text-center">
          {versionInfo ? `v${versionInfo.version} (${versionInfo.commit})` : ""}
        </p>
        <p className="text-xs text-muted-foreground text-center">
          © 2026 i9star.com.br — Todos os direitos reservados.
        </p>
      </div>

      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar limpeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá deletar os arquivos de fatura e comprovante do ano selecionado. Os registros de pagamento serão preservados. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/cleanup/${maintenanceYear}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                  const data = await res.json();
                  toast({ title: data.message || "Limpeza concluída." });
                  setDownloadConfirmed(false);
                } catch {
                  toast({ variant: "destructive", title: "Erro ao executar limpeza." });
                }
                setShowCleanupDialog(false);
              }}
            >
              Confirmar limpeza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
