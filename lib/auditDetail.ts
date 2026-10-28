// Human-readable audit descriptions: the full transaction, and for edits,
// exactly what changed ("Customer: Walk-in → John", "Total: KES 36,000 → …").
//
// Description format: first line is the headline, following lines are detail.
// Snapshots are JSON-safe so they can also be stored in AuditLog.metadata.

import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { variantLabel, type LabelVariant } from "@/lib/posting/label";

type Num = { toString(): string };

export function kes(v: Num): string {
  const n = new Decimal(v.toString()).toNumber();
  return `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

export function day(d: Date): string {
  return d.toLocaleDateString("en-KE", { dateStyle: "medium", timeZone: "Africa/Nairobi" });
}

const CHANNEL: Record<string, string> = { CASH: "Cash", MPESA: "M-Pesa", DEBT: "Credit" };
const TERMS: Record<string, string> = { CASH: "Cash", CREDIT: "Credit", FREE: "Free" };
export const channelLabel = (c: string) => CHANNEL[c] ?? c;

const variantInclude = { include: { brand: { select: { name: true } } } } as const;

// ─── Lines (shared by sales and purchases) ───────────────────────────────────

export interface LineSnap { label: string; qty: number; price: string }

const lineText = (l: LineSnap) =>
  `${l.qty}× ${l.label} @ ${kes(l.price)} = ${kes(new Decimal(l.price).mul(l.qty))}`;

/** Merges lines per tyre so a split line doesn't read as a change. */
function byLabel(lines: LineSnap[]) {
  const m = new Map<string, { qty: number; value: Decimal }>();
  for (const l of lines) {
    const t = m.get(l.label) ?? { qty: 0, value: new Decimal(0) };
    t.qty += l.qty;
    t.value = t.value.plus(new Decimal(l.price).mul(l.qty));
    m.set(l.label, t);
  }
  return m;
}

function diffLines(before: LineSnap[], after: LineSnap[], priceWord: string): string[] {
  const a = byLabel(before);
  const b = byLabel(after);
  const out: string[] = [];
  for (const [label, o] of a) {
    const n = b.get(label);
    if (!n) { out.push(`Removed ${o.qty}× ${label} @ ${kes(o.value.div(o.qty))}`); continue; }
    if (o.qty !== n.qty) out.push(`${label}: qty ${o.qty} → ${n.qty}`);
    const op = o.value.div(o.qty), np = n.value.div(n.qty);
    if (!op.equals(np)) out.push(`${label}: ${priceWord} ${kes(op)} → ${kes(np)}`);
  }
  for (const [label, n] of b) {
    if (!a.has(label)) out.push(`Added ${n.qty}× ${label} @ ${kes(n.value.div(n.qty))}`);
  }
  return out;
}

/** "Field: old → new" for each field that differs. */
export function diffFields(fields: Array<[string, string, string]>): string[] {
  return fields.filter(([, o, n]) => o !== n).map(([name, o, n]) => `${name}: ${o} → ${n}`);
}

function editDescription(headline: string, changes: string[], now: string[]) {
  return [headline, ...(changes.length ? changes.map((c) => `• ${c}`) : ["• No changes"]), "Now:", ...now].join("\n");
}

// ─── Sales ───────────────────────────────────────────────────────────────────

export interface SaleSnap {
  invoiceNo: string | null;
  date: string;
  customer: string;
  lines: LineSnap[];
  payments: Array<{ channel: string; amount: string }>;
  total: string;
}

export async function saleSnapshot(saleId: string): Promise<SaleSnap> {
  const s = await prisma.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: {
      customer: { select: { name: true } },
      lines: { include: { variant: variantInclude } },
      payments: true,
    },
  });
  return {
    invoiceNo: s.invoiceNo,
    date: day(s.date),
    customer: s.customer?.name ?? "Walk-in",
    lines: s.lines.map((l) => ({ label: variantLabel(l.variant as LabelVariant), qty: l.qty, price: l.unitPrice.toString() })),
    payments: s.payments.map((p) => ({ channel: p.channel, amount: p.amount.toString() })),
    total: s.totalAmount.toString(),
  };
}

const paymentsText = (s: SaleSnap) =>
  s.payments.map((p) => `${channelLabel(p.channel)} ${kes(p.amount)}`).join(" + ") || "none";

const saleName = (s: SaleSnap) => `Sale ${s.invoiceNo ?? ""}`.trim();

function saleBody(s: SaleSnap): string[] {
  return [
    `${s.date} · ${s.customer}`,
    ...s.lines.map(lineText),
    `Paid: ${paymentsText(s)} · Total ${kes(s.total)}`,
  ];
}

export function describeSaleCreated(s: SaleSnap) {
  return [`${saleName(s)} to ${s.customer} — ${kes(s.total)}`, ...saleBody(s)].join("\n");
}

export function describeSaleDeleted(s: SaleSnap) {
  return [`${saleName(s)} deleted (${s.customer}, ${kes(s.total)}) — stock restored`, ...saleBody(s)].join("\n");
}

export function describeSaleEdited(before: SaleSnap, after: SaleSnap) {
  const changes = [
    ...diffFields([
      ["Invoice", before.invoiceNo ?? "—", after.invoiceNo ?? "—"],
      ["Customer", before.customer, after.customer],
      ["Date", before.date, after.date],
    ]),
    ...diffLines(before.lines, after.lines, "price"),
    ...diffFields([
      ["Payment", paymentsText(before), paymentsText(after)],
      ["Total", kes(before.total), kes(after.total)],
    ]),
  ];
  return editDescription(`${saleName(after)} edited — ${after.customer}, ${kes(after.total)}`, changes, saleBody(after));
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export interface PurchaseSnap {
  date: string;
  supplier: string;
  terms: string;
  lines: LineSnap[];
  total: string;
}

export async function purchaseSnapshot(purchaseId: string): Promise<PurchaseSnap> {
  const p = await prisma.purchase.findUniqueOrThrow({
    where: { id: purchaseId },
    include: { supplier: { select: { name: true } }, lines: { include: { variant: variantInclude } } },
  });
  return {
    date: day(p.date),
    supplier: p.supplier?.name ?? "No supplier",
    terms: TERMS[p.terms] ?? p.terms,
    lines: p.lines.map((l) => ({ label: variantLabel(l.variant as LabelVariant), qty: l.qty, price: l.unitCost.toString() })),
    total: p.lines.reduce((sum, l) => sum.plus(l.lineTotal.toString()), new Decimal(0)).toString(),
  };
}

function purchaseBody(p: PurchaseSnap): string[] {
  return [`${p.date} · ${p.supplier} · ${p.terms}`, ...p.lines.map(lineText), `Total ${kes(p.total)}`];
}

export function describePurchaseCreated(p: PurchaseSnap) {
  return [`Purchase from ${p.supplier} — ${kes(p.total)} (${p.terms})`, ...purchaseBody(p)].join("\n");
}

export function describePurchaseDeleted(p: PurchaseSnap) {
  return [`Purchase from ${p.supplier} deleted (${kes(p.total)}) — stock and WAC reversed`, ...purchaseBody(p)].join("\n");
}

export function describePurchaseEdited(before: PurchaseSnap, after: PurchaseSnap) {
  const changes = [
    ...diffFields([
      ["Supplier", before.supplier, after.supplier],
      ["Date", before.date, after.date],
      ["Terms", before.terms, after.terms],
    ]),
    ...diffLines(before.lines, after.lines, "cost"),
    ...diffFields([["Total", kes(before.total), kes(after.total)]]),
  ];
  return editDescription(`Purchase from ${after.supplier} edited — ${kes(after.total)}`, changes, purchaseBody(after));
}

// ─── Simple payments ─────────────────────────────────────────────────────────

export async function customerName(id: string) {
  return (await prisma.customer.findUnique({ where: { id }, select: { name: true } }))?.name ?? "Unknown customer";
}

export async function supplierName(id: string) {
  return (await prisma.supplier.findUnique({ where: { id }, select: { name: true } }))?.name ?? "Unknown supplier";
}

export async function variantName(id: string) {
  const v = await prisma.productVariant.findUnique({ where: { id }, ...variantInclude });
  return v ? variantLabel(v) : "Unknown tyre";
}

export const noteText = (note?: string | null) => (note ? `Note: ${note}` : null);

export function lines(...parts: Array<string | null | undefined | false>) {
  return parts.filter(Boolean).join("\n");
}

export function describeDebtCollection(c: { customer: string; amount: Num; channel: string; date: Date; note?: string | null }) {
  return lines(
    `Debt collected from ${c.customer} — ${kes(c.amount)} via ${channelLabel(c.channel)}`,
    day(c.date),
    noteText(c.note),
  );
}

export interface SupplierPaymentSnap { supplier: string; amount: string; date: string; note: string | null }

export async function supplierPaymentSnap(p: { supplierId: string; amount: Num; date: Date; note?: string | null }): Promise<SupplierPaymentSnap> {
  return { supplier: await supplierName(p.supplierId), amount: p.amount.toString(), date: day(p.date), note: p.note ?? null };
}

export function describeSupplierPayment(p: SupplierPaymentSnap, verb: "Paid" | "Deleted payment") {
  return lines(`${verb} ${p.supplier} — ${kes(p.amount)}`, p.date, noteText(p.note));
}

export function describeSupplierPaymentEdited(before: SupplierPaymentSnap, after: SupplierPaymentSnap) {
  const changes = diffFields([
    ["Supplier", before.supplier, after.supplier],
    ["Amount", kes(before.amount), kes(after.amount)],
    ["Date", before.date, after.date],
    ["Note", before.note ?? "—", after.note ?? "—"],
  ]);
  return editDescription(`Payment to ${after.supplier} edited — ${kes(after.amount)}`, changes,
    [describeSupplierPayment(after, "Paid")]);
}

export function describeReturn(r: { type: string; tyre: string; qty: number; unitValue: Num; date: Date; note?: string | null }) {
  const what = r.type === "SALE_RETURN" ? "Customer return" : "Return to supplier";
  return lines(
    `${what} — ${r.qty}× ${r.tyre} @ ${kes(r.unitValue)} = ${kes(new Decimal(r.unitValue.toString()).mul(r.qty))}`,
    day(r.date),
    noteText(r.note),
  );
}

// ─── Tyres ───────────────────────────────────────────────────────────────────

export interface VariantSnap {
  label: string; size: string; brand: string; position: string;
  subLabel: string; pattern: string; sizeBucket: string; sellPrice: string;
}

export async function variantSnapshot(id: string): Promise<VariantSnap> {
  const v = await prisma.productVariant.findUniqueOrThrow({ where: { id }, ...variantInclude });
  return {
    label: variantLabel(v),
    size: v.sizeCanonical,
    brand: v.brand.name,
    position: v.position,
    subLabel: v.subLabel ?? "—",
    pattern: v.patternCode ?? "—",
    sizeBucket: v.sizeBucket,
    sellPrice: v.referenceSellPrice ? kes(v.referenceSellPrice) : "—",
  };
}

export function describeVariantEdited(before: VariantSnap, after: VariantSnap) {
  const changes = diffFields([
    ["Size", before.size, after.size],
    ["Brand", before.brand, after.brand],
    ["Position", before.position, after.position],
    ["Sub-label", before.subLabel, after.subLabel],
    ["Pattern", before.pattern, after.pattern],
    ["Size bucket", before.sizeBucket, after.sizeBucket],
    ["Reference sell price", before.sellPrice, after.sellPrice],
  ]);
  return [`Tyre ${after.label} edited`, ...(changes.length ? changes.map((c) => `• ${c}`) : ["• No changes"])].join("\n");
}
