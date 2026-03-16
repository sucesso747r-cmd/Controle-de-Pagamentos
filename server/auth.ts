import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
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
