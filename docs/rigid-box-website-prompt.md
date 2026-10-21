# Cursor prompt — add the public Rigid Box price calculator

Paste this into Cursor in the **website repo**, with `rigid-box-calculator-spec.md` added to
the repo (e.g. `docs/rigid-box-calculator-spec.md`) and attached to the chat.

---

Build a public **Rigid Box Price Calculator** page in this Next.js (App Router, custom code)
website. Follow `docs/rigid-box-calculator-spec.md` exactly — it is the source of truth for
every formula, constant, rounding rule, default, and edge case. Match this site's existing
theme, layout, components, fonts, and colors; don't introduce a new design system.

**What the visitor sees**
- Inputs: unit (`in` default, `mm`, `cm`; converts values on switch), Length, Width, Height,
  Quantity (whole number ≥ 1), Paper type (Art Paper default / Morocco), Print sides
  (Double default / Single, disabled for Morocco), Print colors (CMYK default / 1 color).
- Finish options: Lamination (**checked** by default, hidden/disabled for Morocco),
  Spot UV, Silver/Gold Foiling, Deboss, Embossing (all unchecked).
- Output only: **Estimated total price** and **Estimated price per unit** (USD), updating
  live (debounced ~300 ms), plus a short "estimate only" disclaimer and a "Request a quote"
  call to action linking to the existing contact flow.
- Never show line items, production vs shipping, base cost, profit, rates, or sheet info.

**Always included silently:** greyboard, paper, die making + cutting, printing, printing
plates, labor, shipping (spec §2, §8).

**Architecture**
- All calculation runs on the server: `app/api/rigid-box/estimate/route.ts` (POST) or a Server
  Action. Put the engine in `lib/rigid-calculator/` with `import "server-only"`.
- Validate input with zod. Respond with
  `{ status: "ok" | "custom_quote" | "invalid", totalUsd, perUnitUsd, notes: string[] }`.
- Keep profit ratio and the USD rate (275) in server config/env (`RIGID_PROFIT_RATIO`,
  `RIGID_USD_RATE`), never in client code.
- Edge cases per spec §11: no sheet fits or the piece is wider than the Morocco roll →
  `custom_quote` (no price). Spot UV is always priced by tier (≤200 fixed 10k; 201–500 @ 50/unit; >500 @ 25/unit).

**Done when**
- Unit tests reproduce the worked example and test vectors in spec §10 exactly
  (e.g. 10×8×3 in, qty 500, defaults → base 674,564.77 PKR; with ratio 1.5 → $3,679.44
  total, $7.36 per unit; foiling adds 10,000 PKR).
- Page is responsive, accessible (labels, keyboard, error messages), and matches the site
  theme.
