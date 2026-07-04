import Link from "next/link";
import { getVariants, getSuppliers } from "@/lib/queries";
import PurchaseForm from "./PurchaseForm";

interface PageProps {
  searchParams: Promise<{ success?: string }>;
}

export default async function NewPurchasePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [variants, suppliers] = await Promise.all([
    getVariants(),
    getSuppliers(),
  ]);

  const serialisedVariants = variants.map((v) => ({
    id: v.id,
    sizeBucket: v.sizeBucket,
    sizeCanonical: v.sizeCanonical,
    position: v.position,
    subLabel: v.subLabel,
    patternCode: v.patternCode,
    wacCost: v.wacCost.toString(),
    qtyOnHand: v.qtyOnHand,
    brand: { name: v.brand.name },
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-white">New Purchase</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/variants/new"
            className="border border-[#2A2A2A] hover:border-zinc-500 text-zinc-300 hover:text-white rounded px-3 py-2 text-sm transition-colors"
          >
            + New Tyre Type
          </Link>
          <Link
            href="/suppliers/new"
            className="border border-[#2A2A2A] hover:border-zinc-500 text-zinc-300 hover:text-white rounded px-3 py-2 text-sm transition-colors"
          >
            + New Supplier
          </Link>
        </div>
      </div>
      {params.success === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Purchase recorded successfully.
        </div>
      )}
      <PurchaseForm variants={serialisedVariants} suppliers={suppliers} />
    </div>
  );
}
