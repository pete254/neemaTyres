import { getCustomers } from "@/lib/queries";
import { getShopInfo } from "@/lib/shopInfo";
import QuotationForm from "./QuotationForm";

export default async function NewQuotationPage() {
  const [customers, shop] = await Promise.all([getCustomers(), getShopInfo()]);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">New Quotation</h2>
        {!shop.name && (
          <a href="/settings" className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-800 rounded px-3 py-1.5">
            ⚠ Set up shop info first →
          </a>
        )}
      </div>
      <QuotationForm customers={customers.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
