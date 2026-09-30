import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { base, fmt, GRAY, LIGHT, PURPLE } from "./styles";
import type { ShopInfoData as ShopInfo } from "@/lib/shopInfo";

interface StatementRow {
  id: string;
  date: string;
  description: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

interface StatementData {
  supplier: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    town: string | null;
    poBox: string | null;
  };
  entries: StatementRow[];
  from: string | null;
  to: string | null;
  filterNotes: string[];
  openingBalance: string | null;
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  generatedOn: string;
}

const COL = { date: "13%", desc: "45%", debit: "14%", credit: "14%", balance: "14%" };

const dateStr = (d: string) =>
  new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });

export function SupplierStatementPDF({
  data,
  shop,
  logoSrc,
}: {
  data: StatementData;
  shop: ShopInfo;
  logoSrc?: string;
}) {
  const { supplier } = data;
  const first = data.from ?? data.entries[0]?.date;
  const last = data.to ?? data.entries[data.entries.length - 1]?.date;
  const period = first && last ? `${dateStr(first)} — ${dateStr(last)}` : "No entries";

  return (
    <Document title={`Statement — ${supplier.name}`}>
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
            <Text style={base.docType}>Statement</Text>
            <Text style={base.docMeta}>Period: {period}</Text>
            <Text style={base.docMeta}>Generated: {dateStr(data.generatedOn)}</Text>
            {data.filterNotes.map((n) => (
              <Text key={n} style={base.docMeta}>{n}</Text>
            ))}
          </View>
        </View>

        {/* Supplier + balance */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <View style={[base.sectionBox, { flex: 1, marginBottom: 0 }]}>
            <Text style={base.sectionLabel}>Supplier</Text>
            <Text style={base.sectionName}>{supplier.name}</Text>
            {supplier.poBox   && <Text style={base.sectionDetail}>{supplier.poBox}</Text>}
            {supplier.address && <Text style={base.sectionDetail}>{supplier.address}</Text>}
            {supplier.town    && <Text style={base.sectionDetail}>{supplier.town}</Text>}
            {supplier.phone   && <Text style={base.sectionDetail}>Phone: {supplier.phone}</Text>}
            {supplier.email   && <Text style={base.sectionDetail}>Email: {supplier.email}</Text>}
          </View>
          <View style={{ width: "38%", gap: 6 }}>
            {[
              ...(data.openingBalance !== null
                ? [{ label: "Balance Brought Forward", value: fmt(data.openingBalance) }]
                : []),
              { label: "Total Debits (Purchases)", value: fmt(data.totalDebit) },
              { label: "Total Credits (Payments & Returns)", value: fmt(data.totalCredit) },
            ].map((t) => (
              <View key={t.label} style={{ backgroundColor: LIGHT, borderRadius: 4, padding: 6 }}>
                <Text style={{ fontSize: 7, color: GRAY, marginBottom: 2 }}>{t.label}</Text>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{t.value}</Text>
              </View>
            ))}
            <View style={{ borderWidth: 1, borderColor: PURPLE, borderRadius: 4, padding: 6 }}>
              <Text style={{ fontSize: 7, color: GRAY, marginBottom: 2 }}>
                {data.to ? `Balance Due as at ${dateStr(data.to)}` : "Balance Due"}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: PURPLE }}>{fmt(data.closingBalance)}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={base.tableHeader} fixed>
          <Text style={[base.tableHeaderCell, { width: COL.date }]}>Date</Text>
          <Text style={[base.tableHeaderCell, { width: COL.desc }]}>Description</Text>
          <Text style={[base.tableHeaderCell, { width: COL.debit, textAlign: "right" }]}>Debit</Text>
          <Text style={[base.tableHeaderCell, { width: COL.credit, textAlign: "right" }]}>Credit</Text>
          <Text style={[base.tableHeaderCell, { width: COL.balance, textAlign: "right" }]}>Balance</Text>
        </View>

        {data.openingBalance !== null && data.from && (
          <View style={base.tableRow} wrap={false}>
            <Text style={[base.tableCellGray, { width: COL.date }]}>{dateStr(data.from)}</Text>
            <Text style={[base.tableCellGray, { width: COL.desc, fontStyle: "italic" }]}>Balance brought forward</Text>
            <Text style={{ width: COL.debit }} />
            <Text style={{ width: COL.credit }} />
            <Text style={[base.tableCell, { width: COL.balance, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{fmt(data.openingBalance)}</Text>
          </View>
        )}

        {data.entries.map((e, i) => (
          <View key={e.id} style={[base.tableRow, i % 2 === 1 ? base.tableRowAlt : {}]} wrap={false}>
            <Text style={[base.tableCellGray, { width: COL.date }]}>{dateStr(e.date)}</Text>
            <Text style={[base.tableCell, { width: COL.desc, paddingRight: 6 }]}>{e.description}</Text>
            <Text style={[base.tableCell, { width: COL.debit, textAlign: "right" }]}>{Number(e.debit) > 0 ? fmt(e.debit) : "-"}</Text>
            <Text style={[base.tableCell, { width: COL.credit, textAlign: "right" }]}>{Number(e.credit) > 0 ? fmt(e.credit) : "-"}</Text>
            <Text style={[base.tableCell, { width: COL.balance, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{fmt(e.runningBalance)}</Text>
          </View>
        ))}

        {data.entries.length === 0 && (
          <Text style={{ fontSize: 9, color: GRAY, textAlign: "center", paddingVertical: 20 }}>No entries for this period.</Text>
        )}

        {/* Totals */}
        <View style={{ flexDirection: "row", borderTopWidth: 1.5, borderTopColor: PURPLE, paddingTop: 5, paddingHorizontal: 4, marginTop: 2 }} wrap={false}>
          <Text style={{ width: COL.date }} />
          <Text style={{ fontSize: 8, width: COL.desc, fontFamily: "Helvetica-Bold", color: GRAY }}>Totals</Text>
          <Text style={{ fontSize: 8, width: COL.debit, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{fmt(data.totalDebit)}</Text>
          <Text style={{ fontSize: 8, width: COL.credit, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{fmt(data.totalCredit)}</Text>
          <Text style={{ fontSize: 8, width: COL.balance, textAlign: "right", fontFamily: "Helvetica-Bold", color: PURPLE }}>{fmt(data.closingBalance)}</Text>
        </View>

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>{shop.name ?? ""} · Statement — {supplier.name}</Text>
          <Text style={base.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
