import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSupplierSchema, insertServiceSchema, updateSettingsSchema, payments, files, emailLogs } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { Resend } from "resend";
import XLSX from "xlsx";
import archiver from "archiver";
import { db } from "./db";
import { eq, sql, like } from "drizzle-orm";
// Gmail OAuth imports — commented out along with Gmail OAuth code
// import { google } from "googleapis";
// import { OAuth2Client } from "google-auth-library";

// Gmail OAuth commented out — app uses Replit Auth + Resend for email.
// function getGmailOAuthClient(): OAuth2Client {
//   const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
//   const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
//   if (!clientId || !clientSecret) {
//     throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured");
//   }
//   const redirectUri = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : "http://localhost:5000"}/api/gmail/callback`;
//   return new OAuth2Client(clientId, clientSecret, redirectUri);
// }

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const blocked = [".exe", ".bat", ".sh", ".cmd", ".msi", ".com"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blocked.includes(ext)) {
      cb(new Error("Arquivos executáveis não são permitidos."));
      return;
    }
    cb(null, true);
  },
});

async function saveUploadedFile(file: Express.Multer.File, ownerId: string): Promise<string> {
  const base64Data = file.buffer.toString("base64");
  const dbFile = await storage.saveFile(file.originalname, file.mimetype, base64Data, ownerId);
  return `/api/files/${dbFile.id}`;
}

function getUserId(req: Request): string {
  return (req.user as any)?.id;
}

const DEFAULT_SERVICES = [
  "Energia Elétrica", "Água e Esgoto", "Gás Encanado", "Internet",
  "Telefonia Móvel", "Telefonia Fixa", "Cartão de Crédito VISA",
  "Cartão de Crédito Mastercard", "Cartão de Crédito Elo",
  "Aluguel", "Condomínio", "IPTU", "Seguro", "Consultoria", "Manutenção"
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  const existing = await storage.getServices();
  if (existing.length === 0) {
    for (const name of DEFAULT_SERVICES) {
      try { await storage.createService({ name }); } catch {}
    }
  }

  app.get("/api/files/:id", isAuthenticated, async (req, res) => {
    const fileId = req.params.id as string;
    const dbFile = await storage.getFile(fileId);
    if (!dbFile) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }
    const userId = getUserId(req);
    if (dbFile.ownerId !== userId) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const buffer = Buffer.from(dbFile.data, "base64");
    res.set("Content-Type", dbFile.mimeType);
    res.set("Content-Disposition", `inline; filename="${dbFile.filename}"`);
    res.send(buffer);
  });

  // SETTINGS
  app.patch("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = updateSettingsSchema.parse(req.body);
      const { gmailRefreshToken: _dropped1, gmailEmail: _dropped2, gmailConnectedAt: _dropped3, ...safeData } = data as any;

      if (safeData.emailProvider === "gmail") {
        return res.status(400).json({ message: "Gmail não está disponível no momento. Use Resend como provedor de email." });
      }

      const user = await storage.updateUserSettings(userId, safeData);
      const { resendApiKey: _r, gmailRefreshToken: _t, ...safeUser } = user as any;
      res.json({
        ...safeUser,
        hasResendApiKey: !!_r,
        gmailConnected: !!_t,
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // GMAIL OAUTH — commented out, app uses Replit Auth + Resend for email.
  // app.get("/api/gmail/auth", isAuthenticated, async (_req, res) => {
  //   try {
  //     const oauth2Client = getGmailOAuthClient();
  //     const authUrl = oauth2Client.generateAuthUrl({
  //       access_type: "offline",
  //       prompt: "consent",
  //       scope: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.email"],
  //     });
  //     res.json({ url: authUrl });
  //   } catch (err: any) {
  //     res.status(500).json({ message: err.message });
  //   }
  // });
  //
  // app.get("/api/gmail/callback", isAuthenticated, async (req, res) => {
  //   try {
  //     const code = req.query.code as string;
  //     const error = req.query.error as string;
  //
  //     if (error) {
  //       return res.redirect("/?gmail_error=denied");
  //     }
  //     if (!code) {
  //       return res.redirect("/?gmail_error=no_code");
  //     }
  //
  //     const userId = getUserId(req);
  //
  //     const oauth2Client = getGmailOAuthClient();
  //     const { tokens } = await oauth2Client.getToken(code);
  //
  //     if (!tokens.refresh_token) {
  //       return res.redirect("/?gmail_error=no_refresh_token");
  //     }
  //
  //     oauth2Client.setCredentials(tokens);
  //     const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  //     const { data: userInfo } = await oauth2.userinfo.get();
  //
  //     await storage.updateUserSettings(userId, {
  //       gmailRefreshToken: tokens.refresh_token,
  //       gmailEmail: userInfo.email || undefined,
  //       gmailConnectedAt: new Date(),
  //       emailProvider: "gmail",
  //     } as any);
  //
  //     res.redirect("/?gmail_connected=true");
  //   } catch (err: any) {
  //     console.error("Gmail OAuth callback error:", err);
  //     res.redirect("/?gmail_error=token_exchange_failed");
  //   }
  // });
  //
  // app.post("/api/gmail/disconnect", isAuthenticated, async (req, res) => {
  //   try {
  //     const userId = getUserId(req);
  //     const user = await storage.getUser(userId);
  //
  //     if (user?.gmailRefreshToken) {
  //       try {
  //         const oauth2Client = getGmailOAuthClient();
  //         await oauth2Client.revokeToken(user.gmailRefreshToken);
  //       } catch {}
  //     }
  //
  //     await storage.updateUserSettings(userId, {
  //       gmailRefreshToken: null,
  //       gmailEmail: null,
  //       gmailConnectedAt: null,
  //       emailProvider: "none",
  //     } as any);
  //
  //     res.json({ ok: true });
  //   } catch (err: any) {
  //     res.status(500).json({ message: err.message });
  //   }
  // });

  // SERVICES
  app.get("/api/services", isAuthenticated, async (_req, res) => {
    const list = await storage.getServices();
    res.json(list);
  });

  app.post("/api/services", isAuthenticated, async (req, res) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      if (!data.name.trim()) {
        return res.status(400).json({ message: "Nome do serviço é obrigatório" });
      }
      const existing = await storage.getServices();
      const duplicate = existing.find(s => s.name.toLowerCase() === data.name.trim().toLowerCase());
      if (duplicate) {
        return res.status(400).json({ message: "Serviço já existe" });
      }
      const service = await storage.createService({ name: data.name.trim() });
      res.json(service);
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Serviço já existe" });
      }
      res.status(400).json({ message: err.message || "Erro ao criar serviço" });
    }
  });

  // SUPPLIERS
  app.get("/api/suppliers", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const list = await storage.getSuppliers(userId);
    res.json(list);
  });

  app.post("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier({ ...data, ownerId: userId });
      res.json(supplier);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const userId = getUserId(req);
      const supplier = await storage.updateSupplier(id, userId, req.body);
      if (!supplier) return res.status(404).json({ message: "Fornecedor não encontrado" });
      res.json(supplier);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    const id = req.params.id as string;
    const userId = getUserId(req);
    await storage.deleteSupplier(id, userId);
    res.json({ ok: true });
  });

  // PAYMENTS
  app.get("/api/payments", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const list = await storage.getPayments(userId);
    res.json(list);
  });

  app.post("/api/payments", isAuthenticated, upload.fields([
    { name: "fatura", maxCount: 1 },
    { name: "comprovante", maxCount: 1 },
  ]), async (req, res) => {
    try {
      const userId = getUserId(req);
      const idempotencyKey = req.body.idempotencyKey as string | undefined;

      if (idempotencyKey) {
        const existing = await storage.getPaymentByIdempotencyKey(idempotencyKey, userId);
        if (existing) {
          return res.json(existing);
        }
      }

      const uploadedFiles = req.files as { [key: string]: Express.Multer.File[] };
      const faturaFile = uploadedFiles?.fatura?.[0];
      const comprovanteFile = uploadedFiles?.comprovante?.[0];

      const fileUrl = faturaFile ? await saveUploadedFile(faturaFile, userId) : null;
      const receiptUrl = comprovanteFile ? await saveUploadedFile(comprovanteFile, userId) : null;

      const paymentData = {
        supplierId: req.body.supplierId,
        amount: parseFloat(req.body.amount),
        monthYear: req.body.monthYear,
        pixKey: req.body.pixKey || null,
        dueDay: req.body.dueDay ? parseInt(req.body.dueDay) : null,
        status: req.body.status || "paid",
        fileUrl,
        receiptUrl,
        ownerId: userId,
        idempotencyKey: idempotencyKey || null,
      };

      const payment = await storage.createPayment(paymentData);
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/payments/:id", isAuthenticated, upload.fields([
    { name: "fatura", maxCount: 1 },
    { name: "comprovante", maxCount: 1 },
  ]), async (req, res) => {
    try {
      const pid = req.params.id as string;
      const userId = getUserId(req);
      const uploadedFiles = req.files as { [key: string]: Express.Multer.File[] };
      const faturaFile = uploadedFiles?.fatura?.[0];
      const comprovanteFile = uploadedFiles?.comprovante?.[0];

      const updateData: any = {};
      if (req.body.amount) updateData.amount = parseFloat(req.body.amount);
      if (req.body.monthYear) updateData.monthYear = req.body.monthYear;
      if (req.body.pixKey !== undefined) updateData.pixKey = req.body.pixKey || null;
      if (req.body.dueDay !== undefined) updateData.dueDay = req.body.dueDay ? parseInt(req.body.dueDay) : null;
      if (req.body.status) updateData.status = req.body.status;
      if (faturaFile) updateData.fileUrl = await saveUploadedFile(faturaFile, userId);
      if (comprovanteFile) updateData.receiptUrl = await saveUploadedFile(comprovanteFile, userId);

      const payment = await storage.updatePayment(pid, userId, updateData);
      if (!payment) return res.status(404).json({ message: "Pagamento não encontrado" });
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/payments/:id", isAuthenticated, async (req, res) => {
    const did = req.params.id as string;
    const userId = getUserId(req);
    const payment = await storage.getPayment(did, userId);
    if (payment) {
      if (payment.fileUrl && payment.fileUrl.startsWith("/api/files/")) {
        const fileId = payment.fileUrl.replace("/api/files/", "");
        try { await storage.deleteFile(fileId); } catch {}
      }
      if (payment.receiptUrl && payment.receiptUrl.startsWith("/api/files/")) {
        const fileId = payment.receiptUrl.replace("/api/files/", "");
        try { await storage.deleteFile(fileId); } catch {}
      }
    }
    await storage.deletePayment(did, userId);
    res.json({ ok: true });
  });

  /* ARCHIVE FEATURE REMOVED
  app.post("/api/payments/archive/:year", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const yearSuffix = (req.params.year as string).slice(-2);
    await storage.archiveYear(userId, yearSuffix);
    res.json({ ok: true });
  });
  */

  app.post("/api/payments/:id/send-receipt", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const paymentId = req.params.id as string;

      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: "Usuário não encontrado" });

      if (!user.destEmail) {
        return res.status(400).json({ message: "Configure os emails de destino nas Configurações." });
      }

      const payment = await storage.getPayment(paymentId, userId);
      if (!payment) return res.status(404).json({ message: "Pagamento não encontrado" });

      const supplier = await storage.getSupplier(payment.supplierId, userId);
      if (!supplier) return res.status(404).json({ message: "Fornecedor não encontrado" });

      const attachments: { filename: string; content: Buffer }[] = [];

      if (payment.fileUrl && payment.fileUrl.startsWith("/api/files/")) {
        const fileId = payment.fileUrl.replace("/api/files/", "");
        const dbFile = await storage.getFile(fileId);
        if (dbFile) {
          const ext = path.extname(dbFile.filename) || ".pdf";
          attachments.push({
            filename: `fatura_${supplier.name}_${payment.monthYear}${ext}`,
            content: Buffer.from(dbFile.data, "base64"),
          });
        }
      }

      if (payment.receiptUrl && payment.receiptUrl.startsWith("/api/files/")) {
        const fileId = payment.receiptUrl.replace("/api/files/", "");
        const dbFile = await storage.getFile(fileId);
        if (dbFile) {
          const ext = path.extname(dbFile.filename) || ".pdf";
          attachments.push({
            filename: `comprovante_${supplier.name}_${payment.monthYear}${ext}`,
            content: Buffer.from(dbFile.data, "base64"),
          });
        }
      }

      if (attachments.length === 0) {
        return res.status(400).json({ message: "Fatura ou comprovante não encontrado." });
      }

      const formatCurrency = (val: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

      const subject = `Comprovante de ${supplier.name} ${supplier.serviceName} ${payment.monthYear}`;
      const body = `Fornecedor: ${supplier.name}\nServiço: ${supplier.serviceName}\nValor: ${formatCurrency(payment.amount)}\nFatura e Comprovante: Ver anexos`;

      const recipients = user.destEmail.split(",").map((e: string) => e.trim()).filter(Boolean);
      const cc: string[] = [];
      const bcc: string[] = [];

      if (user.sendCopy && user.copyEmail) {
        const copyEmails = user.copyEmail.split(",").map((e: string) => e.trim()).filter(Boolean);
        if (user.copyType === "bcc") {
          bcc.push(...copyEmails);
        } else {
          cc.push(...copyEmails);
        }
      }

      // Gmail sending branch commented out — app uses Resend for email.
      // if (provider === "gmail") {
      //   if (!user.gmailRefreshToken) {
      //     return res.status(401).json({ message: "Gmail não conectado. Conecte sua conta Gmail nas Configurações." });
      //   }
      //   try {
      //     const oauth2Client = getGmailOAuthClient();
      //     oauth2Client.setCredentials({ refresh_token: user.gmailRefreshToken });
      //     const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      //     const boundary = `boundary_${randomUUID()}`;
      //     const fromHeader = `${user.firstName || "Pagamentos"} <${user.gmailEmail}>`;
      //     const toHeader = recipients.join(", ");
      //     let rawEmail = [
      //       `From: ${fromHeader}`,
      //       `To: ${toHeader}`,
      //       ...(cc.length > 0 ? [`Cc: ${cc.join(", ")}`] : []),
      //       ...(bcc.length > 0 ? [`Bcc: ${bcc.join(", ")}`] : []),
      //       `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
      //       `MIME-Version: 1.0`,
      //       `Content-Type: multipart/mixed; boundary="${boundary}"`,
      //       ``,
      //       `--${boundary}`,
      //       `Content-Type: text/plain; charset="UTF-8"`,
      //       `Content-Transfer-Encoding: base64`,
      //       ``,
      //       Buffer.from(body).toString("base64"),
      //     ].join("\r\n");
      //     for (const att of attachments) {
      //       rawEmail += [
      //         ``,
      //         `--${boundary}`,
      //         `Content-Type: application/octet-stream; name="${att.filename}"`,
      //         `Content-Disposition: attachment; filename="${att.filename}"`,
      //         `Content-Transfer-Encoding: base64`,
      //         ``,
      //         att.content.toString("base64"),
      //       ].join("\r\n");
      //     }
      //     rawEmail += `\r\n--${boundary}--`;
      //     const encodedMessage = Buffer.from(rawEmail)
      //       .toString("base64")
      //       .replace(/\+/g, "-")
      //       .replace(/\//g, "_")
      //       .replace(/=+$/, "");
      //     await gmail.users.messages.send({
      //       userId: "me",
      //       requestBody: { raw: encodedMessage },
      //     });
      //   } catch (gmailErr: any) {
      //     console.error("Gmail API error:", gmailErr);
      //     if (gmailErr?.code === 401 || gmailErr?.message?.includes("invalid_grant")) {
      //       await storage.updateUserSettings(userId, {
      //         gmailRefreshToken: null,
      //         gmailConnectedAt: null,
      //       } as any);
      //       return res.status(401).json({ message: "Autorização do Gmail expirada. Reconecte sua conta nas Configurações." });
      //     }
      //     return res.status(500).json({ message: "Erro ao enviar email via Gmail. Tente novamente." });
      //   }
      // } else
      {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          return res.status(500).json({ message: "Serviço de email não configurado. Contate o administrador." });
        }

        const resend = new Resend(apiKey);
        const fromEmail = `${user.firstName || "Pagamentos"} <noreply@meuspagamentos.i9star.com.br>`;

        const { error } = await resend.emails.send({
          from: fromEmail,
          to: recipients,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject,
          text: body,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
          })),
        });

        if (error) {
          console.error("Resend error:", error);
          const resendError = error as any;
          if (resendError?.statusCode === 403 || resendError?.message?.includes("verify a domain")) {
            return res.status(400).json({ message: "Domínio não verificado no Resend. Verifique um domínio em resend.com/domains ou envie apenas para o email da conta Resend." });
          }
          return res.status(500).json({ message: "Erro ao enviar email. Tente novamente." });
        }

        await db.update(payments).set({ emailSentAt: new Date() }).where(eq(payments.id, paymentId));
        await db.insert(emailLogs).values({ userId, paymentId });
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Send receipt error:", err);
      res.status(500).json({ message: "Erro ao enviar email. Tente novamente." });
    }
  });

  app.get("/api/payments/export/:year", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const year = req.params.year as string;
      const yearSuffix = year.slice(-2);

      const userSuppliers = await storage.getSuppliers(userId);
      const userPayments = await storage.getPayments(userId);

      const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

      const rows = userSuppliers.map((supplier) => {
        const row: Record<string, string | number> = {
          Fornecedor: supplier.name,
          "Serviço": supplier.serviceName,
        };
        months.forEach((m) => {
          const monthYear = `${m}${yearSuffix}`;
          const payment = userPayments.find(
            (p) => p.supplierId === supplier.id && p.monthYear === monthYear
          );
          row[`${m}${yearSuffix}`] = payment ? payment.amount : "";
        });
        return row;
      });

      const totalRow: Record<string, string | number> = { Fornecedor: "TOTAL", "Serviço": "" };
      months.forEach((m) => {
        const monthYear = `${m}${yearSuffix}`;
        const total = userPayments
          .filter((p) => p.monthYear === monthYear)
          .reduce((acc, p) => acc + p.amount, 0);
        totalRow[`${m}${yearSuffix}`] = total || "";
      });
      rows.push(totalRow);

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Pagamentos ${year}`);

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", `attachment; filename=pagamentos_${year}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (err: any) {
      console.error("Export error:", err);
      res.status(500).json({ message: "Erro ao exportar planilha." });
    }
  });

  app.get("/api/stats/usage", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      const dbSizeResult = await db.execute(
        sql`SELECT pg_database_size(current_database()) AS size`
      );
      const dbSizeBytes = Number(dbSizeResult.rows[0].size);

      const filesSizeResult = await db.execute(
        sql`SELECT pg_total_relation_size('files') AS size`
      );
      const filesSizeBytes = Number(filesSizeResult.rows[0].size);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const emailCountResult = await db.execute(
        sql`SELECT COUNT(*) AS count FROM email_logs WHERE sent_at >= ${firstDayOfMonth}`
      );
      const emailCount = Number(emailCountResult.rows[0].count);

      res.json({
        db: { bytes: dbSizeBytes, limitBytes: 1 * 1024 * 1024 * 1024 },
        files: { bytes: filesSizeBytes, limitBytes: 800 * 1024 * 1024 },
        emails: { count: emailCount, limitCount: 3000 },
      });
    } catch (err) {
      console.error("GET /api/stats/usage error:", err);
      res.status(500).json({ error: "Falha ao obter estatísticas de uso" });
    }
  });

  app.get("/api/backup/:year", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const year = req.params.year as string;
      const yearSuffix = year.slice(-2);

      const yearPayments = await storage.getPaymentsByYear(userId, year);
      const userSuppliers = await storage.getSuppliers(userId);

      // Mapa supplierId → supplier para lookup rápido
      const supplierMap = new Map(userSuppliers.map((s) => [s.id, s]));

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="backup_20${year}.zip"`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      // BUG 2 fix: XLSX com layout pivô idêntico ao GET /api/payments/export/:year
      const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

      const rows = userSuppliers.map((supplier) => {
        const row: Record<string, string | number> = {
          Fornecedor: supplier.name,
          "Serviço": supplier.serviceName,
        };
        months.forEach((m) => {
          const monthYear = `${m}${yearSuffix}`;
          const payment = yearPayments.find(
            (p) => p.supplierId === supplier.id && p.monthYear === monthYear
          );
          row[`${m}${yearSuffix}`] = payment ? payment.amount : "";
        });
        return row;
      });

      const totalRow: Record<string, string | number> = { Fornecedor: "TOTAL", "Serviço": "" };
      months.forEach((m) => {
        const monthYear = `${m}${yearSuffix}`;
        const total = yearPayments
          .filter((p) => p.monthYear === monthYear)
          .reduce((acc, p) => acc + p.amount, 0);
        totalRow[`${m}${yearSuffix}`] = total || "";
      });
      rows.push(totalRow);

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Pagamentos 20${year}`);
      const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      archive.append(xlsxBuffer, { name: `dashboard_20${year}.xlsx` });

      for (const payment of yearPayments) {
        // BUG 1 fix: usar nome real do fornecedor no slug, não o UUID
        const supplier = supplierMap.get(payment.supplierId);
        const supplierSlug = (supplier?.name ?? payment.supplierId)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\s+/g, "_");
        const monthYear = payment.monthYear ?? "desconhecido";

        if (payment.fileUrl) {
          const fileUuid = payment.fileUrl.split("/").pop();
          if (fileUuid) {
            const fileRow = await db.select().from(files).where(eq(files.id, fileUuid));
            if (fileRow.length > 0 && fileRow[0].data) {
              const ext = (fileRow[0].mimeType ?? "bin").split("/").pop();
              archive.append(Buffer.from(fileRow[0].data, "base64"), { name: `fatura_${supplierSlug}_${monthYear}.${ext}` });
            }
          }
        }

        if (payment.receiptUrl) {
          const receiptUuid = payment.receiptUrl.split("/").pop();
          if (receiptUuid) {
            const receiptRow = await db.select().from(files).where(eq(files.id, receiptUuid));
            if (receiptRow.length > 0 && receiptRow[0].data) {
              const ext = (receiptRow[0].mimeType ?? "bin").split("/").pop();
              archive.append(Buffer.from(receiptRow[0].data, "base64"), { name: `comprovante_${supplierSlug}_${monthYear}.${ext}` });
            }
          }
        }
      }

      archive.finalize();
    } catch (err) {
      console.error("GET /api/backup/:year error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Falha ao gerar backup" });
    }
  });

  app.delete("/api/cleanup/:year", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const year = req.params.year as string;

      const yearPayments = await storage.getPaymentsByYear(userId, year);

      let deletedCount = 0;
      for (const payment of yearPayments) {
        const uuids: string[] = [];
        if (payment.fileUrl) uuids.push(payment.fileUrl.split("/").pop()!);
        if (payment.receiptUrl) uuids.push(payment.receiptUrl.split("/").pop()!);

        for (const uuid of uuids.filter(Boolean)) {
          await db.delete(files).where(eq(files.id, uuid));
          deletedCount++;
        }
      }

      res.json({ deleted: deletedCount, message: `${deletedCount} arquivo(s) removido(s). Registros de pagamento preservados.` });
    } catch (err) {
      console.error("DELETE /api/cleanup/:year error:", err);
      res.status(500).json({ error: "Falha ao executar cleanup" });
    }
  });

  // ── ADMIN ROUTES ────────────────────────────────────────────────────────────

  function isAdminSession(req: Request, res: Response, next: NextFunction) {
    if ((req.session as any).isAdmin !== true) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }

  app.post("/api/admin/login", async (req, res) => {
    try {
      const adminPassword = process.env.ADMIN_PASSWORD || "";
      if (!adminPassword) {
        return res.status(500).json({ message: "ADMIN_PASSWORD not configured" });
      }
      const supplied = Buffer.from(
        crypto.createHash("sha256").update(String(req.body.password || "")).digest("hex")
      );
      const expected = Buffer.from(
        crypto.createHash("sha256").update(adminPassword).digest("hex")
      );
      if (!crypto.timingSafeEqual(supplied, expected)) {
        return res.status(401).json({ message: "Senha incorreta" });
      }
      (req.session as any).isAdmin = true;
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/admin/users", isAdminSession, async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          u.id,
          COALESCE(
            CASE
              WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL
                THEN u.first_name || ' ' || u.last_name
              WHEN u.first_name IS NOT NULL THEN u.first_name
              WHEN u.last_name IS NOT NULL THEN u.last_name
              ELSE ''
            END,
            ''
          ) AS name,
          u.email,
          u.created_at AS "createdAt",
          COALESCE(p.payments_count, 0) AS "paymentsCount",
          COALESCE(s.suppliers_count, 0) AS "suppliersCount",
          COALESCE(e.emails_sent, 0) AS "emailsSent",
          COALESCE(f.storage_count, 0) AS "totalStorageBytes"
        FROM users u
        LEFT JOIN (
          SELECT owner_id, COUNT(*) AS payments_count FROM payments GROUP BY owner_id
        ) p ON p.owner_id = u.id
        LEFT JOIN (
          SELECT owner_id, COUNT(*) AS suppliers_count FROM suppliers GROUP BY owner_id
        ) s ON s.owner_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) AS emails_sent FROM email_logs GROUP BY user_id
        ) e ON e.user_id = u.id
        LEFT JOIN (
          SELECT owner_id, COUNT(*) AS storage_count FROM files GROUP BY owner_id
        ) f ON f.owner_id = u.id
        ORDER BY u.created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/users/:id", isAdminSession, async (req, res) => {
    try {
      const userId = req.params.id as string;

      // 1. Delete email_logs
      await db.execute(sql`DELETE FROM email_logs WHERE user_id = ${userId}`);

      // 2. Delete password_reset_tokens
      await db.execute(sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`);

      // 3. Delete files associated with user's payments
      const userPayments = await db.execute(
        sql`SELECT file_url, receipt_url FROM payments WHERE owner_id = ${userId}`
      );
      for (const payment of userPayments.rows as any[]) {
        if (payment.file_url?.startsWith("/api/files/")) {
          const fileId = payment.file_url.replace("/api/files/", "");
          try { await db.execute(sql`DELETE FROM files WHERE id = ${fileId}`); } catch {}
        }
        if (payment.receipt_url?.startsWith("/api/files/")) {
          const fileId = payment.receipt_url.replace("/api/files/", "");
          try { await db.execute(sql`DELETE FROM files WHERE id = ${fileId}`); } catch {}
        }
      }
      // Delete any remaining files owned by this user
      await db.execute(sql`DELETE FROM files WHERE owner_id = ${userId}`);

      // 4. Delete payments
      await db.execute(sql`DELETE FROM payments WHERE owner_id = ${userId}`);

      // 5. Delete suppliers
      await db.execute(sql`DELETE FROM suppliers WHERE owner_id = ${userId}`);

      // 6. Delete sessions for this user
      await db.execute(
        sql`DELETE FROM sessions WHERE sess->'passport'->>'user' = ${userId}`
      );

      // 7. Delete user
      await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/admin/backup
  app.post("/api/admin/backup", isAdminSession, (req, res) => {
    try {
      const backupsDir = path.join("/opt/i9star-dev", "backups");
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const timestamp =
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const filename = `backup_${timestamp}.sql`;
      const filepath = path.join(backupsDir, filename);
      const dbUrl = process.env.DATABASE_URL!;
      execSync('pg_dump --clean --if-exists "' + dbUrl + '" -f "' + filepath + '"', { stdio: 'pipe' });
      res.json({ filename, createdAt: now.toISOString() });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/admin/backups
  app.get("/api/admin/backups", isAdminSession, (req, res) => {
    try {
      const backupsDir = path.join("/opt/i9star-dev", "backups");
      if (!fs.existsSync(backupsDir)) {
        return res.json([]);
      }
      const files = fs.readdirSync(backupsDir)
        .filter((f) => f.endsWith(".sql"))
        .map((f) => {
          const stat = fs.statSync(path.join(backupsDir, f));
          return { filename: f, createdAt: stat.mtime.toISOString(), sizeBytes: stat.size };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(files);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/admin/restore
  app.post("/api/admin/restore", isAdminSession, (req, res) => {
    try {
      const { filename } = req.body as { filename: string };
      if (!filename || path.basename(filename) !== filename || !filename.endsWith(".sql")) {
        return res.status(400).json({ message: "Invalid filename" });
      }
      const filepath = path.join("/opt/i9star-dev", "backups", filename);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "Backup not found" });
      }
      const appDbUrl = process.env.DATABASE_URL!;
      const parsedUrl = new URL(appDbUrl);
      parsedUrl.pathname = "/postgres";
      const sysDbUrl = parsedUrl.toString();
      execSync('psql "' + sysDbUrl + '" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = \'i9star_dev_db\' AND pid <> pg_backend_pid()"', { stdio: 'pipe' });
      execSync('psql "' + sysDbUrl + '" -c "DROP DATABASE i9star_dev_db"', { stdio: 'pipe' });
      execSync('psql "' + sysDbUrl + '" -c "CREATE DATABASE i9star_dev_db OWNER i9star_dev_user"', { stdio: 'pipe' });
      execSync('psql "' + appDbUrl + '" -f "' + filepath + '"', { stdio: 'pipe' });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // DELETE /api/admin/backups/:filename
  app.delete("/api/admin/backups/:filename", isAdminSession, (req, res) => {
    try {
      const { filename } = req.params;
      if (!filename || path.basename(filename) !== filename || !filename.endsWith(".sql")) {
        return res.status(400).json({ message: "Invalid filename" });
      }
      const filepath = path.join("/opt/i9star-dev", "backups", filename);
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "Backup not found" });
      }
      fs.unlinkSync(filepath);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/version", (req: Request, res: Response) => {
    try {
      const pkg = require('../package.json');
      const version = pkg.version;
      let commit: string;
      try {
        commit = execSync('git rev-parse --short HEAD', { cwd: '/opt/i9star-dev', encoding: 'utf8' }).trim();
      } catch {
        commit = 'unknown';
      }
      res.json({ version, commit });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
