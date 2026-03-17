import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSupplierSchema, insertServiceSchema, updateSettingsSchema } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import XLSX from "xlsx";
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

      const provider = user.emailProvider || "none";

      if (provider === "none") {
        return res.status(400).json({ message: "Nenhum provedor de email configurado. Ative Resend nas Configurações." });
      }

      if (provider === "gmail") {
        return res.status(400).json({ message: "Gmail não está disponível no momento. Configure Resend nas Configurações." });
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
      if (provider === "resend") {
        const apiKey = user.resendApiKey || process.env.RESEND_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ message: "Chave da API Resend não configurada. Adicione nas Configurações." });
        }

        const resend = new Resend(apiKey);
        const fromEmail = user.email ? `${user.firstName || "Pagamentos"} <onboarding@resend.dev>` : "Pagamentos <onboarding@resend.dev>";

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

  return httpServer;
}
