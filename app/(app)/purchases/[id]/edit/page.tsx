import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getVariants, getSuppliers } from "@/lib/queries";
import PurchaseForm, { type PurchaseFormInitialData } from "../../new/PurchaseForm";
import { updatePurchase } from "@/lib/actions/purchase";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPurchasePage({ params }: PageProps) {
  const { id } = await params;

  const [purchase, variants, suppliers] = await Promise.all([
    prisma.purchase.findUnique({
      where: { id },
      include: {
        lines: { include: { variant: { include: { brand: true } } } },
        supplier: true,
      },
    }),
    getVariants(),
    getSuppliers(),
  ]);

  if (!purchase) notFound();

  // Boost qty for variants in this purchase so in-stock counts are accurate
  const qtyBoost = new Map<string, number>();
  for (const l of purchase.lines) qtyBoost.set(l.variantId, (qtyBoost.get(l.variantId) ?? 0) + l.qty);

  const serialisedVariants = variants.map((v) => ({
    id: v.id,
    sizeBucket: v.sizeBucket,
    sizeCanonical: v.sizeCanonical,
    qtyOnHand: v.qtyOnHand + (qtyBoost.get(v.id) ?? 0),
    patternCode: v.patternCode,
    wacCost: v.wacCost.toString(),
    brand: { name: v.brand.name },
  }));

  const initialData: PurchaseFormInitialData = {
    date: purchase.date.toISOString().slice(0, 10),
    supplierId: purchase.supplierId ?? "",
    terms: purchase.terms as "CASH" | "CREDIT" | "FREE",
    lines: purchase.lines.map((l) => ({
      bucket: l.variant.sizeBucket,
      variantId: l.variantId,
      qty: String(l.qty),
      unitCost: l.unitCost.toString(),
    })),
  };

  const submitAction = updatePurchase.bind(null, id);

  return (
    <div className="p-6">
      <Link href="/purchases" className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
        &larr; Purchases
      </Link>
      <h2 className="text-2xl font-bold text-white mb-2">Edit Purchase</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Editing will reverse the original purchase (restoring inventory and WAC) then re-post with the new values.
      </p>
      <PurchaseForm
        variants={serialisedVariants}
        suppliers={suppliers}
        initialData={initialData}
        submitAction={submitAction}
        submitLabel="Save Changes"
      />
    </div>
  );
}
