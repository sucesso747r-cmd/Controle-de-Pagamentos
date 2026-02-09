import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSupplierSchema, updateSettingsSchema } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { Resend } from "resend";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: multerStorage,
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

function getUserId(req: Request): string {
  return (req.user as any)?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/uploads", isAuthenticated, async (req, res, next) => {
    const filename = path.basename(req.path);
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }
    const userId = getUserId(req);
    const userPayments = await storage.getPayments(userId);
    const ownsFile = userPayments.some(p =>
      (p.fileUrl && p.fileUrl.includes(filename)) ||
      (p.receiptUrl && p.receiptUrl.includes(filename))
    );
    if (!ownsFile) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    res.sendFile(filePath);
  });

  // SETTINGS
  app.patch("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = updateSettingsSchema.parse(req.body);
      const user = await storage.updateUserSettings(userId, data);
      res.json(user);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
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
      const files = req.files as { [key: string]: Express.Multer.File[] };
      const faturaFile = files?.fatura?.[0];
      const comprovanteFile = files?.comprovante?.[0];

      const paymentData = {
        supplierId: req.body.supplierId,
        amount: parseFloat(req.body.amount),
        monthYear: req.body.monthYear,
        pixKey: req.body.pixKey || null,
        dueDay: req.body.dueDay ? parseInt(req.body.dueDay) : null,
        status: req.body.status || "paid",
        fileUrl: faturaFile ? `/uploads/${faturaFile.filename}` : null,
        receiptUrl: comprovanteFile ? `/uploads/${comprovanteFile.filename}` : null,
        ownerId: userId,
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
      const files = req.files as { [key: string]: Express.Multer.File[] };
      const faturaFile = files?.fatura?.[0];
      const comprovanteFile = files?.comprovante?.[0];

      const updateData: any = {};
      if (req.body.amount) updateData.amount = parseFloat(req.body.amount);
      if (req.body.monthYear) updateData.monthYear = req.body.monthYear;
      if (req.body.pixKey !== undefined) updateData.pixKey = req.body.pixKey || null;
      if (req.body.dueDay !== undefined) updateData.dueDay = req.body.dueDay ? parseInt(req.body.dueDay) : null;
      if (req.body.status) updateData.status = req.body.status;
      if (faturaFile) updateData.fileUrl = `/uploads/${faturaFile.filename}`;
      if (comprovanteFile) updateData.receiptUrl = `/uploads/${comprovanteFile.filename}`;

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
      if (payment.fileUrl) {
        const fp = path.join(uploadsDir, path.basename(payment.fileUrl));
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
      if (payment.receiptUrl) {
        const fp = path.join(uploadsDir, path.basename(payment.receiptUrl));
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    }
    await storage.deletePayment(did, userId);
    res.json({ ok: true });
  });

  app.post("/api/payments/archive/:year", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const yearSuffix = (req.params.year as string).slice(-2);
    await storage.archiveYear(userId, yearSuffix);
    res.json({ ok: true });
  });

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

      if (payment.fileUrl) {
        const faturaPath = path.join(uploadsDir, path.basename(payment.fileUrl));
        if (fs.existsSync(faturaPath)) {
          attachments.push({
            filename: `fatura_${supplier.name}_${payment.monthYear}${path.extname(faturaPath)}`,
            content: fs.readFileSync(faturaPath),
          });
        }
      }

      if (payment.receiptUrl) {
        const receiptPath = path.join(uploadsDir, path.basename(payment.receiptUrl));
        if (fs.existsSync(receiptPath)) {
          attachments.push({
            filename: `comprovante_${supplier.name}_${payment.monthYear}${path.extname(receiptPath)}`,
            content: fs.readFileSync(receiptPath),
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

      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ message: "Chave da API de email não configurada. Contate o administrador." });
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
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

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Send receipt error:", err);
      res.status(500).json({ message: "Erro ao enviar email. Tente novamente." });
    }
  });

  return httpServer;
}
