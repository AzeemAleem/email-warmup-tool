# Email Warmup Tool

A full-stack email warmup automation tool that builds Gmail account reputation by simulating human-like email interactions.

## Architecture

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes + separate Node.js worker process
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: BullMQ + Redis
- **Email**: Gmail SMTP (nodemailer) + IMAP (imapflow)
- **AI Content**: Gemini (primary) + Groq (fallback)
- **Process Management**: PM2

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance
- Gmail accounts with 2FA enabled + App Passwords generated
- Gemini API key (free tier) and/or Groq API key (free tier)

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/email_warmup"
REDIS_URL="redis://localhost:6379"
ENCRYPTION_KEY="<64-char hex key>"   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
GEMINI_API_KEY="your-key"
GROQ_API_KEY="your-key"              # optional fallback
SESSION_SECRET="<random 32+ chars>"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your-strong-password"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database setup

```bash
npx prisma migrate dev --name init
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

## Running

### Development

**Terminal 1 — Next.js web server:**
```bash
npm run dev
```

**Terminal 2 — Background worker:**
```bash
npm run worker:dev
```

### Production (PM2)

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
```

## How it works

1. **Daily Planner** (midnight cron): Computes trust weights and daily send volumes for all active accounts, creates `WarmupEvent` rows with scattered `scheduledFor` timestamps.

2. **SMTP Worker** (every 5 min): Picks up `QUEUED` events due for sending, sends via Gmail SMTP, marks `SENT`.

3. **IMAP Worker** (every 7 min): Polls each account's INBOX for unread warmup emails → marks `OPENED`, probabilistically sends replies. Checks `[Gmail]/Spam` → moves warmup mail back to INBOX and marks `RESCUED_FROM_SPAM`.

4. **Trust Weight**: NEW accounts start at 0 and ramp linearly over `rampUpDays` to 1.0. OLD accounts start at 1.0. This controls send volume.

5. **Weighted Pairing**: Low-trust (new) accounts receive proportionally more mail from trusted senders — exactly the signal that builds reputation fastest.

## Dashboard

Access at `http://localhost:3000` after logging in.

- **Dashboard**: Pool health, 14-day activity chart
- **Accounts**: Add/pause/resume/remove accounts
- **Config**: Adjust all warmup parameters
- **Events**: Searchable event log with status badges

## Security

- App passwords are AES-256-GCM encrypted at rest
- Dashboard protected by session-based auth
- Never store or log plaintext app passwords
- Accounts set to ERROR on auth failure, require manual re-activation
