import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { base, fmt, GRAY, PURPLE } from "./styles";
import { toWords } from "@/lib/numberToWords";
import type { ShopInfoData as ShopInfo } from "@/lib/shopInfo";

interface Line {
  id: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
  label: string;
}

interface InvoiceGroup {
  id: string;
  invoiceNo: string;
  date: string;
  total: string;
  lines: Line[];
}

interface Customer {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  town?: string | null;
  poBox?: string | null;
}

const COL = { num: "5%", item: "45%", qty: "10%", rate: "20%", amount: "20%" };
const SUBTLE = "#EDE7F6";

const dateStr = (d: string) =>
  new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

/** One invoice covering several sales for the same customer. */
export function CombinedInvoicePDF({
  customer,
  invoices,
  grandTotal,
  issuedOn,
  shop,
  logoSrc,
}: {
  customer: Customer;
  invoices: InvoiceGroup[];
  grandTotal: string;
  issuedOn: string;
  shop: ShopInfo;
  logoSrc?: string;
}) {
  const period =
    invoices.length > 0
      ? `${dateStr(invoices[0].date)} — ${dateStr(invoices[invoices.length - 1].date)}`
      : "";

  return (
    <Document title={`Invoice — ${customer.name}`}>
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={base.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {logoSrc && <Image src={logoSrc} style={{ width: 46, height: 46, marginRight: 10 }} />}
            <View>
              {shop.name
                ? <Text style={base.shopName}>{shop.name}</Text>
                : <Text style={[base.shopDetail, { fontStyle: "italic" }]}>Shop name not configured</Text>}
              {shop.poBox   && <Text style={base.shopDetail}>{shop.poBox}</Text>}
              {shop.address && <Text style={base.shopDetail}>{shop.address}</Text>}
              {shop.town    && <Text style={base.shopDetail}>{[shop.town, shop.county, shop.country].filter(Boolean).join(", ")}</Text>}
              {shop.email   && <Text style={base.shopDetail}>Email: {shop.email}</Text>}
              {shop.phone   && <Text style={base.shopDetail}>Phone: {shop.phone}</Text>}
            </View>
          </View>
          <View>
            <Text style={base.docType}>Invoice</Text>
            <Text style={base.docMeta}>Date: {dateStr(issuedOn)}</Text>
            <Text style={base.docMeta}>Covers {invoices.length} invoice{invoices.length === 1 ? "" : "s"}</Text>
            {period && <Text style={base.docMeta}>Period: {period}</Text>}
          </View>
        </View>

        {/* Bill To */}
        <View style={base.sectionBox}>
          <Text style={base.sectionLabel}>Bill To</Text>
          <Text style={base.sectionName}>{customer.name}</Text>
          {customer.address && <Text style={base.sectionDetail}>{customer.address}</Text>}
          {customer.town    && <Text style={base.sectionDetail}>{customer.town}</Text>}
          {customer.poBox   && <Text style={base.sectionDetail}>{customer.poBox}</Text>}
          {customer.phone   && <Text style={base.sectionDetail}>Phone: {customer.phone}</Text>}
          {customer.email   && <Text style={base.sectionDetail}>Email: {customer.email}</Text>}
        </View>

        {/* Table */}
        <View style={base.tableHeader} fixed>
          <Text style={[base.tableHeaderCell, { width: COL.num }]}>#</Text>
          <Text style={[base.tableHeaderCell, { width: COL.item }]}>Item</Text>
          <Text style={[base.tableHeaderCell, { width: COL.qty, textAlign: "center" }]}>Qty</Text>
          <Text style={[base.tableHeaderCell, { width: COL.rate, textAlign: "right" }]}>Rate</Text>
          <Text style={[base.tableHeaderCell, { width: COL.amount, textAlign: "right" }]}>Amount</Text>
        </View>

        {invoices.map((inv) => (
          <View key={inv.id} wrap={false} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: SUBTLE, paddingVertical: 4, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: PURPLE }}>Invoice No: {inv.invoiceNo}</Text>
              <Text style={{ fontSize: 8, color: GRAY }}>{dateStr(inv.date)}</Text>
            </View>
            {inv.lines.map((line, i) => (
              <View key={line.id} style={base.tableRow}>
                <Text style={[base.tableCellGray, { width: COL.num }]}>{i + 1}.</Text>
                <Text style={[base.tableCell, { width: COL.item }]}>{line.label}</Text>
                <Text style={[base.tableCell, { width: COL.qty, textAlign: "center" }]}>{line.qty}</Text>
                <Text style={[base.tableCellGray, { width: COL.rate, textAlign: "right" }]}>{fmt(line.unitPrice)}</Text>
                <Text style={[base.tableCell, { width: COL.amount, textAlign: "right" }]}>{fmt(line.lineTotal)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingVertical: 4, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 8, color: GRAY, marginRight: 8 }}>Subtotal</Text>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", width: COL.amount, textAlign: "right" }}>{fmt(inv.total)}</Text>
            </View>
          </View>
        ))}

        {/* Summary of invoices */}
        {invoices.length > 1 && (
          <View style={{ marginTop: 8, marginBottom: 6, alignSelf: "flex-end", width: "50%" }} wrap={false}>
            <Text style={[base.sectionLabel, { marginBottom: 3 }]}>Summary</Text>
            {invoices.map((inv) => (
              <View key={inv.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" }}>
                <Text style={{ fontSize: 8, color: GRAY }}>{inv.invoiceNo} · {dateStr(inv.date)}</Text>
                <Text style={{ fontSize: 8 }}>{fmt(inv.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={base.totalsRow} wrap={false}>
          <View style={{ maxWidth: "55%" }}>
            <Text style={[base.sectionLabel, { marginBottom: 3 }]}>Total in words</Text>
            <Text style={base.totalWords}>{toWords(Number(grandTotal))}</Text>
          </View>
          <View>
            <Text style={base.totalLabel}>Total (KES)</Text>
            <Text style={base.totalAmount}>{fmt(grandTotal)}</Text>
          </View>
        </View>

        {/* Terms */}
        {shop.terms.length > 0 && (
          <View style={{ marginBottom: 14 }} wrap={false}>
            <Text style={[base.sectionLabel, { color: PURPLE, marginBottom: 5 }]}>Terms and Conditions</Text>
            {shop.terms.map((t, i) => (
              <Text key={i} style={[base.shopDetail, { marginBottom: 2 }]}>{i + 1}. {t}</Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>{shop.name ?? ""} · Invoice — {customer.name}</Text>
          <Text style={base.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
