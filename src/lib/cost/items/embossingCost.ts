import { makeFixedJobCostItem, parseFixedJobTotal } from "./fixedJobCost";

export const parseEmbossingTotal = parseFixedJobTotal;

export const embossingCostItem = makeFixedJobCostItem({
  id: "embossing",
  label: "Embossing",
  getEnabled: (ctx) => ctx.embossingEnabled,
  getManualTotal: (ctx) => ctx.embossingManualTotal,
  getFixedCost: (ctx) => ctx.config.embossing.fixedCost,
});
