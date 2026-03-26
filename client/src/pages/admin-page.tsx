import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  paymentsCount: number;
  suppliersCount: number;
  emailsSent: number;
  totalStorageBytes: number;
}

interface BackupEntry {
  filename: string;
  createdAt: string;
  sizeBytes: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

  const [emailOverride, setEmailOverride] = useState<number | null>(null);
  const [emailOverrideSetAt, setEmailOverrideSetAt] = useState<string | null>(null);
  const [emailOverrideInput, setEmailOverrideInput] = useState("");
  const [emailOverrideMsg, setEmailOverrideMsg] = useState<string | null>(null);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users");
    if (res.status === 401) {
      setLocation("/admin/login");
      return;
    }
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function fetchBackups() {
    const res = await fetch("/api/admin/backups");
    if (res.ok) {
      const data = await res.json();
      setBackups(data);
    }
  }

  async function fetchEmailOverride() {
    const res = await fetch("/api/admin/email-override");
    if (res.ok) {
      const data = await res.json();
      setEmailOverride(data.override);
      setEmailOverrideSetAt(data.setAt ?? null);
    }
  }

  async function handleSetEmailOverride() {
    const count = parseInt(emailOverrideInput, 10);
    if (isNaN(count) || count < 0) {
      setEmailOverrideMsg("Valor inválido");
      return;
    }
    const res = await fetch("/api/admin/email-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    if (res.ok) {
      const data = await res.json();
      setEmailOverride(count);
      setEmailOverrideSetAt(data.setAt ?? null);
      setEmailOverrideMsg(`Base definida: ${count} (emails enviados após este momento serão somados)`);
    } else {
      setEmailOverrideMsg("Erro ao definir override");
    }
  }

  async function handleClearEmailOverride() {
    const res = await fetch("/api/admin/email-override", { method: "DELETE" });
    if (res.ok) {
      setEmailOverride(null);
      setEmailOverrideSetAt(null);
      setEmailOverrideInput("");
      setEmailOverrideMsg("Override removido — usando contagem real do mês");
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchBackups();
    fetchEmailOverride();
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout");
    setLocation("/admin/login");
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    await fetchUsers();
  }

  async function handleBackup() {
    setBackupLoading(true);
    setBackupMsg(null);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBackupMsg(`Backup criado: ${data.filename}`);
        await fetchBackups();
      } else {
        const err = await res.json();
        setBackupMsg(`Erro: ${err.message}`);
      }
    } catch {
      setBackupMsg("Erro ao criar backup.");
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleDeleteBackup(filename: string) {
    try {
      await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`, { method: "DELETE" });
      await fetchBackups();
    } catch {
      // ignore
    }
  }

  async function handleRestore(filename: string) {
    setRestoreMsg(null);
    try {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        setRestoreMsg("Restauração concluída. Faça login novamente.");
        setTimeout(() => setLocation("/admin/login"), 3000);
      } else {
        const err = await res.json();
        setRestoreMsg(`Erro: ${err.message}`);
      }
    } catch {
      setRestoreMsg("Erro ao restaurar backup.");
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin — Usuários</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Backup & Restore */}
        <Card>
          <CardHeader>
            <CardTitle>Backup &amp; Restore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={handleBackup} disabled={backupLoading}>
                {backupLoading ? "Criando backup..." : "Fazer Backup"}
              </Button>
              {backupMsg && (
                <span className="text-sm text-muted-foreground">{backupMsg}</span>
              )}
            </div>
            {restoreMsg && (
              <p className="text-sm font-medium text-green-600">{restoreMsg}</p>
            )}
            {backups.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((b) => (
                    <TableRow key={b.filename}>
                      <TableCell className="font-mono text-sm">{b.filename}</TableCell>
                      <TableCell>
                        {new Date(b.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>{formatBytes(b.sizeBytes)}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBackup(b.filename)}
                        >
                          Deletar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setRestoreTarget(b.filename)}
                            >
                              Restaurar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar restauração</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação vai substituir todos os dados atuais pelo backup
                                selecionado. Todos os usuários serão desconectados. Continuar?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRestore(b.filename)}
                              >
                                Restaurar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {backups.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum backup encontrado.</p>
            )}
          </CardContent>
        </Card>

        {/* Email Counter Override */}
        <Card>
          <CardHeader>
            <CardTitle>Override — Contador de Emails (mês)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Override ativo:{" "}
              {emailOverride !== null ? (
                <>
                  <span className="font-semibold text-foreground">base {emailOverride}</span>
                  {emailOverrideSetAt && (
                    <span> + emails após {new Date(emailOverrideSetAt).toLocaleString("pt-BR")}</span>
                  )}
                </>
              ) : (
                "Nenhum (usando contagem real do mês)"
              )}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                type="number"
                min={0}
                value={emailOverrideInput}
                onChange={(e) => setEmailOverrideInput(e.target.value)}
                placeholder="Novo valor"
                className="w-40"
              />
              <Button onClick={handleSetEmailOverride}>Definir override</Button>
              {emailOverride !== null && (
                <Button variant="outline" onClick={handleClearEmailOverride}>
                  Limpar override
                </Button>
              )}
            </div>
            {emailOverrideMsg && (
              <p className="text-sm text-muted-foreground">{emailOverrideMsg}</p>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Pagamentos</TableHead>
                  <TableHead className="text-right">Fornecedores</TableHead>
                  <TableHead className="text-right">Emails Sent</TableHead>
                  <TableHead className="text-right">Arquivos</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">{user.paymentsCount}</TableCell>
                    <TableCell className="text-right">{user.suppliersCount}</TableCell>
                    <TableCell className="text-right">{user.emailsSent}</TableCell>
                    <TableCell className="text-right">{user.totalStorageBytes}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Deletar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso vai deletar permanentemente o usuário {user.email} e todos os
                              seus dados. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(user.id)}>
                              Deletar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
