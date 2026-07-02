import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getVariants, getCustomers } from "@/lib/queries";
import SaleForm, { type SaleFormInitialData } from "../../new/SaleForm";
import { updateSale } from "@/lib/actions/sale";
import type { CustomerSelection } from "../../new/CustomerPicker";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSalePage({ params }: PageProps) {
  const { id } = await params;

  const [sale, variants, customers] = await Promise.all([
    prisma.sale.findUnique({
      where: { id },
      include: {
        lines: { include: { variant: { include: { brand: true } } } },
        payments: true,
        customer: true,
      },
    }),
    getVariants(),
    getCustomers(),
  ]);

  if (!sale) notFound();

  // Build variant list with qty restored (so in-stock counts are accurate for edit)
  const qtyBoost = new Map<string, number>();
  for (const l of sale.lines) qtyBoost.set(l.variantId, (qtyBoost.get(l.variantId) ?? 0) + l.qty);

  const serialisedVariants = variants.map((v) => ({
    id: v.id,
    sizeBucket: v.sizeBucket,
    sizeCanonical: v.sizeCanonical,
    position: v.position,
    qtyOnHand: v.qtyOnHand + (qtyBoost.get(v.id) ?? 0),
    patternCode: v.patternCode,
    wacCost: v.wacCost.toString(),
    referenceSellPrice: v.referenceSellPrice?.toString() ?? null,
    brand: { name: v.brand.name },
  }));

  const customer: CustomerSelection = sale.customer
    ? { type: "existing", id: sale.customer.id, name: sale.customer.name }
    : null;

  const initialData: SaleFormInitialData = {
    date: sale.date.toISOString().slice(0, 10),
    customer,
    lines: sale.lines.map((l) => ({
      bucket: l.variant.sizeBucket,
      variantId: l.variantId,
      qty: String(l.qty),
      unitPrice: l.unitPrice.toString(),
    })),
    payments: sale.payments.map((p) => ({
      channel: p.channel as "CASH" | "MPESA" | "DEBT",
      amount: p.amount.toString(),
    })),
  };

  const submitAction = updateSale.bind(null, id);

  return (
    <div className="p-6">
      <Link href="/sales" className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
        &larr; Sales
      </Link>
      <h2 className="text-2xl font-bold text-white mb-2">Edit Sale</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Editing will delete the original sale and re-post it with the new values. Stock is adjusted accordingly.
      </p>
      <SaleForm
        variants={serialisedVariants}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
        initialData={initialData}
        submitAction={submitAction}
        submitLabel="Save Changes"
      />
    </div>
  );
}
