import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { decrypt, isEncrypted } from "../../crypto";

const SENSITIVE_FIELDS = ["resendApiKey", "gmailRefreshToken"] as const;

function decryptUser(user: User): User {
  const result = { ...user } as any;
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

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ? decryptUser(user) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
