import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertSupplierSchema, updateSettingsSchema } from "@shared/schema";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

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

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgSession = ConnectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "gestao-pagamentos-secret-key-2026",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.use("/uploads", requireAuth, async (req, res, next) => {
    const filename = path.basename(req.path);
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }
    const userPayments = await storage.getPayments(req.session.userId!);
    const ownsFile = userPayments.some(p => 
      (p.fileUrl && p.fileUrl.includes(filename)) || 
      (p.receiptUrl && p.receiptUrl.includes(filename))
    );
    if (!ownsFile) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    res.sendFile(filePath);
  });

  // AUTH
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }
      const user = await storage.createUser(data);
      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados inválidos" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      const valid = await bcrypt.compare(data.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }
      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Dados inválidos" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  // SETTINGS
  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const data = updateSettingsSchema.parse(req.body);
      const user = await storage.updateUserSettings(req.session.userId!, data);
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // SUPPLIERS
  app.get("/api/suppliers", requireAuth, async (req, res) => {
    const list = await storage.getSuppliers(req.session.userId!);
    res.json(list);
  });

  app.post("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier({ ...data, ownerId: req.session.userId! });
      res.json(supplier);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/suppliers/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const supplier = await storage.updateSupplier(id, req.session.userId!, req.body);
      if (!supplier) return res.status(404).json({ message: "Fornecedor não encontrado" });
      res.json(supplier);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    await storage.deleteSupplier(id, req.session.userId!);
    res.json({ ok: true });
  });

  // PAYMENTS
  app.get("/api/payments", requireAuth, async (req, res) => {
    const list = await storage.getPayments(req.session.userId!);
    res.json(list);
  });

  app.post("/api/payments", requireAuth, upload.fields([
    { name: "fatura", maxCount: 1 },
    { name: "comprovante", maxCount: 1 },
  ]), async (req, res) => {
    try {
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
        ownerId: req.session.userId!,
      };

      const payment = await storage.createPayment(paymentData);
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/payments/:id", requireAuth, upload.fields([
    { name: "fatura", maxCount: 1 },
    { name: "comprovante", maxCount: 1 },
  ]), async (req, res) => {
    try {
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

      const pid = req.params.id as string;
      const payment = await storage.updatePayment(pid, req.session.userId!, updateData);
      if (!payment) return res.status(404).json({ message: "Pagamento não encontrado" });
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/payments/:id", requireAuth, async (req, res) => {
    const did = req.params.id as string;
    const payment = await storage.getPayment(did, req.session.userId!);
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
    await storage.deletePayment(did, req.session.userId!);
    res.json({ ok: true });
  });

  app.post("/api/payments/archive/:year", requireAuth, async (req, res) => {
    const yearSuffix = (req.params.year as string).slice(-2);
    await storage.archiveYear(req.session.userId!, yearSuffix);
    res.json({ ok: true });
  });

  return httpServer;
}
