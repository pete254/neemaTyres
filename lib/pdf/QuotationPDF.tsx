import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base, fmt, GRAY, PURPLE } from "./styles";
import { toWords } from "@/lib/numberToWords";
import type { ShopInfoData as ShopInfo } from "@/lib/shopInfo";
import Decimal from "decimal.js";

interface Line { id: string; description: string; qty: number; unitPrice: string | number; lineTotal: string | number; }
interface Quotation {
  id: string;
  quotationNo?: string | null;
  date: Date | string;
  validDays: number;
  note: string | null;
  customer: { name: string; phone?: string | null; email?: string | null; address?: string | null; town?: string | null; poBox?: string | null } | null;
  lines: Line[];
  createdBy: { name: string } | null;
}

export function QuotationPDF({ quotation, shop }: { quotation: Quotation; shop: ShopInfo }) {
  const quotNo = quotation.quotationNo ?? quotation.id.slice(-8).toUpperCase();
  const dateStr = new Date(quotation.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  const validUntil = new Date(quotation.date);
  validUntil.setDate(validUntil.getDate() + quotation.validDays);
  const validStr = validUntil.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

  const total = quotation.lines.reduce((s, l) => s.plus(l.lineTotal.toString()), new Decimal(0)).toNumber();

  const COL = { num: "4%", item: "48%", qty: "10%", rate: "19%", amount: "19%" };

  return (
    <Document title={`Quotation ${quotNo}`}>
      <Page size="A4" style={base.page}>
        {/* Centered title block */}
        <View style={{ alignItems: "center", borderBottomWidth: 2, borderBottomColor: PURPLE, paddingBottom: 12, marginBottom: 18 }}>
          <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: PURPLE, textTransform: "uppercase", letterSpacing: 2 }}>Quotation</Text>
          <Text style={{ fontSize: 8, color: GRAY, marginTop: 4 }}>
            No: {quotNo}  ·  Date: {dateStr}  ·  Valid until: {validStr}
          </Text>
        </View>

        {/* Two-panel: From | For */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 18 }}>
          {[
            {
              label: "Quotation From",
              content: (
                <View key="from">
                  {shop.name
                    ? <Text style={base.sectionName}>{shop.name}</Text>
                    : <Text style={[base.sectionDetail, { fontStyle: "italic" }]}>Shop name not configured</Text>}
                  {shop.poBox   && <Text style={base.sectionDetail}>{shop.poBox}</Text>}
                  {shop.address && <Text style={base.sectionDetail}>{shop.address}</Text>}
                  {shop.town    && <Text style={base.sectionDetail}>{[shop.town, shop.county].filter(Boolean).join(", ")}</Text>}
                  {shop.email   && <Text style={base.sectionDetail}>Email: {shop.email}</Text>}
                  {shop.phone   && <Text style={base.sectionDetail}>Phone: {shop.phone}</Text>}
                </View>
              ),
            },
            {
              label: "Quotation For",
              content: quotation.customer ? (
                <View key="for">
                  <Text style={base.sectionName}>{quotation.customer.name}</Text>
                  {quotation.customer.address && <Text style={base.sectionDetail}>{quotation.customer.address}</Text>}
                  {quotation.customer.town    && <Text style={base.sectionDetail}>{quotation.customer.town}</Text>}
                  {quotation.customer.poBox   && <Text style={base.sectionDetail}>{quotation.customer.poBox}</Text>}
                  {quotation.customer.email   && <Text style={base.sectionDetail}>Email: {quotation.customer.email}</Text>}
                  {quotation.customer.phone   && <Text style={base.sectionDetail}>Phone: {quotation.customer.phone}</Text>}
                </View>
              ) : (
                <Text key="walkin" style={[base.sectionDetail, { fontStyle: "italic" }]}>Walk-in customer</Text>
              ),
            },
          ].map(({ label, content }) => (
            <View key={label} style={[base.sectionBox, { flex: 1 }]}>
              <Text style={[base.sectionLabel, { color: PURPLE, marginBottom: 5 }]}>{label}</Text>
              {content}
            </View>
          ))}
        </View>

        {/* Table */}
        <View style={base.tableHeader}>
          <Text style={[base.tableHeaderCell, { width: COL.num }]}>#</Text>
          <Text style={[base.tableHeaderCell, { width: COL.item }]}>Item</Text>
          <Text style={[base.tableHeaderCell, { width: COL.qty, textAlign: "center" }]}>Qty</Text>
          <Text style={[base.tableHeaderCell, { width: COL.rate, textAlign: "right" }]}>Rate</Text>
          <Text style={[base.tableHeaderCell, { width: COL.amount, textAlign: "right" }]}>Amount</Text>
        </View>
        {quotation.lines.map((line, i) => (
          <View key={line.id} style={[base.tableRow, i % 2 === 1 ? base.tableRowAlt : {}]}>
            <Text style={[base.tableCellGray, { width: COL.num }]}>{i + 1}.</Text>
            <Text style={[base.tableCell,     { width: COL.item }]}>{line.description}</Text>
            <Text style={[base.tableCell,     { width: COL.qty, textAlign: "center" }]}>{line.qty}</Text>
            <Text style={[base.tableCellGray, { width: COL.rate, textAlign: "right" }]}>{fmt(line.unitPrice)}</Text>
            <Text style={[base.tableCell,     { width: COL.amount, textAlign: "right" }]}>{fmt(line.lineTotal)}</Text>
          </View>
        ))}

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

        {/* Note */}
        {quotation.note && (
          <View style={[base.sectionBox, { marginBottom: 14 }]}>
            <Text style={base.sectionLabel}>Note</Text>
            <Text style={base.sectionDetail}>{quotation.note}</Text>
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
          <Text style={base.footerText}>Quotation No: {quotNo} · Valid until {validStr}</Text>
        </View>
      </Page>
    </Document>
  );
}
