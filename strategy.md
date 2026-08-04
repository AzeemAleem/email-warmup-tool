# Email Warmup Strategy

This document explains exactly how the warmup engine decides **who sends to whom, how often, when, and how the receiving side behaves**. Every number here comes straight from the code (`src/lib/warmup-strategy.ts`, `src/worker/*`) and the default `WarmupConfig`.

---

## 1. The core idea

A pool of Gmail accounts email each other like real people. The system builds sender reputation through **behavioral signals**, not volume:

- Trusted (OLD) accounts send mail to untrusted (NEW) accounts.
- Receivers wait, open, sometimes reply, and rescue anything that lands in Spam.
- Volume ramps up gradually per account over weeks.
- Everything is randomized (timing, volume, content) so patterns never look automated.

The pool is **dynamic** — add or remove accounts anytime and all math recomputes automatically the next cycle. Nothing is hardcoded to a fixed pool size.

---

## 2. Default configuration (editable on the Config page)

| Setting | Default | Meaning |
|--------|---------|---------|
| `rampUpDays` | 28 | Days for a NEW account to reach full trust |
| `startVolumePerDay` | 2 | Day-1 sends for a new account |
| `maxVolumePerDay` | 40 | Hard cap per account per day |
| `minDelayBetweenSendsMs` | 180000 (3 min) | Minimum gap between two sends from the same account |
| `maxDelayBetweenSendsMs` | 900000 (15 min) | Maximum gap (jitter ceiling) |
| `replyProbability` | 0.35 | Chance a receiver replies after opening |
| `activeHourStart` | 8 | No sends before 8:00 |
| `activeHourEnd` | 20 | No sends after 20:00 |
| `minPairCooldownHours` | 6 | Same pair can't exchange again within 6h |
| `spamRescueEnabled` | true | Move warmup mail out of Spam automatically |
| `aiProvider` | gemini | Content generator (Gemini → Groq fallback) |

---

## 3. The three engines (background worker)

The worker (`npm run worker:dev`) runs three independent loops. The frontend never triggers sends.

| Engine | Schedule | Job |
|--------|----------|-----|
| **Daily Planner** | Midnight (cron) + on startup | Recompute trust + volume for every account, generate the day's send slots as `WarmupEvent` rows |
| **SMTP Worker** | Every 5 min | Send any `QUEUED` event whose `scheduledFor <= now` |
| **IMAP Worker** | Every 7 min | Open unread warmup mail, roll replies, rescue from Spam |

---

## 4. Trust weight (per account, recomputed daily)

```
if role == OLD:
    trustWeight = 1.0                      # fully trusted from day 1
else: # NEW
    daysInWarmup = today - warmupStartedAt
    trustWeight = min(1.0, daysInWarmup / rampUpDays)
```

So a NEW account climbs linearly from 0 → 1.0 over 28 days.

| NEW account age | trustWeight |
|-----------------|-------------|
| Day 1 | 0.04 |
| Day 7 | 0.25 |
| Day 14 | 0.50 |
| Day 21 | 0.75 |
| Day 28+ | 1.00 |

---

## 5. Daily send volume (per account, recomputed daily)

```
baseVolume     = startVolumePerDay + (maxVolumePerDay - startVolumePerDay) * trustWeight
poolSizeFactor = clamp(totalActiveAccounts / 10, 0.5, 2.0)
volume         = round(baseVolume * poolSizeFactor)
volume         = volume ± up to 15% random jitter
dailyTarget    = min(volume, maxVolumePerDay)     # never exceed the cap
```

**Why `poolSizeFactor`:** a bigger pool can safely absorb a bit more traffic per account; a tiny pool throttles harder. With 10 active accounts the factor is exactly 1.0.

> Note: The `Target/day` shown right after you add an account is just a **seed value** (10 for OLD, 2 for NEW). The real number is calculated by the Daily Planner at midnight (or on worker startup) using the formula above.

---

## 6. Who sends to whom (recipient selection)

Pairing is role-aware:

| Sender role | Allowed recipients |
|-------------|-------------------|
| **OLD** | **NEW only** — never OLD → OLD |
| **NEW** | Prefer **OLD** (natural outbound to trusted inboxes); other NEW only if no OLD is available |

Among allowed candidates, exclude any pair A→B that exchanged mail in the last 6h (cooldown), then pick by weighted random:

```
weight(B) = (1 - trustWeight(B)) * 0.7 + 0.3
```

So among NEW receivers, lower-trust (newer) accounts still get slightly more inbound mail — the fastest reputation builder.

---

## 7. When sends happen (timing)

For each account, the planner scatters its `dailyTarget` sends across the active window (08:00–20:00):

- First send starts at a random offset after 08:00.
- Each subsequent send is spaced by a **random gap between 3 and 15 minutes** (avg ~9 min).
- The list is shuffled, so order isn't predictable.
- The SMTP worker additionally **enforces the 3-min minimum** at send time — even a manual restart can't fire two sends from one account back-to-back.

Example gap sequence for one account: `+4m, +11m, +6m, +14m, +3m, +9m …`

---

## 8. Receiver behavior (IMAP worker)

Every 7 minutes, for each active account:

1. **Spam rescue first (highest priority, never rate-limited):**
   Scan `[Gmail]/Spam`. Any message from a pool sender → move to INBOX, mark event `RESCUED_FROM_SPAM`. This runs every cycle regardless of daily caps.

2. **Open unread warmup mail:**
   Find unread INBOX mail matching a known warmup event → mark `\Seen`, wait a human-like **1–10 min**, then mark the event `OPENED`.

3. **Reply roll:**
   After opening, roll `replyProbability` (0.35). On a hit, schedule an AI-generated reply **2–45 min later**, sent receiver→sender with correct `In-Reply-To`/`References` headers so it threads in Gmail. The event becomes `REPLIED`.

---

## 9. Content generation

- Emails are drawn from a cached pool of ~50–100 AI-generated templates (`ContentTemplate` table), refreshed by a daily batch of 20 new generations — this respects free-tier limits and keeps sending fast.
- Primary: **Gemini** (`gemini-2.5-flash`). Fallback on quota error: **Groq** (`llama-3.3-70b-versatile`). If both fail: a built-in static template pool.
- Prompts force varied subjects, greetings, sign-offs, and tone, and avoid spam-trigger words (free, guarantee, click here, act now, limited time, winner).

---

## 10. Safety rules (hard-coded, not optional)

1. **Volume cap** — `maxVolumePerDay` is capped at 40–50, far below Gmail's ~500/day ceiling.
2. **Full randomization** — no two sends equally spaced, no two bodies identical, ±15% daily volume jitter.
3. **Error backoff** — on SMTP/IMAP auth failure or rate-limit, the account is set to `ERROR`, `dailyTargetVolume = 0`, and requires **manual re-activation** from the dashboard.
4. **Slow-ramp is enforced** — a NEW account can't be given a day-1 volume above `startVolumePerDay`.
5. **Business hours only** — nothing sends outside 08:00–20:00.
6. **No IP warmup** — irrelevant when relaying through Gmail SMTP; only account-level behavior matters.

---

## 11. Full worked example — 5 OLD + 10 NEW accounts

**Pool:** 15 active accounts → `poolSizeFactor = clamp(15/10, 0.5, 2.0) = 1.5`

### 11.1 Per-account daily volume

**OLD accounts (trustWeight = 1.0):**
```
baseVolume = 2 + (40-2)*1.0 = 40
× 1.5      = 60
cap 40     → 40 sends/day  (each of the 5 old accounts)
```

**NEW accounts (depends on age):**

| NEW age | trustWeight | base | ×1.5 | after cap + jitter | sends/day |
|---------|-------------|------|------|--------------------|-----------|
| Day 1 | 0.04 | 3.4 | 5.1 | 5 | **~4–6** |
| Day 7 | 0.25 | 11.5 | 17.3 | 17 | **~15–20** |
| Day 14 | 0.50 | 21.0 | 31.5 | 32 | **~27–37** |
| Day 21 | 0.75 | 30.5 | 45.8 | 40 (capped) | **~40** |
| Day 28 | 1.00 | 40.0 | 60.0 | 40 (capped) | **~40** |

### 11.2 Pool totals over the ramp

Assuming all 10 new accounts start together:

| Phase | 5 OLD send | 10 NEW send | Total sends/day (pool) |
|-------|-----------|-------------|------------------------|
| Day 1 | 5 × 40 = 200 | 10 × 5 = 50 | **~250** |
| Day 7 | 200 | 10 × 17 = 170 | **~370** |
| Day 14 | 200 | 10 × 32 = 320 | **~520** |
| Day 21 | 200 | 10 × 40 = 400 | **~600** |
| Day 28+ | 200 | 400 | **~600 (steady state)** |

### 11.3 Where the mail flows (direction)

Recipient selection weights (from §6):
- Picking an **OLD** receiver: weight 0.30
- Picking a **NEW day-1** receiver: weight 0.97

With 5 old + 10 new, when any account sends, the summed candidate weights roughly split so that **~75–80% of all early-phase mail lands in NEW inboxes** and only ~20–25% goes to OLD inboxes. Exactly what you want: new accounts get flooded with legitimate, trusted inbound mail.

Early-ramp flow picture:

```
        OLD1 ─┐
        OLD2 ─┤   ~80% of volume        ┌─► NEW1 .. NEW10   (new accounts
        OLD3 ─┼──────────────────────►  │    absorb most inbound — builds
        OLD4 ─┤                          └─► reputation fastest)
        OLD5 ─┘
          ▲          ~20% of volume
          └──────────────  NEW accounts also send some mail back to OLD
                           and to each other (weighted, cooldown-limited)
```

As new accounts age, their trustWeight rises, their selection weight falls toward 0.30, and traffic rebalances evenly across the whole pool.

### 11.4 A single old account's day (e.g. OLD1, 40 sends)

- Window: 08:00–20:00 (12h = 720 min).
- 40 sends × avg 9-min gap ≈ 360 min of activity, scattered and shuffled across the window.
- Each send picks a recipient (mostly NEW accounts), respecting the 6h pair cooldown so OLD1 won't hit the same mailbox twice within 6 hours.
- Example timeline:

```
08:03  OLD1 → NEW4     "Quick update"
08:14  OLD1 → NEW9     "Following up"
08:22  OLD1 → NEW1     "Meeting notes"
08:36  OLD1 → NEW7     "Checking in"
08:41  OLD1 → OLD3     "Re: notes"        (occasional old→old)
08:52  OLD1 → NEW2     ...
   ... continues, 3–15 min apart, until ~40 sends placed ...
19:48  OLD1 → NEW6     (last slot of the day)
```

### 11.5 What happens on the receiving side

For each of those ~250–600 daily messages:
- Receiver's IMAP poll (within ~7 min) opens it after a 1–10 min human delay → `OPENED`.
- ~35% of opened mail triggers a reply 2–45 min later → `REPLIED` (threaded correctly).
- Anything caught in Spam is moved to Inbox every poll cycle → `RESCUED_FROM_SPAM`.

---

## 12. Adding / removing accounts mid-flight

- **Add an account** → it becomes ACTIVE immediately; the next Daily Planner run includes it, recomputes `poolSizeFactor` for everyone, and starts routing mail to/from it.
- **Remove an account** → status `REMOVED`, excluded from all future planning; `poolSizeFactor` shrinks and every remaining account's volume adjusts down slightly next cycle.
- No code changes, no restarts required — the pool is fully self-adjusting.

---

## 13. Minimum requirements to actually run

- **At least 2 ACTIVE accounts** or the planner logs "Not enough active accounts" and does nothing.
- A realistic pool is **a few OLD + several NEW** so trusted senders exist to build the new accounts' reputation.
- Recommended real-world mix: 2–5 aged accounts + however many new accounts you're warming, per 28-day cycle.
