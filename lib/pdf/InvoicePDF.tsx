import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base, fmt, GRAY, PURPLE, RED } from "./styles";
import { toWords } from "@/lib/numberToWords";
import type { ShopInfoData as ShopInfo } from "@/lib/shopInfo";

interface Line {
  id: string;
  qty: number;
  unitPrice: string | number;
  lineTotal: string | number;
  variant: { brand: { name: string }; sizeCanonical: string; subLabel: string | null };
}
interface Payment { id: string; channel: string; amount: string | number; }
interface Sale {
  id: string;
  date: Date | string;
  totalAmount: string | number;
  customer: { name: string; phone?: string | null; email?: string | null; address?: string | null; town?: string | null; poBox?: string | null } | null;
  lines: Line[];
  payments: Payment[];
  recordedBy: { name: string } | null;
}

export function InvoicePDF({ sale, shop }: { sale: Sale; shop: ShopInfo }) {
  const total = Number(sale.totalAmount);
  const invoiceNo = sale.id.slice(-8).toUpperCase();
  const dateStr = new Date(sale.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

  const COL = { num: "4%", item: "42%", qty: "10%", rate: "22%", amount: "22%" };

  return (
    <Document title={`Invoice ${invoiceNo}`}>
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={base.headerRow}>
          <View>
            {shop.name
              ? <Text style={base.shopName}>{shop.name}</Text>
              : <Text style={[base.shopDetail, { fontStyle: "italic" }]}>Shop name not configured</Text>}
            {shop.poBox    && <Text style={base.shopDetail}>{shop.poBox}</Text>}
            {shop.address  && <Text style={base.shopDetail}>{shop.address}</Text>}
            {shop.town     && <Text style={base.shopDetail}>{[shop.town, shop.county, shop.country].filter(Boolean).join(", ")}</Text>}
            {shop.email    && <Text style={base.shopDetail}>Email: {shop.email}</Text>}
            {shop.phone    && <Text style={base.shopDetail}>Phone: {shop.phone}</Text>}
          </View>
          <View>
            <Text style={base.docType}>Invoice</Text>
            <Text style={base.docMeta}>No: {invoiceNo}</Text>
            <Text style={base.docMeta}>Date: {dateStr}</Text>
            {sale.recordedBy && <Text style={[base.docMeta, { marginTop: 2 }]}>By: {sale.recordedBy.name}</Text>}
          </View>
        </View>

        {/* Bill To */}
        {sale.customer && (
          <View style={base.sectionBox}>
            <Text style={base.sectionLabel}>Bill To</Text>
            <Text style={base.sectionName}>{sale.customer.name}</Text>
            {sale.customer.address && <Text style={base.sectionDetail}>{sale.customer.address}</Text>}
            {sale.customer.town    && <Text style={base.sectionDetail}>{sale.customer.town}</Text>}
            {sale.customer.poBox   && <Text style={base.sectionDetail}>{sale.customer.poBox}</Text>}
            {sale.customer.phone   && <Text style={base.sectionDetail}>Phone: {sale.customer.phone}</Text>}
            {sale.customer.email   && <Text style={base.sectionDetail}>Email: {sale.customer.email}</Text>}
          </View>
        )}

        {/* Table */}
        <View style={base.tableHeader}>
          <Text style={[base.tableHeaderCell, { width: COL.num }]}>#</Text>
          <Text style={[base.tableHeaderCell, { width: COL.item }]}>Item</Text>
          <Text style={[base.tableHeaderCell, { width: COL.qty, textAlign: "center" }]}>Qty</Text>
          <Text style={[base.tableHeaderCell, { width: COL.rate, textAlign: "right" }]}>Rate</Text>
          <Text style={[base.tableHeaderCell, { width: COL.amount, textAlign: "right" }]}>Amount</Text>
        </View>
        {sale.lines.map((line, i) => {
          const label = `${line.variant.brand.name} ${line.variant.sizeCanonical}${line.variant.subLabel ? " " + line.variant.subLabel : ""}`;
          return (
            <View key={line.id} style={[base.tableRow, i % 2 === 1 ? base.tableRowAlt : {}]}>
              <Text style={[base.tableCellGray, { width: COL.num }]}>{i + 1}.</Text>
              <Text style={[base.tableCell,     { width: COL.item }]}>{label}</Text>
              <Text style={[base.tableCell,     { width: COL.qty, textAlign: "center" }]}>{line.qty}</Text>
              <Text style={[base.tableCellGray, { width: COL.rate, textAlign: "right" }]}>{fmt(line.unitPrice)}</Text>
              <Text style={[base.tableCell,     { width: COL.amount, textAlign: "right" }]}>{fmt(line.lineTotal)}</Text>
            </View>
          );
        })}

        {/* Totals */}
        <View style={base.totalsRow}>
          <View style={{ maxWidth: "55%" }}>
            <Text style={[base.sectionLabel, { marginBottom: 3 }]}>Total in words</Text>
            <Text style={base.totalWords}>{toWords(total)}</Text>
          </View>
          <View>
            <Text style={base.totalLabel}>Total (KES)</Text>
            <Text style={base.totalAmount}>{fmt(total)}</Text>
          </View>
        </View>

        {/* Payments */}
        {sale.payments.length > 0 && (
          <View style={[base.sectionBox, { marginBottom: 14 }]}>
            <Text style={base.sectionLabel}>Payment Received</Text>
            {sale.payments.map((p) => (
              <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={base.sectionDetail}>{p.channel}</Text>
                <Text style={base.sectionDetail}>{fmt(p.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Terms */}
        {shop.terms.length > 0 && (
          <View style={{ marginBottom: 14 }}>
            <Text style={[base.sectionLabel, { color: PURPLE, marginBottom: 5 }]}>Terms and Conditions</Text>
            {shop.terms.map((t, i) => (
              <Text key={i} style={[base.shopDetail, { marginBottom: 2 }]}>{i + 1}. {t}</Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>{shop.name ?? ""}</Text>
          <Text style={base.footerText}>Invoice No: {invoiceNo} · {dateStr}</Text>
        </View>
      </Page>
    </Document>
  );
}
