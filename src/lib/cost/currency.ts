/** PKR formatting helpers for cost UI */

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/** e.g. 146.32 → "146.32 PKR"; 29264 → "29,264 PKR" */
export function formatPkr(amount: number, decimals: number = 2): string {
  if (!Number.isFinite(amount)) return "0 PKR";
  const fixed = decimals === 0 ? Math.round(amount) : roundMoney(amount);
  const formatted = fixed.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} PKR`;
}

/** Totals with thousand separators (keeps 2 decimals when needed) */
export function formatPkrTotal(amount: number): string {
  if (!Number.isFinite(amount)) return "0 PKR";
  // Prefer whole display when amount is an integer (e.g. 29264)
  const rounded = roundMoney(amount);
  const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  return formatPkr(rounded, isWhole ? 0 : 2);
}

/** PKR → USD using a fixed editable rate (PKR per 1 USD). */
export function pkrToUsd(amountPkr: number, usdRate: number): number | null {
  if (!Number.isFinite(amountPkr) || !(usdRate > 0) || !Number.isFinite(usdRate)) {
    return null;
  }
  return roundMoney(amountPkr / usdRate);
}

/** e.g. 123.45 → "$123.45" */
export function formatUsd(amount: number, decimals: number = 2): string {
  if (!Number.isFinite(amount)) return "$0.00";
  const fixed = roundMoney(amount);
  return `$${fixed.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
