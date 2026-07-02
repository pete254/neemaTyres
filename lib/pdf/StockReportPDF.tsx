import { Document, Page, View, Text } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { base, fmt, GRAY, LIGHT, PURPLE, RED } from "./styles";
import type { ShopInfoData as ShopInfo } from "@/lib/shopInfo";
import Decimal from "decimal.js";

interface Variant {
  id: string;
  sizeBucket: string;
  sizeCanonical: string;
  position: string;
  qtyOnHand: number;
  wacCost: { toString(): string };
  brand: { name: string };
}

// 7 columns (removed: sub, pattern, sell ref) — widths sum to 100%
const COL = {
  size:  { width: "10%" },
  name:  { width: "22%" },
  brand: { width: "22%" },
  pos:   { width: "10%" },
  qty:   { width: "10%" },
  wac:   { width: "14%" },
  value: { width: "12%" },
};

const ls = StyleSheet.create({
  page: { ...base.page, paddingHorizontal: 24, paddingTop: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: PURPLE,
    paddingBottom: 10,
    marginBottom: 14,
  },
});

export function StockReportPDF({ variants, shop, printDate }: { variants: Variant[]; shop: ShopInfo; printDate: string }) {
  const totalQty = variants.reduce((s, v) => s + v.qtyOnHand, 0);
  const totalValue = variants.reduce(
    (s, v) => s.plus(new Decimal(v.qtyOnHand).mul(v.wacCost.toString())),
    new Decimal(0)
  );

  return (
    <Document title="Stock Report">
      <Page size="A4" orientation="landscape" style={ls.page}>

        {/* Header */}
        <View style={ls.header}>
          <View>
            {shop.name
              ? <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 2 }}>{shop.name}</Text>
              : <Text style={{ fontSize: 8, color: GRAY, fontStyle: "italic" }}>Shop name not configured</Text>}
            {shop.address && <Text style={base.shopDetail}>{shop.address}</Text>}
            {shop.town    && <Text style={base.shopDetail}>{shop.town}</Text>}
            {shop.phone   && <Text style={base.shopDetail}>{shop.phone}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: PURPLE, textTransform: "uppercase" }}>Stock Report</Text>
            <Text style={{ fontSize: 8, color: GRAY, marginTop: 3 }}>As at {printDate}</Text>
            <Text style={{ fontSize: 8, color: GRAY, marginTop: 1 }}>{variants.length} variants · Total qty: {totalQty}</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={[base.tableHeader, { paddingHorizontal: 4 }]}>
          <Text style={[base.tableHeaderCell, COL.size]}>Bucket</Text>
          <Text style={[base.tableHeaderCell, COL.name]}>Size</Text>
          <Text style={[base.tableHeaderCell, COL.brand]}>Brand</Text>
          <Text style={[base.tableHeaderCell, COL.pos]}>Position</Text>
          <Text style={[base.tableHeaderCell, COL.qty, { textAlign: "right" }]}>Qty</Text>
          <Text style={[base.tableHeaderCell, COL.wac, { textAlign: "right" }]}>WAC Cost</Text>
          <Text style={[base.tableHeaderCell, COL.value, { textAlign: "right" }]}>Value @ WAC</Text>
        </View>

        {/* Rows */}
        {variants.map((v, i) => {
          const value = new Decimal(v.qtyOnHand).mul(v.wacCost.toString());
          const neg = v.qtyOnHand < 0;
          const rowStyle = neg ? { backgroundColor: "#FEF2F2" } : i % 2 === 1 ? { backgroundColor: LIGHT } : {};
          const textColor = neg ? RED : "#111827";
          const grayColor = neg ? RED : GRAY;

          return (
            <View key={v.id} style={[base.tableRow, rowStyle, { paddingHorizontal: 4, paddingVertical: 5 }]}>
              <Text style={[base.tableCell, COL.size,  { color: textColor, fontFamily: "Helvetica-Bold" }]}>{v.sizeBucket}</Text>
              <Text style={[base.tableCell, COL.name,  { color: textColor }]}>{v.sizeCanonical}</Text>
              <Text style={[base.tableCell, COL.brand, { color: textColor }]}>{v.brand.name}</Text>
              <Text style={[base.tableCell, COL.pos,   { color: grayColor }]}>{v.position}</Text>
              <Text style={[base.tableCell, COL.qty,   { color: textColor, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{v.qtyOnHand}</Text>
              <Text style={[base.tableCell, COL.wac,   { color: grayColor, textAlign: "right" }]}>{fmt(v.wacCost.toString())}</Text>
              <Text style={[base.tableCell, COL.value, { color: textColor, textAlign: "right" }]}>{fmt(value.toString())}</Text>
            </View>
          );
        })}

        {/* Totals row */}
        <View style={{ flexDirection: "row", borderTopWidth: 1.5, borderTopColor: PURPLE, paddingTop: 6, paddingHorizontal: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 8, color: GRAY, fontFamily: "Helvetica-Bold", width: "64%" }}>
            {variants.length} variant{variants.length !== 1 ? "s" : ""}
          </Text>
          <Text style={{ fontSize: 8, color: "#111827", fontFamily: "Helvetica-Bold", width: "10%", textAlign: "right" }}>
            {totalQty}
          </Text>
          <Text style={{ width: "14%" }} />
          <Text style={{ fontSize: 8, color: PURPLE, fontFamily: "Helvetica-Bold", width: "12%", textAlign: "right" }}>
            {fmt(totalValue.toString())}
          </Text>
        </View>

        {/* Footer */}
        <View style={base.footer} fixed>
          <Text style={base.footerText}>{shop.name ?? ""} · Stock Report</Text>
          <Text style={base.footerText}>As at {printDate}</Text>
        </View>
      </Page>
    </Document>
  );
}
