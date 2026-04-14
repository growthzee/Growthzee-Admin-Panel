# Employee Admin Dashboard

Full-stack admin dashboard — Next.js 15, Tailwind CSS v4, Prisma 5, Neon PostgreSQL.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your values
cp .env.local .env
# Edit .env — add your Neon DATABASE_URL and a JWT_SECRET

# 3. Push schema to database
npx prisma db push

# 4. Create the default admin account
# Start the server first, then visit:
# http://localhost:3000/api/auth/seed
# Credentials: admin@company.com / admin123

# 5. Run dev server
npm run dev
```

---

## Deploy to Vercel

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Create Vercel project
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Build command: `prisma generate && next build` ← **important**
5. Click **Deploy** — it will fail first time (no env vars yet)

### Step 3 — Add Environment Variables
In Vercel dashboard → **Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | A random 32+ character secret |

Generate JWT_SECRET: `openssl rand -base64 32`

### Step 4 — Redeploy
Go to **Deployments** → click the three dots on the latest → **Redeploy**.

### Step 5 — Seed the admin account
Visit `https://YOUR-APP.vercel.app/api/auth/seed` once after deploy.

---

## Environment Variables

```env
# Neon PostgreSQL (from neon.tech dashboard)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-secret-here"
```

---

## Project Structure

```
app/
├── api/               # All API routes (REST)
│   ├── auth/          # Admin login/logout/seed
│   ├── employees/     # Employee CRUD + stats
│   ├── clients/       # Client CRUD + portal password
│   ├── tasks/         # Internal task CRUD
│   ├── client-tasks/  # Client task CRUD
│   ├── attendance/    # Attendance calendar
│   ├── portal/        # Client portal auth + data
│   └── employee-portal/ # Employee portal auth + data
├── dashboard/         # Admin dashboard pages
│   ├── page.tsx       # Overview
│   ├── employees/     # Employee list + detail + attendance
│   ├── clients/       # Client list + detail
│   ├── tasks/         # All tasks
│   └── performance/   # Employee performance stats
├── portal/            # Client portal (read-only)
├── employee-portal/   # Employee portal (submit tasks)
├── login/             # Admin login
├── client-login/      # Client login
└── employee-login/    # Employee login
```

---

## Portal Login URLs

| Portal | URL |
|--------|-----|
| Admin | `/login` |
| Client | `/client-login` |
| Employee | `/employee-login` |
