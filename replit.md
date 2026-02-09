# Gestão de Pagamentos - Supplier Payment Tracking

## Overview
Full-stack web application for supplier payment tracking with OAuth authentication (Replit Auth / Google). All UI in Portuguese (PT-BR) with minimalist, mobile-optimized design.

## Recent Changes
- 2026-02-09: Added "Enviar comprovante por email" button to payment details modal (Resend API)
- 2026-02-09: Switched from manual email/password auth to Replit Auth (OAuth with Google, GitHub, etc.)
- 2026-02-09: Created landing page with "Entrar com Google" button for unauthenticated users
- 2026-02-09: Updated user model to use OAuth claims (firstName, lastName, profileImageUrl)
- 2026-02-09: Added file ownership verification on /uploads endpoint for multi-tenant security

## Project Architecture
- **Frontend**: React + Vite + TanStack Query + shadcn/ui + wouter routing
- **Backend**: Express.js with Replit Auth (OpenID Connect via passport)
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local disk storage via multer (uploads/ directory)
- **Auth**: Replit Auth (OIDC) with PostgreSQL session store

### Key Files
- `shared/schema.ts` - Re-exports auth models + suppliers/payments schemas
- `shared/models/auth.ts` - Users and sessions tables (Replit Auth managed)
- `server/replit_integrations/auth/` - Auth module (setupAuth, isAuthenticated, routes)
- `server/db.ts` - Database connection pool
- `server/storage.ts` - DatabaseStorage class with CRUD operations
- `server/routes.ts` - API routes (suppliers, payments, settings, file uploads)
- `client/src/hooks/use-auth.ts` - useAuth hook for OAuth state
- `client/src/pages/landing-page.tsx` - Landing page with "Entrar com Google"
- `client/src/App.tsx` - Router with protected routes

### Database Tables
- `users` - id, email, firstName, lastName, profileImageUrl, subscriptionPlan, initialYear, email settings
- `sessions` - sid, sess, expire (Replit Auth session store)
- `suppliers` - id, name, serviceName, isRecurring, dueDay, ownerId
- `payments` - id, supplierId, ownerId, amount, monthYear, pixKey, dueDay, fileUrl, receiptUrl, status, isArchived

### API Endpoints
- GET /api/login - Begin OAuth login flow
- GET /api/logout - Begin logout flow
- GET /api/auth/user - Get current authenticated user
- PATCH /api/settings - Update user preferences
- GET/POST/PATCH/DELETE /api/suppliers - Supplier CRUD
- GET/POST/PATCH/DELETE /api/payments - Payment CRUD with file upload
- POST /api/payments/archive/:year - Archive year's files
- POST /api/payments/:id/send-receipt - Send payment receipt email via Resend API

### Design Decisions
- OAuth via Replit Auth (Google, GitHub, X, Apple, email)
- Email sending via Resend API (RESEND_API_KEY secret, uses onboarding@resend.dev as sender)
- Local file storage for portability
- Pro plan gates analytics dashboard access
- initialYear setting controls year navigation bounds
- File uploads use multipart/form-data with multer
- Ownership verification on file access prevents cross-tenant data exposure

## User Preferences
- UI language: Portuguese (PT-BR)
- Minimalist design with mobile optimization
- OAuth login ("Entrar com Google") as per original design
