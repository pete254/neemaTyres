import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getShopInfo } from "@/lib/shopInfo";
import { toWords } from "@/lib/numberToWords";
import PrintButton from "@/components/PrintButton";
import Decimal from "decimal.js";

export default async function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quotation, shop] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { name: true } },
      },
    }),
    getShopInfo(),
  ]);

  if (!quotation) notFound();

  const total = quotation.lines.reduce(
    (sum, l) => sum.plus(l.lineTotal.toString()),
    new Decimal(0)
  );
  const totalNum = total.toNumber();
  const validUntil = new Date(quotation.date);
  validUntil.setDate(validUntil.getDate() + quotation.validDays);

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-4xl mx-auto">
      {/* Screen-only controls */}
      <div className="print:hidden flex gap-3 mb-6">
        <PrintButton label="Print / Save PDF" />
        <a href="/quotations/new" className="text-sm text-gray-500 hover:text-black py-2">+ New Quotation</a>
      </div>

      <div className="print:p-0">
        {/* Document title */}
        <div className="text-center border-b-2 border-[#4B0082] pb-4 mb-6">
          <h1 className="text-3xl font-bold text-[#4B0082] uppercase tracking-widest">Quotation</h1>
          <p className="text-sm text-gray-500 mt-1">
            No: {id.slice(-8).toUpperCase()} &nbsp;·&nbsp;{" "}
            <strong>Date:</strong>{" "}
            {new Date(quotation.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
            &nbsp;·&nbsp;{" "}
            <strong>Valid until:</strong>{" "}
            {validUntil.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Two-column header: Quotation From | Quotation For */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* From (shop) */}
          <div className="bg-[#f0eefa] rounded-lg p-5">
            <h3 className="text-[#4B0082] font-semibold text-lg mb-3">Quotation From</h3>
            <p className="font-bold text-gray-900">{shop.name || "—"}</p>
            {shop.poBox && <p className="text-sm text-gray-700">{shop.poBox},</p>}
            {shop.address && <p className="text-sm text-gray-700">{shop.address},</p>}
            {shop.town && <p className="text-sm text-gray-700">{shop.town},</p>}
            {(shop.county || shop.country) && (
              <p className="text-sm text-gray-700">{[shop.county, shop.country].filter(Boolean).join(", ")}</p>
            )}
            {shop.email && (
              <p className="text-sm text-gray-700 mt-2">
                <strong>Email:</strong> {shop.email}
              </p>
            )}
            {shop.phone && (
              <p className="text-sm text-gray-700">
                <strong>Phone:</strong> {shop.phone}
              </p>
            )}
          </div>

          {/* For (customer) */}
          <div className="bg-[#f0eefa] rounded-lg p-5">
            <h3 className="text-[#4B0082] font-semibold text-lg mb-3">Quotation For</h3>
            {quotation.customer ? (
              <>
                <p className="font-bold text-gray-900">{quotation.customer.name}</p>
                {quotation.customer.address && <p className="text-sm text-gray-700">{quotation.customer.address},</p>}
                {quotation.customer.town && <p className="text-sm text-gray-700">{quotation.customer.town},</p>}
                {quotation.customer.poBox && <p className="text-sm text-gray-700">{quotation.customer.poBox}</p>}
                {quotation.customer.email && (
                  <p className="text-sm text-gray-700 mt-2">
                    <strong>Email:</strong> {quotation.customer.email}
                  </p>
                )}
                {quotation.customer.phone && (
                  <p className="text-sm text-gray-700">
                    <strong>Phone:</strong> {quotation.customer.phone}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">Walk-in customer</p>
            )}
          </div>
        </div>

        {/* Items table */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-[#4B0082] text-white">
              <th className="text-left py-3 px-4 w-8">#</th>
              <th className="text-left py-3 px-4">Item</th>
              <th className="text-center py-3 px-4">Quantity</th>
              <th className="text-right py-3 px-4">Rate</th>
              <th className="text-right py-3 px-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quotation.lines.map((line, i) => (
              <tr key={line.id} className={i % 2 === 0 ? "bg-white" : "bg-[#faf9ff]"}>
                <td className="py-3 px-4 text-gray-400">{i + 1}.</td>
                <td className="py-3 px-4 text-gray-800">{line.description}</td>
                <td className="py-3 px-4 text-center text-gray-700">{line.qty}</td>
                <td className="py-3 px-4 text-right text-gray-700">
                  Ksh {Number(line.unitPrice).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  Ksh {Number(line.lineTotal).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total row */}
        <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-gray-700">Total (in words):</p>
            <p className="text-sm text-gray-600 mt-0.5">{toWords(totalNum)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 font-semibold">Total (KES)</p>
            <p className="text-xl font-bold text-gray-900">Ksh {totalNum.toLocaleString()}</p>
          </div>
        </div>

        {/* Note */}
        {quotation.note && (
          <div className="mb-6 p-3 bg-gray-50 rounded text-sm text-gray-700">
            <strong>Note:</strong> {quotation.note}
          </div>
        )}

        {/* Terms */}
        {shop.terms.length > 0 && (
          <div className="mb-8">
            <h4 className="font-semibold text-[#4B0082] mb-2">Terms and Conditions</h4>
            <ol className="list-decimal list-inside space-y-1">
              {shop.terms.map((t, i) => (
                <li key={i} className="text-sm text-gray-600">{t}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer */}
        {(shop.email || shop.phone) && (
          <p className="text-center text-sm text-gray-500 border-t border-gray-100 pt-4">
            For any enquiry, reach out via email at{" "}
            {shop.email && <strong>{shop.email}</strong>}
            {shop.phone && <>, call on <strong>{shop.phone}</strong></>}
          </p>
        )}
      </div>
    </div>
  );
}
