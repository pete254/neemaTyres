import { notFound } from "next/navigation";
import { getSaleById } from "@/lib/queries/saleById";
import { getShopInfo } from "@/lib/shopInfo";
import PrintButton from "@/components/PrintButton";

export default async function DeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, shop] = await Promise.all([getSaleById(id), getShopInfo()]);
  if (!sale) notFound();

  const docNo = sale.id.slice(-8).toUpperCase();

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-3xl mx-auto">
      <div className="print:hidden flex gap-3 mb-6">
        <PrintButton />
        <a href="/sales" className="text-sm text-gray-500 hover:text-black py-2">← Back to Sales</a>
      </div>

      <div className="border border-gray-200 rounded-lg p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{shop.name || "Delivery Note"}</h1>
            {shop.poBox && <p className="text-sm text-gray-600 mt-1">{shop.poBox}</p>}
            {shop.address && <p className="text-sm text-gray-600">{shop.address}</p>}
            {shop.town && <p className="text-sm text-gray-600">{shop.town}{shop.county ? `, ${shop.county}` : ""}</p>}
            {(shop.email || shop.phone) && (
              <p className="text-sm text-gray-600 mt-1">
                {shop.email && <span><strong>Email:</strong> {shop.email} </span>}
                {shop.phone && <span><strong>Phone:</strong> {shop.phone}</span>}
              </p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-700 uppercase tracking-wide">Delivery Note</h2>
            <p className="text-sm text-gray-500 mt-1">No: {docNo}</p>
            <p className="text-sm text-gray-500">Date: {new Date(sale.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* Deliver To */}
        {sale.customer && (
          <div className="mb-8 bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deliver To</p>
            <p className="font-semibold text-gray-900">{sale.customer.name}</p>
            {sale.customer.address && <p className="text-sm text-gray-600">{sale.customer.address}</p>}
            {sale.customer.town && <p className="text-sm text-gray-600">{sale.customer.town}</p>}
            {sale.customer.poBox && <p className="text-sm text-gray-600">{sale.customer.poBox}</p>}
            {sale.customer.phone && <p className="text-sm text-gray-600"><strong>Phone:</strong> {sale.customer.phone}</p>}
          </div>
        )}

        {/* Items — no prices */}
        <table className="w-full mb-8 text-sm">
          <thead>
            <tr className="bg-[#4B0082] text-white">
              <th className="text-left py-3 px-4 w-8">#</th>
              <th className="text-left py-3 px-4">Item / Description</th>
              <th className="text-center py-3 px-4">Quantity</th>
              <th className="text-center py-3 px-4">Received ✓</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((line, i) => {
              const label = `${line.variant.brand.name} ${line.variant.sizeCanonical}${line.variant.subLabel ? " " + line.variant.subLabel : ""}`;
              return (
                <tr key={line.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-3 px-4 text-gray-400">{i + 1}.</td>
                  <td className="py-3 px-4 text-gray-800">{label}</td>
                  <td className="py-3 px-4 text-center text-gray-700 font-medium">{line.qty}</td>
                  <td className="py-3 px-4 text-center text-gray-300">_______</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signature block */}
        <div className="grid grid-cols-2 gap-12 mt-12">
          <div>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">Issued by (signature)</p>
              <p className="text-xs text-gray-400 mt-1">Name: ___________________________</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-sm text-gray-600">Received by (signature)</p>
              <p className="text-xs text-gray-400 mt-1">Name: ___________________________</p>
              <p className="text-xs text-gray-400 mt-1">Date: ____________________________</p>
            </div>
          </div>
        </div>

        {(shop.email || shop.phone) && (
          <p className="text-center text-sm text-gray-500 border-t border-gray-100 pt-4 mt-8">
            {shop.name} · {shop.phone ?? ""} · {shop.email ?? ""}
          </p>
        )}
      </div>
    </div>
  );
}
