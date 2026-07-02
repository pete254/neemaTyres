import { Document, Page, View, Text } from "@react-pdf/renderer";
import { StyleSheet } from "@react-pdf/renderer";
import { base, fmt, GRAY, LIGHT, PURPLE, RED } from "./styles";
import type { ShopInfo } from "@/lib/shopInfo";
import Decimal from "decimal.js";

interface Variant {
  id: string;
  sizeBucket: string;
  sizeCanonical: string;
  position: string;
  subLabel: string | null;
  patternCode: string | null;
  qtyOnHand: number;
  wacCost: { toString(): string };
  referenceSellPrice: { toString(): string } | null;
  brand: { name: string };
}

const ls = StyleSheet.create({
  page: { ...base.page, paddingHorizontal: 24, paddingTop: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: PURPLE, paddingBottom: 10, marginBottom: 14 },
  col: {
    size:   { width: "8%"  },
    name:   { width: "12%" },
    brand:  { width: "14%" },
    pos:    { width: "8%"  },
    sub:    { width: "9%"  },
    pattern:{ width: "10%" },
    qty:    { width: "7%"  },
    wac:    { width: "13%" },
    ref:    { width: "11%" },
    value:  { width: "8%"  },
  },
});

export function StockReportPDF({ variants, shop, printDate }: { variants: Variant[]; shop: ShopInfo; printDate: string }) {
  const totalQty = variants.reduce((s, v) => s + v.qtyOnHand, 0);
  const totalValue = variants.reduce(
    (s, v) => s.plus(new Decimal(v.qtyOnHand).mul(v.wacCost.toString())),
    new Decimal(0)
  );

  const COLS = [
    { key: "size",    label: "Bucket", style: ls.col.size,    align: "left"  as const },
    { key: "name",    label: "Size",   style: ls.col.name,    align: "left"  as const },
    { key: "brand",   label: "Brand",  style: ls.col.brand,   align: "left"  as const },
    { key: "pos",     label: "Pos",    style: ls.col.pos,     align: "left"  as const },
    { key: "sub",     label: "Sub",    style: ls.col.sub,     align: "left"  as const },
    { key: "pattern", label: "Pattern",style: ls.col.pattern,  align: "left"  as const },
    { key: "qty",     label: "Qty",    style: ls.col.qty,     align: "right" as const },
    { key: "wac",     label: "WAC",    style: ls.col.wac,     align: "right" as const },
    { key: "ref",     label: "Sell Ref",style: ls.col.ref,    align: "right" as const },
    { key: "value",   label: "Value@WAC", style: ls.col.value, align: "right" as const },
  ];

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
        <View style={[base.tableHeader, { paddingHorizontal: 2 }]}>
          {COLS.map((c) => (
            <Text key={c.key} style={[base.tableHeaderCell, c.style, { textAlign: c.align, fontSize: 7 }]}>
              {c.label}
            </Text>
          ))}
        </View>

        {/* Rows */}
        {variants.map((v, i) => {
          const value = new Decimal(v.qtyOnHand).mul(v.wacCost.toString());
          const neg = v.qtyOnHand < 0;
          const rowStyle = neg ? { backgroundColor: "#FEF2F2" } : i % 2 === 1 ? { backgroundColor: LIGHT } : {};
          const textColor = neg ? RED : "#111827";
          const grayColor = neg ? RED : GRAY;
          return (
            <View key={v.id} style={[base.tableRow, rowStyle, { paddingHorizontal: 2, paddingVertical: 4 }]}>
              <Text style={[base.tableCell, ls.col.size,    { color: textColor, fontFamily: "Helvetica-Bold", fontSize: 7 }]}>{v.sizeBucket}</Text>
              <Text style={[base.tableCell, ls.col.name,    { color: textColor, fontSize: 7 }]}>{v.sizeCanonical}</Text>
              <Text style={[base.tableCell, ls.col.brand,   { color: textColor, fontSize: 7 }]}>{v.brand.name}</Text>
              <Text style={[base.tableCell, ls.col.pos,     { color: grayColor, fontSize: 7 }]}>{v.position}</Text>
              <Text style={[base.tableCell, ls.col.sub,     { color: grayColor, fontSize: 7 }]}>{v.subLabel ?? "—"}</Text>
              <Text style={[base.tableCell, ls.col.pattern, { color: grayColor, fontSize: 7 }]}>{v.patternCode ?? "—"}</Text>
              <Text style={[base.tableCell, ls.col.qty,     { color: textColor, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 7 }]}>{v.qtyOnHand}</Text>
              <Text style={[base.tableCell, ls.col.wac,     { color: grayColor, textAlign: "right", fontSize: 7 }]}>{fmt(v.wacCost.toString())}</Text>
              <Text style={[base.tableCell, ls.col.ref,     { color: grayColor, textAlign: "right", fontSize: 7 }]}>{v.referenceSellPrice ? fmt(v.referenceSellPrice.toString()) : "—"}</Text>
              <Text style={[base.tableCell, ls.col.value,   { color: textColor, textAlign: "right", fontSize: 7 }]}>{fmt(value)}</Text>
            </View>
          );
        })}

        {/* Totals row */}
        <View style={{ flexDirection: "row", borderTopWidth: 1.5, borderTopColor: PURPLE, paddingTop: 5, paddingHorizontal: 2, marginTop: 2 }}>
          <Text style={{ fontSize: 8, color: GRAY, width: "62%", fontFamily: "Helvetica-Bold" }}>{variants.length} variants</Text>
          <Text style={{ fontSize: 8, color: "#111827", width: "7%",  textAlign: "right", fontFamily: "Helvetica-Bold" }}>{totalQty}</Text>
          <Text style={{ width: "11%" }} />
          <Text style={{ width: "11%" }} />
          <Text style={{ fontSize: 8, color: PURPLE, width: "8%",  textAlign: "right", fontFamily: "Helvetica-Bold" }}>{fmt(totalValue)}</Text>
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
