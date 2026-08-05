"use client";

import { useState } from "react";
import { WarmupConfig } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

interface ConfigFormProps {
  config: WarmupConfig;
}

export function ConfigForm({ config }: ConfigFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    rampUpDays: config.rampUpDays,
    startVolumePerDay: config.startVolumePerDay,
    maxVolumePerDay: config.maxVolumePerDay,
    minDelayBetweenSendsMs: config.minDelayBetweenSendsMs,
    maxDelayBetweenSendsMs: config.maxDelayBetweenSendsMs,
    replyProbability: config.replyProbability,
    spamRescueEnabled: config.spamRescueEnabled,
    activeHourStart: config.activeHourStart,
    activeHourEnd: config.activeHourEnd,
    minPairCooldownHours: config.minPairCooldownHours,
    aiProvider: config.aiProvider,
    timezone: config.timezone,
    maxInboundPerReceiverPerDay: config.maxInboundPerReceiverPerDay,
    maxInboundPerReceiverPerHour: config.maxInboundPerReceiverPerHour,
    minGapBetweenInboundMs: config.minGapBetweenInboundMs,
    maxSendsPerTick: config.maxSendsPerTick,
    maxSendsToSameReceiverPerTick: config.maxSendsToSameReceiverPerTick,
    maxOldDailySendsWhenFewNew: config.maxOldDailySendsWhenFewNew,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
            ? parseFloat(value)
            : value,
    }));
    setSuccess(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save config");
      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1";
  const hintClass = "text-xs text-gray-500 mt-1";

  const gapHours = (form.minGapBetweenInboundMs / 3600000).toFixed(
    form.minGapBetweenInboundMs % 3600000 === 0 ? 0 : 1
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <h3 className="text-sm font-semibold text-amber-300 mb-1">
          Deliverability safety (live — used by Contabo worker)
        </h3>
        <p className={hintClass + " mb-4"}>
          These are the real Google-safe limits. Saving here updates what the
          worker enforces. Restart/rebuild plan on Contabo after big changes.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Max inbound / inbox / day</label>
            <input
              name="maxInboundPerReceiverPerDay"
              type="number"
              min={1}
              max={20}
              value={form.maxInboundPerReceiverPerDay}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>
              How many warmup mails one inbox may receive per day (e.g. George ≤
              3)
            </p>
          </div>
          <div>
            <label className={labelClass}>Max inbound / inbox / hour</label>
            <input
              name="maxInboundPerReceiverPerHour"
              type="number"
              min={1}
              max={10}
              value={form.maxInboundPerReceiverPerHour}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>Hard cap per rolling hour</p>
          </div>
          <div>
            <label className={labelClass}>
              Min gap same inbox (ms) — now {gapHours}h
            </label>
            <input
              name="minGapBetweenInboundMs"
              type="number"
              min={600000}
              step={600000}
              value={form.minGapBetweenInboundMs}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>
              7200000 = 2 hours between any two warmup mails into the same inbox
            </p>
          </div>
          <div>
            <label className={labelClass}>
              Max OLD sends/day when few NEW
            </label>
            <input
              name="maxOldDailySendsWhenFewNew"
              type="number"
              min={1}
              max={20}
              value={form.maxOldDailySendsWhenFewNew}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>
              Extra ceiling per OLD account when NEW pool is small
            </p>
          </div>
          <div>
            <label className={labelClass}>Max sends per worker tick</label>
            <input
              name="maxSendsPerTick"
              type="number"
              min={1}
              max={10}
              value={form.maxSendsPerTick}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>
              Worker wakes ~every 5 min; this is max emails sent in that wake-up
              (whole system)
            </p>
          </div>
          <div>
            <label className={labelClass}>
              Max to same receiver per tick
            </label>
            <input
              name="maxSendsToSameReceiverPerTick"
              type="number"
              min={1}
              max={5}
              value={form.maxSendsToSameReceiverPerTick}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>
              Prevents 3 OLD accounts all hitting George in the same 5-min tick
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">
          Ramp-up (send targets — still capped by safety above)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ramp-up Days</label>
            <input
              name="rampUpDays"
              type="number"
              min={7}
              max={90}
              value={form.rampUpDays}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>Days for a NEW account to reach full trust</p>
          </div>
          <div>
            <label className={labelClass}>Start Volume / Day (NEW)</label>
            <input
              name="startVolumePerDay"
              type="number"
              min={1}
              max={10}
              value={form.startVolumePerDay}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>Day-1 send target before safety caps</p>
          </div>
          <div>
            <label className={labelClass}>Max Volume / Day (send ceiling)</label>
            <input
              name="maxVolumePerDay"
              type="number"
              min={1}
              max={50}
              value={form.maxVolumePerDay}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>
              Per-account send ceiling. Real inbound to NEW is limited by
              &quot;Max inbound / day&quot; above.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">
          Timing & delays (same sender)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Min delay between sends (ms)</label>
            <input
              name="minDelayBetweenSendsMs"
              type="number"
              min={60000}
              step={60000}
              value={form.minDelayBetweenSendsMs}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>
              Same account only — e.g. 180000 = 3 min (inbox gap above is
              separate)
            </p>
          </div>
          <div>
            <label className={labelClass}>Max delay between sends (ms)</label>
            <input
              name="maxDelayBetweenSendsMs"
              type="number"
              min={120000}
              step={60000}
              value={form.maxDelayBetweenSendsMs}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>Random gap upper bound when planning the day</p>
          </div>
          <div>
            <label className={labelClass}>Active hour start (0–23)</label>
            <input
              name="activeHourStart"
              type="number"
              min={0}
              max={23}
              value={form.activeHourStart}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Active hour end (0–23)</label>
            <input
              name="activeHourEnd"
              type="number"
              min={1}
              max={23}
              value={form.activeHourEnd}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Pair cooldown (hours)</label>
            <input
              name="minPairCooldownHours"
              type="number"
              min={1}
              max={48}
              value={form.minPairCooldownHours}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>Same A→B pair wait time</p>
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <input
              name="timezone"
              value={form.timezone}
              onChange={handleChange}
              placeholder="UTC"
              className={inputClass}
            />
            <p className={hintClass}>e.g. Asia/Karachi, UTC</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Behavior</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Reply probability (0–1)</label>
            <input
              name="replyProbability"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={form.replyProbability}
              onChange={handleChange}
              className={inputClass}
            />
            <p className={hintClass}>
              After open: chance to reply in the same Gmail thread (2–45 min
              later)
            </p>
          </div>
          <div>
            <label className={labelClass}>AI Provider</label>
            <select
              name="aiProvider"
              value={form.aiProvider}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="gemini">Gemini (recommended, free tier)</option>
              <option value="groq">Groq (free tier fallback)</option>
              <option value="none">None (use static templates)</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <input
              name="spamRescueEnabled"
              type="checkbox"
              checked={form.spamRescueEnabled}
              onChange={handleChange}
              id="spamRescueEnabled"
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor="spamRescueEnabled"
              className="text-sm text-gray-300 cursor-pointer"
            >
              Enable spam rescue (Spam → Inbox for warmup mail)
            </label>
          </div>
        </div>
      </Card>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
          Saved. Contabo worker picks this up on the next tick; run{" "}
          <code className="text-xs">npm run worker:rebuild-plan</code> if you
          want today&apos;s queue rebuilt now.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
      >
        {loading ? "Saving..." : "Save Configuration"}
      </button>
    </form>
  );
}
