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
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
  const hintClass = "text-xs text-gray-600 mt-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Ramp-up Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ramp-up Days</label>
            <input name="rampUpDays" type="number" min={7} max={90} value={form.rampUpDays} onChange={handleChange} className={inputClass} />
            <p className={hintClass}>Days for a new account to reach full volume</p>
          </div>
          <div>
            <label className={labelClass}>Start Volume / Day</label>
            <input name="startVolumePerDay" type="number" min={1} max={10} value={form.startVolumePerDay} onChange={handleChange} className={inputClass} />
            <p className={hintClass}>Sends per day on day 1 for new accounts</p>
          </div>
          <div>
            <label className={labelClass}>Max Volume / Day</label>
            <input name="maxVolumePerDay" type="number" min={5} max={50} value={form.maxVolumePerDay} onChange={handleChange} className={inputClass} />
            <p className={hintClass}>Hard cap per account per day (≤50 recommended)</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Timing & Delays</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Min Delay Between Sends (ms)</label>
            <input name="minDelayBetweenSendsMs" type="number" min={60000} step={60000} value={form.minDelayBetweenSendsMs} onChange={handleChange} className={inputClass} />
            <p className={hintClass}>Default: 180000 (3 min)</p>
          </div>
          <div>
            <label className={labelClass}>Max Delay Between Sends (ms)</label>
            <input name="maxDelayBetweenSendsMs" type="number" min={120000} step={60000} value={form.maxDelayBetweenSendsMs} onChange={handleChange} className={inputClass} />
            <p className={hintClass}>Default: 900000 (15 min)</p>
          </div>
          <div>
            <label className={labelClass}>Active Hour Start (0–23)</label>
            <input name="activeHourStart" type="number" min={0} max={23} value={form.activeHourStart} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Active Hour End (0–23)</label>
            <input name="activeHourEnd" type="number" min={1} max={23} value={form.activeHourEnd} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Pair Cooldown (hours)</label>
            <input name="minPairCooldownHours" type="number" min={1} max={48} value={form.minPairCooldownHours} onChange={handleChange} className={inputClass} />
            <p className={hintClass}>Min hours before same pair can exchange again</p>
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <input name="timezone" value={form.timezone} onChange={handleChange} placeholder="UTC" className={inputClass} />
            <p className={hintClass}>e.g. America/New_York, Europe/London</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Behavior</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Reply Probability (0–1)</label>
            <input name="replyProbability" type="number" min={0} max={1} step={0.05} value={form.replyProbability} onChange={handleChange} className={inputClass} />
            <p className={hintClass}>e.g. 0.35 = 35% chance of reply per opened mail</p>
          </div>
          <div>
            <label className={labelClass}>AI Provider</label>
            <select name="aiProvider" value={form.aiProvider} onChange={handleChange} className={inputClass}>
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
            <label htmlFor="spamRescueEnabled" className="text-sm text-gray-300 cursor-pointer">
              Enable spam rescue (move warmup mail from Spam → Inbox automatically)
            </label>
          </div>
        </div>
      </Card>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
          Configuration saved successfully.
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
