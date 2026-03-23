export * from "./models/auth";

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export const passwordSchema = z.string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "A senha deve ter pelo menos 1 letra maiúscula")
  .regex(/[a-z]/, "A senha deve ter pelo menos 1 letra minúscula")
  .regex(/[0-9]/, "A senha deve ter pelo menos 1 número")
  .regex(/[!@#$%^&*]/, "A senha deve ter pelo menos 1 caractere especial (!@#$%^&*)");

export const services = pgTable("services", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export const suppliers = pgTable("suppliers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  serviceName: text("service_name").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  dueDay: integer("due_day"),
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => users.id),
});

export const payments = pgTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id", { length: 36 }).notNull().references(() => suppliers.id),
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => users.id),
  amount: real("amount").notNull(),
  monthYear: text("month_year").notNull(),
  pixKey: text("pix_key"),
  dueDay: integer("due_day"),
  fileUrl: text("file_url"),
  receiptUrl: text("receipt_url"),
  status: text("status").notNull().default("paid"),
  isArchived: boolean("is_archived").notNull().default(false),
  registrationDate: timestamp("registration_date").notNull().defaultNow(),
  emailSentAt: timestamp("email_sent_at"),
  idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
});

export const files = pgTable("files", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(),
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  paymentId: varchar("payment_id", { length: 36 }).references(() => payments.id),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export type EmailLog = typeof emailLogs.$inferSelect;

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, ownerId: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, ownerId: true, registrationDate: true, isArchived: true });

export const updateSettingsSchema = z.object({
  initialYear: z.number().optional(),
  destEmail: z.string().optional(),
  sendCopy: z.boolean().optional(),
  copyType: z.string().optional(),
  copyEmail: z.string().optional(),
  resendApiKey: z.string().optional(),
  emailProvider: z.enum(["none", "resend", "gmail"]).optional(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
