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
    patternCode: v.patternCode,
    wacCost: v.wacCost.toString(),
    qtyOnHand: v.qtyOnHand,
    brand: { name: v.brand.name },
  }));

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">New Purchase</h2>
      {params.success === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Purchase recorded successfully.
        </div>
      )}
      <PurchaseForm variants={serialisedVariants} suppliers={suppliers} />
    </div>
  );
}
