import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { passwordResetTokens, passwordSchema } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import { decrypt, isEncrypted } from "./crypto";

const SENSITIVE_FIELDS = ["resendApiKey", "gmailRefreshToken"] as const;

function decryptUser(user: any) {
  const result = { ...user };
  for (const field of SENSITIVE_FIELDS) {
    if (result[field] && typeof result[field] === "string" && isEncrypted(result[field])) {
      try {
        result[field] = decrypt(result[field]);
      } catch {
        result[field] = null;
      }
    }
  }
  return result;
}

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: sessionTtl,
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !user.password) {
        return done(null, false, { message: "Invalid username or password" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Invalid username or password" });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (user) {
        done(null, decryptUser(user));
      } else {
        done(null, false);
      }
    } catch (err) {
      done(err);
    }
  });
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/register", async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    try {
      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      }).returning();

      req.login(newUser, (err) => {
        if (err) return res.status(500).json({ message: "Error logging in after register" });
        return res.json(decryptUser(newUser));
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error registering user" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json(decryptUser(req.user));
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(200).json({ message: "Se este email estiver cadastrado, você receberá um link de recuperação." });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) {
        return res.status(200).json({ message: "Se este email estiver cadastrado, você receberá um link de recuperação." });
      }

      const tokenPlain = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(tokenPlain).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
        used: false,
      });

      const resend = new Resend(process.env.RESEND_API_KEY);
      const resetLink = `https://meuspagamentos.i9star.com.br/reset-password?token=${tokenPlain}`;

      await resend.emails.send({
        from: "noreply@meuspagamentos.i9star.com.br",
        to: email,
        subject: "Recuperação de senha — Gestão de Pagamentos",
        html: `<p>Olá,</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetLink}">Clique aqui para redefinir sua senha</a></p><p>Este link expira em 1 hora. Se você não solicitou a recuperação, ignore este email.</p>`,
      });
    } catch (err) {
      console.error("forgot-password error:", err);
    }

    return res.status(200).json({ message: "Se este email estiver cadastrado, você receberá um link de recuperação." });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token e nova senha são obrigatórios." });
    }

    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.errors[0].message });
    }

    try {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const now = new Date();

      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            eq(passwordResetTokens.used, false),
            gt(passwordResetTokens.expiresAt, now)
          )
        )
        .limit(1);

      if (!resetToken) {
        return res.status(400).json({ message: "Token inválido ou expirado." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, resetToken.userId));
      await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, resetToken.id));

      req.session.destroy(() => {});

      return res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch (err) {
      console.error("reset-password error:", err);
      return res.status(500).json({ message: "Erro ao redefinir senha." });
    }
  });

  app.get("/api/auth/user", isAuthenticated, (req, res) => {
    const user = req.user as any;
    if (user) {
      const { resendApiKey, gmailRefreshToken, password, ...safeUser } = user;
      res.json({
        ...safeUser,
        hasResendApiKey: !!resendApiKey,
        gmailConnected: !!gmailRefreshToken,
      });
    } else {
      res.json(null);
    }
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
