import { getVariants, getCustomers } from "@/lib/queries";
import SaleForm from "./SaleForm";

interface PageProps {
  searchParams: Promise<{ success?: string }>;
}

export default async function NewSalePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [variants, customers] = await Promise.all([
    getVariants(),
    getCustomers(),
  ]);

  // Serialise Decimal/Date fields for the client component
  const serialisedVariants = variants.map((v) => ({
    id: v.id,
    sizeBucket: v.sizeBucket,
    sizeCanonical: v.sizeCanonical,
    patternCode: v.patternCode,
    wacCost: v.wacCost.toString(),
    referenceSellPrice: v.referenceSellPrice?.toString() ?? null,
    brand: { name: v.brand.name },
  }));

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-2">New Sale</h2>
      {params.success === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Sale recorded successfully.
        </div>
      )}
      <SaleForm variants={serialisedVariants} customers={customers} />
    </div>
  );
}
