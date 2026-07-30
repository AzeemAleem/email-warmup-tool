# Cursor AI Build Prompt — Email Warmup Automation Tool

Paste everything below into Cursor as your project prompt / initial instructions.

---

## Project overview

Build a full-stack **email warmup automation tool** with:

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Node.js (can live inside Next.js API routes or a separate Express service — prefer a separate Node service so the scheduler can run independently of the web server)
- **Database:** PostgreSQL with Prisma ORM
- **Queue/Scheduler:** BullMQ + Redis for job scheduling, `node-cron` for the daily plan generator
- **Email transport:** Gmail SMTP (`smtp.gmail.com:465`) for sending via `nodemailer`, Gmail IMAP (`imap.gmail.com:993`) via `imapflow` for reading/replying/spam-rescue, authenticated with **App Passwords** (2FA-enabled accounts)
- **AI content generation:** Google Gemini API free tier (`@google/generative-ai` or REST) as primary provider, Groq free tier (OpenAI-compatible endpoint, e.g. `llama-3.3-70b-versatile`) as fallback if Gemini quota is hit. Do NOT hardcode OpenAI as a dependency — OpenAI has no indefinite free API tier as of 2026, requires a card, and should only be an optional paid provider behind a feature flag.
- **Background execution:** must run as a persistent worker process (PM2, or a Docker container with a long-running Node process) — NOT triggered by a user visiting a page. The scheduler ticks continuously (e.g. every 5–15 minutes) and decides for itself when to fire sends based on the daily plan, independent of anyone using the frontend.

---

## Core concept

This is a mailbox warmup system. A pool of "old" (trusted, aged) Gmail accounts and "new" (freshly created, need reputation) Gmail accounts send emails to each other on a schedule, then act like real humans on the receiving end: read the message after a delay, sometimes reply, and if anything lands in Spam, move it to Inbox and mark "Not Spam." Volume per account ramps up gradually over weeks. The account pool is NOT fixed — accounts can be added or removed at any time from the frontend, and all scheduling math must recompute automatically from whatever the current pool looks like. Nothing should be hardcoded to "5 old + 5 new."

---

## Database schema (Prisma)

```prisma
model Account {
  id                String   @id @default(cuid())
  email             String   @unique
  displayName       String?
  role              String   // "OLD" | "NEW"
  provider          String   @default("gmail")
  appPassword       String   // encrypted at rest (see security section)
  imapHost          String   @default("imap.gmail.com")
  imapPort          Int      @default(993)
  smtpHost          String   @default("smtp.gmail.com")
  smtpPort          Int      @default(465)
  status            String   @default("ACTIVE") // ACTIVE | PAUSED | ERROR | REMOVED
  warmupStartedAt   DateTime @default(now())
  trustWeight       Float    @default(0)   // 0.0–1.0, computed daily
  dailyTargetVolume Int      @default(0)    // recomputed daily by scheduler
  sentToday         Int      @default(0)
  lastError         String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  sentEvents        WarmupEvent[] @relation("SenderEvents")
  receivedEvents    WarmupEvent[] @relation("ReceiverEvents")
}

model WarmupEvent {
  id            String   @id @default(cuid())
  senderId      String
  receiverId    String
  sender        Account  @relation("SenderEvents", fields: [senderId], references: [id])
  receiver      Account  @relation("ReceiverEvents", fields: [receiverId], references: [id])
  subject       String
  bodyPreview   String
  messageId     String?  // IMAP message-id once discovered
  status        String   @default("QUEUED") // QUEUED | SENT | DELIVERED | OPENED | REPLIED | RESCUED_FROM_SPAM | FAILED
  scheduledFor  DateTime
  sentAt        DateTime?
  openedAt      DateTime?
  repliedAt     DateTime?
  landedInSpam  Boolean  @default(false)
  rescuedAt     DateTime?
  createdAt     DateTime @default(now())
}

model WarmupConfig {
  id                    String  @id @default("singleton")
  rampUpDays            Int     @default(28)   // days to reach full volume
  startVolumePerDay     Int     @default(2)
  maxVolumePerDay       Int     @default(40)
  minDelayBetweenSendsMs Int    @default(180000)  // 3 min
  maxDelayBetweenSendsMs Int    @default(900000)  // 15 min
  replyProbability      Float   @default(0.35)
  spamRescueEnabled     Boolean @default(true)
  activeHourStart       Int     @default(8)   // don't send before 8am local
  activeHourEnd         Int     @default(20)  // don't send after 8pm local
  aiProvider            String  @default("gemini") // gemini | groq | none
  updatedAt             DateTime @updatedAt
}

```

---

## Dynamic ramp-up & pairing strategy (must scale automatically with pool size)

Implement this exactly — it's what makes the system self-adjusting when accounts are added/removed:

### 1. Trust weight (per account, recomputed daily)

```
daysInWarmup = today - account.warmupStartedAt
if account.role === "OLD":
    trustWeight = 1.0   // old accounts start fully trusted
else:
    trustWeight = min(1.0, daysInWarmup / rampUpDays)

```

### 2. Daily target volume (per account, recomputed daily at midnight by a cron job)

```
baseVolume = startVolumePerDay + (maxVolumePerDay - startVolumePerDay) * trustWeight
poolSizeFactor = clamp(totalActiveAccounts / 10, 0.5, 2.0)  // more accounts in pool = each can safely send/receive a bit more, fewer = throttle harder
dailyTargetVolume = round(baseVolume * poolSizeFactor)

```

This means: add a 6th old account → poolSizeFactor shifts → every account's volume recalculates automatically next cycle. No code changes needed when the pool grows or shrinks.

### 3. Recipient selection (weighted round robin, computed per send)

For each send slot from account A:

- Build a candidate list of all other ACTIVE accounts.
- Weight each candidate by `(1 - candidate.trustWeight) * 0.7 + 0.3` — this biases new/low-trust accounts to receive proportionally MORE incoming mail from trusted senders early on (since inbound mail from trusted senders is what builds their reputation fastest), while still giving some traffic to everyone.
- Exclude any pair that already exchanged mail in the last `minPairCooldownHours` (default 6h) to avoid repetitive-looking threads.
- Pick via weighted random selection.

### 4. Scheduling within the day

- Each morning, the daily-plan job generates `dailyTargetVolume` send slots per account, scattered as random timestamps between `activeHourStart` and `activeHourEnd`, with a minimum gap of `minDelayBetweenSendsMs` and jitter up to `maxDelayBetweenSendsMs` between any two sends from the SAME account.
- Store these as BullMQ delayed jobs (or rows in a `WarmupEvent` table with `status=QUEUED` and `scheduledFor`, polled by a cron tick every 5 minutes that fires anything due).
- Never batch-send. Never fire multiple sends from the same account within the minimum delay window, even if the user manually triggers a "run now."

### 5. Reply logic

- After a `WarmupEvent` is marked OPENED (see IMAP worker below), roll `replyProbability`. If it hits, schedule a reply from receiver → sender, 2–45 minutes later, using AI-generated reply content that references the original subject/thread (In-Reply-To / References headers set correctly so it threads properly in Gmail).

### 6. Spam rescue

- The IMAP worker checks the account's `[Gmail]/Spam` folder on every poll cycle. Any message found there that matches a known `WarmupEvent.messageId` (or sender domain from the pool) gets moved to Inbox and flagged `\Seen` removed→added appropriately, mimicking a human opening then marking "not spam." This is the single highest-value signal for the whole system — never skip it, and never rate-limit it out of the plan (it should run every poll cycle, independent of the daily volume caps).

---

## AI content generation

Use Gemini (`gemini-2.5-flash` or newer available free-tier model — check current model names in Google AI Studio at build time, do not hardcode an old model name blindly) as primary. Fall back to Groq (`llama-3.3-70b-versatile` or current equivalent) if Gemini returns a quota error.

Prompt template for generating a warmup email (subject + body):

```
Generate a short, natural, plausible business/personal email. It should read like a real
1-2 person email exchange - varied subject lines, varied greetings, varied sign-offs.
Avoid spam trigger words (free, guarantee, click here, act now, limited time, winner).
Keep it under 120 words. Vary tone across calls: some casual, some professional, some
brief one-liners, some slightly longer. Do not use the same template structure twice.
Return JSON: {"subject": "...", "body": "..."}

```

Cache/rotate a pool of ~50–100 generated templates in the DB (`ContentTemplate` model) refreshed periodically (e.g. daily batch job of 20 new generations) rather than calling the AI API on every single send — this respects free-tier rate limits and speeds up sending.

---

## Rate-limit / deliverability safety rules (hard constraints, not suggestions)

1. **Never exceed Gmail's practical daily sending caps.** Regular Gmail accounts have a documented daily sending limit (historically ~500/day for regular accounts, lower for brand-new accounts) — cap `maxVolumePerDay` well under that (e.g. 40–50 max) since warmup volume should never approach the platform ceiling.
2. **Randomize everything.** No two sends from the same account should ever be exactly N seconds apart. No two email bodies should be identical. No fixed daily send count — add ±15% jitter to `dailyTargetVolume` itself each day.
3. **Respect account-level backoff on errors.** If SMTP/IMAP auth fails or Gmail returns a rate-limit/temporary-block response, set `status=ERROR`, `dailyTargetVolume=0` for that account, and require manual re-activation from the dashboard rather than silently retrying.
4. **Slow ramp for new accounts is non-negotiable in code** — do not expose a UI control that lets a user set a new account's day-1 volume above `startVolumePerDay`. Old accounts can be configured higher since they already have reputation.
5. **Business hours only** — never schedule sends outside `activeHourStart`–`activeHourEnd` in a sensible timezone (make timezone a per-account or global config field).
6. **This is Gmail-relayed mail, so there is no application-controlled sending IP to "warm."** Don't build IP-rotation logic — it's not the lever that matters here. Focus entirely on account-level behavioral signals (volume ramp, replies, spam rescue, timing randomness).

---

## Frontend (Next.js) requirements

Pages/components:

1. **Dashboard** — pool health overview: total accounts, old vs new counts, today's volume plan, chart of sent/opened/replied/rescued-from-spam over last 14 days.
2. **Accounts page** — table of all accounts with status, role (old/new), trust weight, daily target, sent today, last error. Actions: pause/resume, remove, edit.
3. **Add account modal/form** — fields: email, display name, role (old/new — auto-detected as suggestion but user can override), app password (masked input, never displayed again after save), IMAP/SMTP host/port (prefilled with Gmail defaults, editable for future non-Gmail support). On submit, backend does a live IMAP+SMTP auth test before saving and shows clear pass/fail feedback.
4. **Config page** — edit `WarmupConfig` fields (ramp days, volume caps, delay ranges, reply probability, active hours, AI provider).
5. **Event log / activity feed** — searchable/filterable list of `WarmupEvent` rows with status badges.
6. **No manual "send now" trigger for the actual warmup flow** — the whole point is it runs unattended in the background via the scheduler. The frontend is purely for configuration and monitoring, not for firing sends.

Design: clean, data-dense admin dashboard aesthetic — sidebar nav, card-based stat summaries, status color-coding (green=active/healthy, amber=ramping/new, red=error/paused), a simple line/bar chart for volume trends (recharts). Keep it fast and unopinionated — this is an internal ops tool, not a marketing site.

---

## Backend / worker requirements

- Separate long-running Node process (`worker.ts`), started via PM2 (`ecosystem.config.js`) or Docker, independent from the Next.js server process — this satisfies the "runs automatically in background, not triggered by visiting the app" requirement.
- `node-cron` job at midnight: recompute `trustWeight` and `dailyTargetVolume` for every active account, generate the day's `WarmupEvent` rows with scattered `scheduledFor` timestamps per the pairing algorithm above.
- BullMQ (Redis-backed) repeatable job every 5 minutes: query `WarmupEvent` rows with `status=QUEUED` and `scheduledFor <= now`, process each: connect via SMTP (nodemailer, pooled connections per account, reused not reconnected every send), send, mark `SENT`.
- Separate BullMQ repeatable job every 5–10 minutes per account: connect via IMAP (imapflow), check INBOX for new unread mail matching known warmup senders → mark `OPENED`, roll reply logic; check `[Gmail]/Spam` → rescue any warmup mail found there → mark `RESCUED_FROM_SPAM`.
- All credentials (`appPassword`) encrypted at rest using a symmetric key from env vars (e.g. AES-256-GCM via Node's `crypto` module) — never store plaintext app passwords in the DB.
- Structured logging (pino or similar) for every send/read/rescue action, plus error logging with account context for the dashboard's "last error" field.
- `.env.example` covering: `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`.

---

## Build order (tell Cursor to do this incrementally, verifying each step compiles/runs before moving on)

1. Scaffold Next.js + TypeScript + Tailwind app, set up Prisma + Postgres, run initial migration with the schema above.
2. Build the Accounts CRUD API routes + frontend pages (add/edit/remove/list), including the live IMAP/SMTP credential test on account creation.
3. Build the Config page and API route for `WarmupConfig`.
4. Build the ramp-up/trust-weight/pairing logic as a pure, unit-testable module (`lib/warmup-strategy.ts`) — write it so it takes `(accounts[], config)` and returns a daily plan, with no side effects, so it can be tested independently of the scheduler/DB.
5. Wire the daily-plan cron job to call that module and write `WarmupEvent` rows.
6. Build the SMTP send worker (BullMQ) using nodemailer + Gmail app passwords.
7. Build the IMAP read/reply/spam-rescue worker using imapflow.
8. Integrate Gemini (with Groq fallback) for content generation, with the template caching/rotation described above.
9. Build the Dashboard and Event log pages, wired to real data.
10. Add PM2/Docker config so the worker process runs independently and restarts on crash.
11. Add basic auth/login to the dashboard itself (this tool holds app passwords for real inboxes — do not ship it open/unauthenticated, even for personal use).

---

## Explicit non-goals / things not to build

- No IP warmup / dedicated sending IP logic — irrelevant when relaying through Gmail SMTP.
- No OpenAI dependency by default — no free tier exists for it; keep it as an optional paid provider behind a flag only if the user later adds a billed key.
- No public-facing "send now" button that fires real warmup traffic on demand — this should always run on the background schedule only, to keep sending patterns human-like.

