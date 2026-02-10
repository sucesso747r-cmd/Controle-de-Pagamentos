import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, suppliers, payments, services, files,
  type User, type Supplier, type InsertSupplier,
  type Payment, type InsertPayment,
  type Service, type InsertService,
} from "@shared/schema";

export type DbFile = typeof files.$inferSelect;

export interface IStorage {
  getUser(userId: string): Promise<User | undefined>;
  updateUserSettings(userId: string, settings: Partial<User>): Promise<User>;

  getServices(): Promise<Service[]>;
  createService(data: InsertService): Promise<Service>;

  getSuppliers(ownerId: string): Promise<Supplier[]>;
  getSupplier(id: string, ownerId: string): Promise<Supplier | undefined>;
  createSupplier(data: InsertSupplier & { ownerId: string }): Promise<Supplier>;
  updateSupplier(id: string, ownerId: string, data: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string, ownerId: string): Promise<void>;

  getPayments(ownerId: string): Promise<Payment[]>;
  getPayment(id: string, ownerId: string): Promise<Payment | undefined>;
  getPaymentByIdempotencyKey(key: string, ownerId: string): Promise<Payment | undefined>;
  createPayment(data: InsertPayment & { ownerId: string }): Promise<Payment>;
  updatePayment(id: string, ownerId: string, data: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: string, ownerId: string): Promise<void>;
  archiveYear(ownerId: string, yearSuffix: string): Promise<void>;

  saveFile(filename: string, mimeType: string, data: string, ownerId: string): Promise<DbFile>;
  getFile(id: string): Promise<DbFile | undefined>;
  deleteFile(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async getServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(services.name);
  }

  async createService(data: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async updateUserSettings(userId: string, settings: Partial<User>): Promise<User> {
    const { id, email, firstName, lastName, profileImageUrl, createdAt, updatedAt, ...safeSettings } = settings as any;
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

  async getPaymentByIdempotencyKey(key: string, ownerId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments)
      .where(and(eq(payments.idempotencyKey, key), eq(payments.ownerId, ownerId)));
    return payment;
  }

  async createPayment(data: InsertPayment & { ownerId: string }): Promise<Payment> {
    if (data.idempotencyKey) {
      const [payment] = await db.insert(payments).values(data)
        .onConflictDoNothing({ target: payments.idempotencyKey })
        .returning();
      if (!payment) {
        const existing = await this.getPaymentByIdempotencyKey(data.idempotencyKey, data.ownerId);
        if (existing) return existing;
      }
      return payment;
    }
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
      if (p.fileUrl && p.fileUrl.startsWith("/api/files/")) {
        const fileId = p.fileUrl.replace("/api/files/", "");
        try { await this.deleteFile(fileId); } catch {}
      }
      if (p.receiptUrl && p.receiptUrl.startsWith("/api/files/")) {
        const fileId = p.receiptUrl.replace("/api/files/", "");
        try { await this.deleteFile(fileId); } catch {}
      }
      await db.update(payments)
        .set({ isArchived: true, fileUrl: null, receiptUrl: null })
        .where(eq(payments.id, p.id));
    }
  }

  async saveFile(filename: string, mimeType: string, data: string, ownerId: string): Promise<DbFile> {
    const [file] = await db.insert(files).values({ filename, mimeType, data, ownerId }).returning();
    return file;
  }

  async getFile(id: string): Promise<DbFile | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }
}

export const storage = new DatabaseStorage();
