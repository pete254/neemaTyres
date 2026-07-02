import { Document, Page, View, Text } from "@react-pdf/renderer";
import { base, GRAY, PURPLE } from "./styles";
import type { ShopInfoData as ShopInfo } from "@/lib/shopInfo";

interface Line { id: string; qty: number; variant: { brand: { name: string }; sizeCanonical: string; subLabel: string | null }; }
interface Sale {
  id: string;
  date: Date | string;
  customer: { name: string; phone?: string | null; address?: string | null; town?: string | null; poBox?: string | null } | null;
  lines: Line[];
  recordedBy: { name: string } | null;
}

export function DeliveryNotePDF({ sale, shop }: { sale: Sale; shop: ShopInfo }) {
  const docNo = sale.id.slice(-8).toUpperCase();
  const dateStr = new Date(sale.date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });

  const COL = { num: "5%", item: "65%", qty: "15%", recv: "15%" };

  return (
    <Document title={`Delivery Note ${docNo}`}>
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View style={base.headerRow}>
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
          <View>
            <Text style={base.docType}>Delivery Note</Text>
            <Text style={base.docMeta}>No: {docNo}</Text>
            <Text style={base.docMeta}>Date: {dateStr}</Text>
            {sale.recordedBy && <Text style={[base.docMeta, { marginTop: 2 }]}>Issued by: {sale.recordedBy.name}</Text>}
          </View>
        </View>

        {/* Deliver To */}
        {sale.customer && (
          <View style={base.sectionBox}>
            <Text style={base.sectionLabel}>Deliver To</Text>
            <Text style={base.sectionName}>{sale.customer.name}</Text>
            {sale.customer.address && <Text style={base.sectionDetail}>{sale.customer.address}</Text>}
            {sale.customer.town    && <Text style={base.sectionDetail}>{sale.customer.town}</Text>}
            {sale.customer.poBox   && <Text style={base.sectionDetail}>{sale.customer.poBox}</Text>}
            {sale.customer.phone   && <Text style={base.sectionDetail}>Phone: {sale.customer.phone}</Text>}
          </View>
        )}

        {/* Table — no prices */}
        <View style={base.tableHeader}>
          <Text style={[base.tableHeaderCell, { width: COL.num }]}>#</Text>
          <Text style={[base.tableHeaderCell, { width: COL.item }]}>Item / Description</Text>
          <Text style={[base.tableHeaderCell, { width: COL.qty, textAlign: "center" }]}>Qty</Text>
          <Text style={[base.tableHeaderCell, { width: COL.recv, textAlign: "center" }]}>Received ✓</Text>
        </View>
        {sale.lines.map((line, i) => {
          const label = `${line.variant.brand.name} ${line.variant.sizeCanonical}${line.variant.subLabel ? " " + line.variant.subLabel : ""}`;
          return (
            <View key={line.id} style={[base.tableRow, i % 2 === 1 ? base.tableRowAlt : {}]}>
              <Text style={[base.tableCellGray, { width: COL.num }]}>{i + 1}.</Text>
              <Text style={[base.tableCell,     { width: COL.item }]}>{label}</Text>
              <Text style={[base.tableCell,     { width: COL.qty, textAlign: "center", fontFamily: "Helvetica-Bold" }]}>{line.qty}</Text>
              <Text style={[base.tableCellGray, { width: COL.recv, textAlign: "center" }]}>__________</Text>
            </View>
          );
        })}

        {/* Signature blocks */}
        <View style={{ flexDirection: "row", marginTop: 48, gap: 40 }}>
          {["Issued by", "Received by"].map((label) => (
            <View key={label} style={{ flex: 1, borderTopWidth: 1, borderTopColor: "#9CA3AF", paddingTop: 6 }}>
              <Text style={{ fontSize: 8, color: GRAY, marginBottom: 20 }}>{label} (signature)</Text>
              <Text style={{ fontSize: 8, color: "#D1D5DB" }}>Name: _______________________________</Text>
              {label === "Received by" && (
                <Text style={{ fontSize: 8, color: "#D1D5DB", marginTop: 10 }}>Date: ________________________________</Text>
              )}
            </View>
          ))}
        </View>

        {/* Terms */}
        {shop.terms.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={[base.sectionLabel, { color: PURPLE, marginBottom: 5 }]}>Terms and Conditions</Text>
            {shop.terms.map((t, i) => (
              <Text key={i} style={[base.shopDetail, { marginBottom: 2 }]}>{i + 1}. {t}</Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>{shop.name ?? ""}</Text>
          <Text style={base.footerText}>Delivery Note No: {docNo} · {dateStr}</Text>
        </View>
      </Page>
    </Document>
  );
}
