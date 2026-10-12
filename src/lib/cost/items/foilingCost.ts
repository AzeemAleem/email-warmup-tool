import { makeFixedJobCostItem, parseFixedJobTotal } from "./fixedJobCost";

export const parseFoilingTotal = parseFixedJobTotal;

export const foilingCostItem = makeFixedJobCostItem({
  id: "foiling",
  label: "Silver / Gold Foiling",
  getEnabled: (ctx) => ctx.foilingEnabled,
  getManualTotal: (ctx) => ctx.foilingManualTotal,
  getFixedCost: (ctx) => ctx.config.foiling.fixedCost,
});
