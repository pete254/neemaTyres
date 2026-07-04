import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateVariant } from "@/lib/actions/variant";
import EditVariantForm from "./EditVariantForm";

export default async function EditVariantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [variant, brands] = await Promise.all([
    prisma.productVariant.findUnique({
      where: { id },
      include: { brand: true },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!variant) notFound();

  const action = updateVariant.bind(null, id);

  return (
    <div className="p-6 max-w-lg">
      <Link href="/inventory" className="text-sm text-zinc-400 hover:text-white mb-4 inline-block">
        ← Inventory
      </Link>
      <h2 className="text-2xl font-bold text-white mb-1">Edit Tyre Type</h2>
      <p className="text-zinc-400 text-sm mb-6">
        {variant.sizeCanonical} — {variant.brand.name} [{variant.position}]
      </p>

      <EditVariantForm
        action={action}
        brands={brands}
        variant={{
          brand: { name: variant.brand.name },
          sizeBucket: variant.sizeBucket,
          sizeCanonical: variant.sizeCanonical,
          position: variant.position,
          subLabel: variant.subLabel,
          patternCode: variant.patternCode,
          referenceSellPrice: variant.referenceSellPrice?.toString() ?? null,
        }}
      />
    </div>
  );
}
