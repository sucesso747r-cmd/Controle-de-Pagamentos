# Gestão de Pagamentos - Supplier Payment Tracking

## Overview
Full-stack web application for supplier payment tracking with session-based authentication. All UI in Portuguese (PT-BR) with minimalist, mobile-optimized design. Architecture is portable for future Windows .exe and Android export using standard Node.js packages (no Replit-specific dependencies).

## Recent Changes
- 2026-02-09: Converted mockup to full-stack with PostgreSQL, Drizzle ORM, session auth, file uploads
- 2026-02-09: Replaced zustand mock store with TanStack Query API calls across all pages
- 2026-02-09: Added file ownership verification on /uploads endpoint for multi-tenant security

## Project Architecture
- **Frontend**: React + Vite + TanStack Query + shadcn/ui + wouter routing
- **Backend**: Express.js with session-based auth (express-session + connect-pg-simple)
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local disk storage via multer (uploads/ directory)
- **Auth**: bcryptjs password hashing, PostgreSQL session store

### Key Files
- `shared/schema.ts` - Data model (users, suppliers, payments) with Drizzle + Zod schemas
- `server/storage.ts` - DatabaseStorage class with full CRUD operations
- `server/routes.ts` - API routes (auth, suppliers, payments, settings, file uploads)
- `client/src/lib/auth.ts` - useAuth hook with TanStack Query
- `client/src/App.tsx` - Router with protected routes

### Database Tables
- `users` - id, name, email, password, subscriptionPlan, initialYear, email settings
- `suppliers` - id, name, serviceName, isRecurring, dueDay, ownerId
- `payments` - id, supplierId, ownerId, amount, monthYear, pixKey, dueDay, fileUrl, receiptUrl, status, isArchived

### API Endpoints
- POST/GET /api/auth/* - login, register, logout, me
- PATCH /api/settings - update user preferences
- GET/POST/PATCH/DELETE /api/suppliers - supplier CRUD
- GET/POST/PATCH/DELETE /api/payments - payment CRUD with file upload
- POST /api/payments/archive/:year - archive year's files

### Design Decisions
- Session-based auth (not JWT) for portability
- Local file storage (not cloud) for portability
- Pro plan gates analytics dashboard access
- initialYear setting controls year navigation bounds
- File uploads use multipart/form-data with multer
- Ownership verification on file access prevents cross-tenant data exposure

## User Preferences
- UI language: Portuguese (PT-BR)
- Minimalist design with mobile optimization
- No Replit-specific dependencies (portable architecture)
