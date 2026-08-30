Last updated: test change via VS Code

# Guard SaaS — Security Guard Management System

A complete, production-ready web app for a security-guard supply business to manage
societies/clients, pricing & GST billing, manpower, deployment, attendance, and invoicing —
built to run **permanently at zero cost** on free-tier cloud services.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | **Next.js 14** (App Router, API routes) | One deployable app, no separate backend host needed |
| Styling | **Tailwind CSS** | Fast, clean, responsive UI |
| Database | **PostgreSQL** (Neon, Supabase, or Railway free tier) | Fully managed, persistent, free forever tier |
| ORM | **Prisma** | Type-safe queries, migrations |
| Auth | **JWT in httpOnly cookie** (`jose` + `bcryptjs`) | Stateless, no session store needed, edge-compatible |
| Hosting | **Vercel** (free Hobby tier) | Native Next.js support, auto CI/CD from Git |

Total monthly cost: **$0**, indefinitely, as long as you stay within free-tier limits
(generous for a single internal business tool — a few users, low request volume).

---

## 1. Project structure

```
guard-saas/
├── prisma/
│   ├── schema.prisma        # Full DB schema (Societies, RateConfig, Guards, Assignments, Attendance, Invoices, Users)
│   └── seed.ts               # Creates first admin user + default designations
├── src/
│   ├── middleware.ts          # Route protection (JWT check) for pages + API
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── auth.ts            # Password hashing, JWT sign/verify, session helper
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── Modal.tsx
│   │   └── StatCard.tsx
│   └── app/
│       ├── login/page.tsx
│       ├── (dashboard)/
│       │   ├── layout.tsx          # Sidebar shell, session guard
│       │   ├── dashboard/page.tsx  # Real-time ops overview + margin calc
│       │   ├── societies/page.tsx  # Client CRUD + pricing/GST setup
│       │   ├── guards/page.tsx     # Manpower CRUD + designations
│       │   ├── assignments/page.tsx# Guard ↔ Society ↔ Shift mapping
│       │   ├── attendance/page.tsx # Daily duty log
│       │   └── billing/page.tsx    # Invoice generation & tracking
│       └── api/
│           ├── auth/{login,logout,me}/route.ts
│           ├── societies/route.ts, [id]/route.ts
│           ├── designations/route.ts
│           ├── guards/route.ts, [id]/route.ts
│           ├── assignments/route.ts, [id]/route.ts
│           ├── attendance/route.ts
│           ├── invoices/route.ts, [id]/route.ts
│           └── dashboard/summary/route.ts
├── package.json
├── tailwind.config.ts
├── next.config.js
└── .env.example
```

---

## 2. Database schema (entities)

- **User** — admin/manager login accounts.
- **Society** — client location: address, billing address, contact details, GST number.
- **RateConfig** (1:1 with Society) — rate per guard/month, shift hours, guards required,
  **total agreed amount**, **With/Without GST toggle**, GST %.
- **Designation** — Guard, Supervisor, Head Guard, etc. (fully editable, not hardcoded).
- **Guard** — manpower record: name, phone, designation, **actual salary paid**, joining date.
- **Assignment** — maps a Guard → Society + shift (DAY/NIGHT/GENERAL/ROTATIONAL); ending an
  assignment soft-deletes it (`isActive=false`) so history/billing stays intact.
- **Attendance** — per-guard, per-date, per-shift duty log (present/absent/half-day/leave/weekly-off).
- **Invoice** — generated from a society's `RateConfig`: base amount, GST amount, total,
  status (draft/sent/paid/overdue/cancelled).

Margin calculation (shown live on the dashboard) = **sum of active societies' agreed monthly
amount** − **sum of actual salaries of currently deployed guards**.

Run `npx prisma studio` any time to browse/edit data visually.

---

## 3. Local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your free Postgres connection string
cp .env.example .env

# 3. Push schema to the database and generate the Prisma client
npx prisma migrate dev --name init

# 4. Seed an admin user + default designations
npm run seed

# 5. Run locally
npm run dev
# → http://localhost:3000, log in with the email/password printed by the seed script
```

---

## 4. Zero-cost cloud deployment (step-by-step)

### Step A — Create a free Postgres database (Neon)

1. Go to **https://neon.tech** → sign up free (no credit card required).
2. Create a new project (any region close to your users, e.g. Mumbai/Singapore for India).
3. In the Neon dashboard, copy the **pooled connection string** (for `DATABASE_URL`) and the
   **direct connection string** (for `DIRECT_URL`) — Neon shows both.
   - They look like: `postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require`
4. Keep this tab open — you'll paste these into Vercel's environment variables shortly.

*(Supabase or Railway free Postgres work identically — just swap the connection string.)*

### Step B — Push your code to GitHub

```bash
cd guard-saas
git init
git add .
git commit -m "Initial commit: Guard SaaS"
gh repo create guard-saas --private --source=. --push
# or manually: create an empty repo on github.com, then:
# git remote add origin https://github.com/<you>/guard-saas.git
# git branch -M main
# git push -u origin main
```

### Step C — Deploy to Vercel (free Hobby plan)

1. Go to **https://vercel.com** → sign up free with your GitHub account.
2. Click **Add New → Project**, select your `guard-saas` repo → **Import**.
3. Framework preset auto-detects **Next.js** — leave build settings as default.
4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | pooled connection string from Neon |
   | `DIRECT_URL` | direct connection string from Neon |
   | `JWT_SECRET` | any long random string — generate with `openssl rand -base64 32` |
   | `SEED_ADMIN_EMAIL` | your admin login email |
   | `SEED_ADMIN_PASSWORD` | your admin login password |
   | `SEED_ADMIN_NAME` | your name |

5. Click **Deploy**. Vercel builds and hosts the app at `https://guard-saas-xxxx.vercel.app`
   (you can add a custom domain later, still free).

### Step D — Apply the schema & seed the live database

Run these **once**, from your local machine, pointed at the live Neon database
(use the same `.env` values you put into Vercel):

```bash
npx prisma migrate deploy   # creates tables on the live Neon DB
npm run seed                 # creates your admin user in production
```

### Step E — Automatic CI/CD

That's it — from now on, every `git push` to `main` automatically triggers a new Vercel
build & deploy. To ship a schema change: edit `prisma/schema.prisma`, run
`npx prisma migrate dev --name <change>` locally, commit the generated migration folder,
then push — run `npx prisma migrate deploy` once against production after merging.

---

## 5. Staying on the free tier forever

- **Neon free tier**: 0.5 GB storage, autosuspends when idle, wakes on request — plenty for
  a single-business ops tool with thousands of records.
- **Vercel Hobby plan**: 100 GB bandwidth/month, unlimited deployments — free for
  non-commercial and small internal tools indefinitely.
- No credit card is required for either service at this tier; if your data or traffic grows
  significantly you can upgrade a single component without re-architecting anything.

---

## 6. Security notes

- Passwords are hashed with **bcrypt** (10 rounds); never stored in plain text.
- Sessions are **httpOnly, sameSite=lax JWT cookies** — not accessible to client-side JS, so
  they're resistant to XSS token theft.
- All `/api/*` routes (except `/api/auth/login`) and all dashboard pages are protected by
  `src/middleware.ts`, which verifies the JWT before allowing access.
- Change the seeded admin password immediately after first login in a real deployment
  (there's no self-service "change password" UI yet — update it by re-running the seed
  script with a new `SEED_ADMIN_PASSWORD`, or add one via Prisma Studio).

## 7. What's intentionally left as a next step

This is a complete, working MVP covering every feature you listed. Natural next additions:
a PDF export for invoices, email delivery, multi-admin role permissions, and a proper
"change password" screen. The schema and API are already structured to support all of these
without breaking changes.
