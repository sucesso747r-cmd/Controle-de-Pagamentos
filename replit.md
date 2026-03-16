# Gestão de Pagamentos - Supplier Payment Tracking

## Overview
Full-stack web application for supplier payment tracking with Replit Auth. All UI in Portuguese (PT-BR) with minimalist, mobile-optimized design.

## Recent Changes
- 2026-03-16: Removed archive year feature — commented out archive button, dialogs, mutation, handlers, backend route, storage method; isArchived column remains in DB but unused
- 2026-03-16: Simplified landing page — removed feature cards, preview panel, Google branding; single centered layout with "Iniciar" button
- 2026-03-16: Commented out Gmail OAuth backend routes (/api/gmail/auth, /api/gmail/callback, /api/gmail/disconnect) and getGmailOAuthClient function
- 2026-03-16: Commented out Gmail sending branch in send-receipt endpoint; only Resend is active
- 2026-03-16: Commented out GmailOAuthHandler component in App.tsx
- 2026-02-10: Replaced Gmail app password with Gmail OAuth 2.0 (googleapis, google-auth-library)
- 2026-02-10: Added Gmail OAuth routes: /api/gmail/auth, /api/gmail/callback, /api/gmail/disconnect
- 2026-02-10: Email sending now uses Gmail API (not SMTP) with refresh tokens
- 2026-02-10: Settings page: "Conectar Gmail" / "Desconectar Gmail" buttons replace password input
- 2026-02-10: Migrated file storage from local disk to PostgreSQL (files table with base64 data)
- 2026-02-10: Switched multer to memory storage, files saved to DB via saveFile/getFile/deleteFile methods
- 2026-02-10: New /api/files/:id endpoint serves files from DB with ownership verification
- 2026-02-10: Migrated all existing disk files to database, updated payment URLs
- 2026-02-09: Implemented dual email provider system (Gmail SMTP + Resend API) with radio toggle in Settings
- 2026-02-09: Added "Enviar comprovante por email" button to payment details modal (Resend API)
- 2026-02-09: Switched from manual email/password auth to Replit Auth (OAuth with Google, GitHub, etc.)
- 2026-02-09: Created landing page with "Iniciar" button for unauthenticated users
- 2026-02-09: Updated user model to use OAuth claims (firstName, lastName, profileImageUrl)
- 2026-02-09: Added file ownership verification on /uploads endpoint for multi-tenant security

## Project Architecture
- **Frontend**: React + Vite + TanStack Query + shadcn/ui + wouter routing
- **Backend**: Express.js with Replit Auth (OpenID Connect via passport)
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: PostgreSQL database (files table with base64 data, multer memory storage)
- **Auth**: Replit Auth (OIDC) with PostgreSQL session store

### Key Files
- `shared/schema.ts` - Re-exports auth models + suppliers/payments schemas
- `shared/models/auth.ts` - Users and sessions tables (Replit Auth managed)
- `server/replit_integrations/auth/` - Auth module (setupAuth, isAuthenticated, routes)
- `server/db.ts` - Database connection pool
- `server/storage.ts` - DatabaseStorage class with CRUD operations
- `server/routes.ts` - API routes (suppliers, payments, settings, file uploads)
- `client/src/hooks/use-auth.ts` - useAuth hook for OAuth state
- `client/src/pages/landing-page.tsx` - Simplified landing page with "Iniciar" button
- `client/src/App.tsx` - Router with protected routes

### Database Tables
- `users` - id, email, firstName, lastName, profileImageUrl, subscriptionPlan, initialYear, email settings, emailProvider (none/resend/gmail), gmailEmail, gmailRefreshToken, gmailConnectedAt
- `sessions` - sid, sess, expire (Replit Auth session store)
- `suppliers` - id, name, serviceName, isRecurring, dueDay, ownerId
- `payments` - id, supplierId, ownerId, amount, monthYear, pixKey, dueDay, fileUrl, receiptUrl, status, isArchived
- `files` - id, filename, mimeType, data (base64 text), ownerId, createdAt

### API Endpoints
- GET /api/login - Begin OAuth login flow
- GET /api/logout - Begin logout flow
- GET /api/auth/user - Get current authenticated user
- PATCH /api/settings - Update user preferences
- GET/POST/PATCH/DELETE /api/suppliers - Supplier CRUD
- GET/POST/PATCH/DELETE /api/payments - Payment CRUD with file upload
- POST /api/payments/:id/send-receipt - Send payment receipt email via Resend API

### API Endpoints (Archive — commented out)
- POST /api/payments/archive/:year - (commented out) Archive year's files

### API Endpoints (Gmail OAuth — commented out)
- GET /api/gmail/auth - (commented out) Get Gmail OAuth authorization URL
- GET /api/gmail/callback - (commented out) Handle Google redirect with authorization code
- POST /api/gmail/disconnect - (commented out) Revoke Gmail access and clear tokens

### Design Decisions
- OAuth via Replit Auth (Google, GitHub, X, Apple, email)
- Email provider: Resend API (RESEND_API_KEY secret). Gmail OAuth code is commented out but preserved.
- Email provider selection stored per-user (emailProvider field: none/resend)
- Sensitive fields (resendApiKey, gmailRefreshToken) encrypted with AES-256-GCM before DB storage, decrypted on read
- Encryption key stored in ENCRYPTION_KEY env var, key derived via SHA-256
- Gmail OAuth code is commented out but preserved; refresh tokens were stored encrypted in DB
- Gmail sending code commented out; was via Gmail API (not SMTP), required GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET secrets
- File storage in PostgreSQL (base64 in files table) for production persistence across deploys
- Multer uses memory storage, files saved to DB immediately after upload
- GET /api/files/:id serves files from DB with ownership check (ownerId match)
- Pro plan gates analytics dashboard access
- initialYear setting controls year navigation bounds
- File uploads use multipart/form-data with multer (memory storage)
- Ownership verification on file access prevents cross-tenant data exposure

## User Preferences
- UI language: Portuguese (PT-BR)
- Minimalist design with mobile optimization
- Landing page uses simple "Iniciar" button (no Google branding)
