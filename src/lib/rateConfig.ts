type RateLine = {
  ratePerGuardMonthly: number;
  dayGuardsRequired: number;
  nightGuardsRequired: number;
};

// When a society uses per-designation rate rows, the flat RateConfig fields (which every other
// part of the app already reads — invoices, dashboard, societies list) are derived from the sum
// of those rows, so nothing downstream needs to know rows exist at all.
export function computeFlatFieldsFromLines(lines: RateLine[]) {
  const dayGuardsRequired = lines.reduce((sum, l) => sum + l.dayGuardsRequired, 0);
  const nightGuardsRequired = lines.reduce((sum, l) => sum + l.nightGuardsRequired, 0);
  const totalAgreedAmount = lines.reduce((sum, l) => sum + l.ratePerGuardMonthly * (l.dayGuardsRequired + l.nightGuardsRequired), 0);
  const totalGuards = dayGuardsRequired + nightGuardsRequired;
  const ratePerGuardMonthly = totalGuards > 0 ? totalAgreedAmount / totalGuards : 0;
  return { dayGuardsRequired, nightGuardsRequired, totalAgreedAmount, ratePerGuardMonthly };
}
