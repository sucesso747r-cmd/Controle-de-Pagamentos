import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users, suppliers, payments,
  type User, type InsertUser,
  type Supplier, type InsertSupplier,
  type Payment, type InsertPayment,
} from "@shared/schema";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  createUser(data: { name: string; email: string; password: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserSettings(userId: string, settings: Partial<User>): Promise<User>;

  getSuppliers(ownerId: string): Promise<Supplier[]>;
  getSupplier(id: string, ownerId: string): Promise<Supplier | undefined>;
  createSupplier(data: InsertSupplier & { ownerId: string }): Promise<Supplier>;
  updateSupplier(id: string, ownerId: string, data: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string, ownerId: string): Promise<void>;

  getPayments(ownerId: string): Promise<Payment[]>;
  getPayment(id: string, ownerId: string): Promise<Payment | undefined>;
  createPayment(data: InsertPayment & { ownerId: string }): Promise<Payment>;
  updatePayment(id: string, ownerId: string, data: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: string, ownerId: string): Promise<void>;
  archiveYear(ownerId: string, yearSuffix: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createUser(data: { name: string; email: string; password: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserSettings(userId: string, settings: Partial<User>): Promise<User> {
    const { id, password, email, ...safeSettings } = settings as any;
    const [user] = await db.update(users)
      .set(safeSettings)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getSuppliers(ownerId: string): Promise<Supplier[]> {
    return db.select().from(suppliers).where(eq(suppliers.ownerId, ownerId));
  }

  async getSupplier(id: string, ownerId: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.ownerId, ownerId)));
    return supplier;
  }

  async createSupplier(data: InsertSupplier & { ownerId: string }): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }

  async updateSupplier(id: string, ownerId: string, data: Partial<InsertSupplier>): Promise<Supplier> {
    const [supplier] = await db.update(suppliers)
      .set(data)
      .where(and(eq(suppliers.id, id), eq(suppliers.ownerId, ownerId)))
      .returning();
    return supplier;
  }

  async deleteSupplier(id: string, ownerId: string): Promise<void> {
    await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.ownerId, ownerId)));
  }

  async getPayments(ownerId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.ownerId, ownerId));
  }

  async getPayment(id: string, ownerId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments)
      .where(and(eq(payments.id, id), eq(payments.ownerId, ownerId)));
    return payment;
  }

  async createPayment(data: InsertPayment & { ownerId: string }): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  async updatePayment(id: string, ownerId: string, data: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db.update(payments)
      .set(data)
      .where(and(eq(payments.id, id), eq(payments.ownerId, ownerId)))
      .returning();
    return payment;
  }

  async deletePayment(id: string, ownerId: string): Promise<void> {
    await db.delete(payments).where(and(eq(payments.id, id), eq(payments.ownerId, ownerId)));
  }

  async archiveYear(ownerId: string, yearSuffix: string): Promise<void> {
    const allPayments = await this.getPayments(ownerId);
    const toArchive = allPayments.filter(p => p.monthYear.endsWith(yearSuffix));
    for (const p of toArchive) {
      await db.update(payments)
        .set({ isArchived: true, fileUrl: null, receiptUrl: null })
        .where(eq(payments.id, p.id));
    }
  }
}

export const storage = new DatabaseStorage();
