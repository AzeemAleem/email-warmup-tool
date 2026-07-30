"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XMarkIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface CredentialTest {
  smtp: { ok: boolean; error?: string };
  imap: { ok: boolean; error?: string };
  allOk: boolean;
}

export function AddAccountButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<CredentialTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    displayName: "",
    role: "NEW",
    appPassword: "",
    imapHost: "imap.gmail.com",
    imapPort: "993",
    smtpHost: "smtp.gmail.com",
    smtpPort: "465",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setTestResult(null);
    setError(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetch("/api/accounts/test-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          appPassword: form.appPassword,
          smtpHost: form.smtpHost,
          smtpPort: parseInt(form.smtpPort),
          imapHost: form.imapHost,
          imapPort: parseInt(form.imapPort),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setTestResult(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!testResult?.allOk) {
      setError("Please test credentials first and ensure both SMTP and IMAP pass.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imapPort: parseInt(form.imapPort),
          smtpPort: parseInt(form.smtpPort),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add account");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      email: "",
      displayName: "",
      role: "NEW",
      appPassword: "",
      imapHost: "imap.gmail.com",
      imapPort: "993",
      smtpHost: "smtp.gmail.com",
      smtpPort: "465",
    });
    setTestResult(null);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <PlusIcon className="h-4 w-4" />
        Add Account
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-white">Add Account</h2>
              <button onClick={() => { setOpen(false); resetForm(); }} className="text-gray-400 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Gmail Address *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@gmail.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Display Name</label>
                  <input
                    name="displayName"
                    value={form.displayName}
                    onChange={handleChange}
                    placeholder="John Smith"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Role *</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="NEW">NEW (needs warmup)</option>
                    <option value="OLD">OLD (trusted, aged)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    App Password *{" "}
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                      (Generate here)
                    </a>
                  </label>
                  <input
                    name="appPassword"
                    type="password"
                    required
                    value={form.appPassword}
                    onChange={handleChange}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 select-none">
                  Advanced: IMAP/SMTP settings (Gmail defaults pre-filled)
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">IMAP Host</label>
                    <input name="imapHost" value={form.imapHost} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">IMAP Port</label>
                    <input name="imapPort" value={form.imapPort} onChange={handleChange} type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">SMTP Host</label>
                    <input name="smtpHost" value={form.smtpHost} onChange={handleChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">SMTP Port</label>
                    <input name="smtpPort" value={form.smtpPort} onChange={handleChange} type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </details>

              {/* Test credential result */}
              {testResult && (
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    {testResult.smtp.ok ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-400" />
                    )}
                    <span className={testResult.smtp.ok ? "text-green-400" : "text-red-400"}>
                      SMTP: {testResult.smtp.ok ? "Connected" : testResult.smtp.error}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {testResult.imap.ok ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-400" />
                    )}
                    <span className={testResult.imap.ok ? "text-green-400" : "text-red-400"}>
                      IMAP: {testResult.imap.ok ? "Connected" : testResult.imap.error}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              {!testResult?.allOk && (
                <p className="text-xs text-gray-500">
                  Run “Test Credentials” first — the account can only be saved
                  once both SMTP and IMAP connect successfully.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || !form.email || !form.appPassword}
                  className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {testing ? "Testing..." : "Test Credentials"}
                </button>
                <button
                  type="submit"
                  disabled={loading || !testResult?.allOk}
                  title={
                    !testResult?.allOk
                      ? "Test credentials successfully before adding the account"
                      : undefined
                  }
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Adding..." : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
