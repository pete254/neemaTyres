import { getDebtors } from "@/lib/queries";
import { createDebtCollection } from "@/lib/actions/debtCollection";
import DebtCollectionForm from "./DebtCollectionForm";

interface PageProps {
  searchParams: Promise<{ success?: string; customerId?: string }>;
}

export default async function NewDebtCollectionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const debtors = await getDebtors();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Record Debt Collection</h2>

      <div className="mb-6 bg-yellow-900/30 border border-yellow-600 text-yellow-300 rounded-lg px-4 py-3 text-sm font-medium">
        This records money received against an existing debt — it does NOT increase revenue.
      </div>

      {params.success === "1" && (
        <div className="mb-4 bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-2 text-sm">
          Debt collection recorded successfully.
        </div>
      )}

      <DebtCollectionForm
        debtors={debtors.map((d) => ({
          id: d.id,
          name: d.name,
          outstanding: d.outstanding.toString(),
        }))}
        preselectedId={params.customerId ?? null}
        action={createDebtCollection}
      />
    </div>
  );
}
