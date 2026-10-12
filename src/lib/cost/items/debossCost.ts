import { makeFixedJobCostItem, parseFixedJobTotal } from "./fixedJobCost";

export const parseDebossTotal = parseFixedJobTotal;

export const debossCostItem = makeFixedJobCostItem({
  id: "deboss",
  label: "Deboss",
  getEnabled: (ctx) => ctx.debossEnabled,
  getManualTotal: (ctx) => ctx.debossManualTotal,
  getFixedCost: (ctx) => ctx.config.deboss.fixedCost,
});
