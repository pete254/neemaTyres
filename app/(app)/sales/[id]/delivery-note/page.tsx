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
    <div className="min-h-screen bg-white text-black p-8 max-w-3xl mx-auto font-sans">
      {/* Screen-only controls */}
      <div className="print:hidden flex gap-3 mb-6">
        <PrintButton />
        <a href="/sales" className="text-sm text-gray-500 hover:text-black py-2">← Back to Sales</a>
      </div>

      <div className="print:p-0">
        {/* ── Document header ── */}
        <div className="flex justify-between items-start border-b-2 border-[#4B0082] pb-6 mb-6">
          {/* Left: shop info */}
          <div>
            {shop.name
              ? <p className="text-xl font-bold text-gray-900">{shop.name}</p>
              : <p className="text-sm text-gray-400 italic">Shop name not configured — visit /settings</p>
            }
            {shop.poBox   && <p className="text-sm text-gray-600 mt-0.5">{shop.poBox}</p>}
            {shop.address && <p className="text-sm text-gray-600">{shop.address}</p>}
            {shop.town && (
              <p className="text-sm text-gray-600">
                {shop.town}{shop.county ? `, ${shop.county}` : ""}{shop.country ? `, ${shop.country}` : ""}
              </p>
            )}
            {shop.email && (
              <p className="text-sm text-gray-600 mt-1"><strong>Email:</strong> {shop.email}</p>
            )}
            {shop.phone && (
              <p className="text-sm text-gray-600"><strong>Phone:</strong> {shop.phone}</p>
            )}
          </div>

          {/* Right: document type + meta */}
          <div className="text-right">
            <h1 className="text-3xl font-bold text-[#4B0082] uppercase tracking-wide">Delivery Note</h1>
            <p className="text-sm text-gray-500 mt-2"><strong>No:</strong> {docNo}</p>
            <p className="text-sm text-gray-500">
              <strong>Date:</strong>{" "}
              {new Date(sale.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            {sale.recordedBy && (
              <p className="text-xs text-gray-400 mt-1">Issued by: {sale.recordedBy.name}</p>
            )}
          </div>
        </div>

        {/* Deliver To */}
        {sale.customer && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deliver To</p>
            <p className="font-semibold text-gray-900">{sale.customer.name}</p>
            {sale.customer.address && <p className="text-sm text-gray-600">{sale.customer.address}</p>}
            {sale.customer.town    && <p className="text-sm text-gray-600">{sale.customer.town}</p>}
            {sale.customer.poBox   && <p className="text-sm text-gray-600">{sale.customer.poBox}</p>}
            {sale.customer.phone   && <p className="text-sm text-gray-600"><strong>Phone:</strong> {sale.customer.phone}</p>}
          </div>
        )}

        {/* Items — no prices on delivery note */}
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
          <div className="border-t border-gray-400 pt-2">
            <p className="text-sm text-gray-600">Issued by (signature)</p>
            <p className="text-xs text-gray-400 mt-6">Name: ___________________________</p>
          </div>
          <div className="border-t border-gray-400 pt-2">
            <p className="text-sm text-gray-600">Received by (signature)</p>
            <p className="text-xs text-gray-400 mt-6">Name: ___________________________</p>
            <p className="text-xs text-gray-400 mt-2">Date: ____________________________</p>
          </div>
        </div>

        {/* Footer */}
        {(shop.email || shop.phone) && (
          <p className="text-center text-sm text-gray-500 border-t border-gray-100 pt-4 mt-8">
            {shop.name && <>{shop.name} · </>}
            {shop.phone && <>{shop.phone}</>}
            {shop.phone && shop.email && " · "}
            {shop.email && <>{shop.email}</>}
          </p>
        )}
      </div>
    </div>
  );
}
