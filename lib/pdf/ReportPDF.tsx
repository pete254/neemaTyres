import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base, fmt, GRAY, LIGHT, PURPLE } from "./styles";
import type { ShopInfoData as ShopInfo } from "@/lib/shopInfo";

interface DayRow {
  date: string;
  salesCount: number;
  cash: number | string;
  mpesa: number | string;
  debt: number | string;
  revenue: number | string;
}

interface ReportData {
  fromStr: string;
  toStr: string;
  totalRevenue: string;
  totalCash: string;
  totalMpesa: string;
  totalDebt: string;
  stockValueAtWac: string;
  salesCount: number;
  purchasesCount: number;
  days: DayRow[];
}

const COL = { date: "18%", sales: "10%", cash: "18%", mpesa: "18%", debt: "18%", revenue: "18%" };

export function ReportPDF({ data, shop }: { data: ReportData; shop: ShopInfo }) {
  return (
    <Document title={`Sales Report ${data.fromStr} to ${data.toStr}`}>
      <Page size="A4" style={base.page}>

        {/* Header */}
        <View style={base.headerRow}>
          <View>
            {shop.name
              ? <Text style={base.shopName}>{shop.name}</Text>
              : <Text style={[base.shopDetail, { fontStyle: "italic" }]}>Shop name not configured</Text>}
            {shop.poBox    && <Text style={base.shopDetail}>{shop.poBox}</Text>}
            {shop.address  && <Text style={base.shopDetail}>{shop.address}</Text>}
            {shop.town     && <Text style={base.shopDetail}>{shop.town}{shop.county ? `, ${shop.county}` : ""}</Text>}
            {shop.phone    && <Text style={base.shopDetail}>Tel: {shop.phone}</Text>}
            {shop.email    && <Text style={base.shopDetail}>{shop.email}</Text>}
          </View>
          <View>
            <Text style={base.docType}>Sales Report</Text>
            <Text style={base.docMeta}>Period: {data.fromStr} — {data.toStr}</Text>
          </View>
        </View>

        {/* Summary tiles */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Total Revenue", value: fmt(data.totalRevenue), accent: true },
            { label: "Cash",          value: fmt(data.totalCash) },
            { label: "M-Pesa",        value: fmt(data.totalMpesa) },
            { label: "Debt Issued",   value: fmt(data.totalDebt) },
          ].map((t) => (
            <View key={t.label} style={{ flex: 1, backgroundColor: LIGHT, borderRadius: 4, padding: 8 }}>
              <Text style={{ fontSize: 7, color: GRAY, marginBottom: 3 }}>{t.label}</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: t.accent ? PURPLE : "#111827" }}>{t.value}</Text>
            </View>
          ))}
        </View>

        {/* Secondary stats */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Stock Value (WAC)", value: fmt(data.stockValueAtWac) },
            { label: "Total Sales",       value: String(data.salesCount) },
            { label: "Purchases",         value: String(data.purchasesCount) },
          ].map((t) => (
            <View key={t.label} style={{ flex: 1, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 4, padding: 8 }}>
              <Text style={{ fontSize: 7, color: GRAY, marginBottom: 3 }}>{t.label}</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827" }}>{t.value}</Text>
            </View>
          ))}
        </View>

        {/* Section label */}
        <Text style={{ fontSize: 8, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Daily Breakdown
        </Text>

        {/* Table header */}
        <View style={[base.tableHeader, { paddingHorizontal: 4 }]}>
          <Text style={[base.tableHeaderCell, { width: COL.date }]}>Date</Text>
          <Text style={[base.tableHeaderCell, { width: COL.sales, textAlign: "center" }]}>Sales</Text>
          <Text style={[base.tableHeaderCell, { width: COL.cash, textAlign: "right" }]}>Cash</Text>
          <Text style={[base.tableHeaderCell, { width: COL.mpesa, textAlign: "right" }]}>M-Pesa</Text>
          <Text style={[base.tableHeaderCell, { width: COL.debt, textAlign: "right" }]}>Debt</Text>
          <Text style={[base.tableHeaderCell, { width: COL.revenue, textAlign: "right" }]}>Revenue</Text>
        </View>

        {/* Rows */}
        {data.days.map((d, i) => (
          <View key={d.date} style={[base.tableRow, i % 2 === 1 ? base.tableRowAlt : {}, { paddingHorizontal: 4 }]}>
            <Text style={[base.tableCell, { width: COL.date }]}>{d.date}</Text>
            <Text style={[base.tableCell, { width: COL.sales, textAlign: "center", color: GRAY }]}>{d.salesCount}</Text>
            <Text style={[base.tableCell, { width: COL.cash, textAlign: "right" }]}>{fmt(Number(d.cash))}</Text>
            <Text style={[base.tableCell, { width: COL.mpesa, textAlign: "right" }]}>{fmt(Number(d.mpesa))}</Text>
            <Text style={[base.tableCell, { width: COL.debt, textAlign: "right", color: GRAY }]}>{fmt(Number(d.debt))}</Text>
            <Text style={[base.tableCell, { width: COL.revenue, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{fmt(Number(d.revenue))}</Text>
          </View>
        ))}

        {/* Totals row */}
        <View style={{ flexDirection: "row", borderTopWidth: 1.5, borderTopColor: PURPLE, paddingTop: 5, paddingHorizontal: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 8, color: GRAY, width: COL.date, fontFamily: "Helvetica-Bold" }}>{data.days.length} days</Text>
          <Text style={{ width: COL.sales }} />
          <Text style={{ fontSize: 8, width: COL.cash, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#111827" }}>{fmt(data.totalCash)}</Text>
          <Text style={{ fontSize: 8, width: COL.mpesa, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#111827" }}>{fmt(data.totalMpesa)}</Text>
          <Text style={{ fontSize: 8, width: COL.debt, textAlign: "right", color: GRAY }}>{fmt(data.totalDebt)}</Text>
          <Text style={{ fontSize: 8, width: COL.revenue, textAlign: "right", fontFamily: "Helvetica-Bold", color: PURPLE }}>{fmt(data.totalRevenue)}</Text>
        </View>

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>{shop.name ?? ""} · Sales Report</Text>
          <Text style={base.footerText}>{data.fromStr} to {data.toStr}</Text>
        </View>
      </Page>
    </Document>
  );
}
