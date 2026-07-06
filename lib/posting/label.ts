// Human-readable variant labels for ledger entry descriptions.

export interface LabelVariant {
  sizeCanonical: string;
  subLabel: string | null;
  position: string;
  brand: { name: string };
}

export function variantLabel(v: LabelVariant): string {
  const base = `${v.sizeCanonical} ${v.brand.name}${v.subLabel ? ` ${v.subLabel}` : ""}`;
  return `${base}${v.position !== "NONE" ? ` ${v.position}` : ""}`.trim();
}

/** e.g. "4× 315/80R22.5 Bridgestone + 2× 11R22.5 Michelin" */
export function linesSummary(items: { qty: number; label: string }[]): string {
  return items.map((i) => `${i.qty}× ${i.label}`).join(" + ");
}
