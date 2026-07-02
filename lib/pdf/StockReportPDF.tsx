import { Document, Page, View, Text } from "@react-pdf/renderer";
import { fmt, GRAY, LIGHT, PURPLE, RED } from "./styles";
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

// Tighter columns for narrow data (Bucket/Pos/Qty), wider for text (Size/Brand)
const COL = {
  bucket: "7%",
  size:   "26%",
  brand:  "25%",
  pos:    "9%",
  qty:    "6%",
  wac:    "15%",
  value:  "12%",
};

const FONT = 9.5;
const HEADER_FONT = 9;
const PAD = 16; // reduced horizontal page margin

export function StockReportPDF({ variants, shop, printDate }: { variants: Variant[]; shop: ShopInfo; printDate: string }) {
  const totalQty = variants.reduce((s, v) => s + v.qtyOnHand, 0);
  const totalValue = variants.reduce(
    (s, v) => s.plus(new Decimal(v.qtyOnHand).mul(v.wacCost.toString())),
    new Decimal(0)
  );

  const page = {
    fontFamily: "Helvetica",
    fontSize: FONT,
    color: "#111827",
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: PAD,
    backgroundColor: "#ffffff",
  };

  const cell = (extra?: object) => ({ fontSize: FONT, color: "#111827", ...extra });
  const grayCell = (extra?: object) => ({ fontSize: FONT, color: GRAY, ...extra });

  return (
    <Document title="Stock Report">
      <Page size="A4" orientation="landscape" style={page}>

        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: PURPLE, paddingBottom: 10, marginBottom: 12 }}>
          <View>
            {shop.name
              ? <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 2 }}>{shop.name}</Text>
              : <Text style={{ fontSize: 9, color: GRAY, fontStyle: "italic" }}>Shop name not configured</Text>}
            {shop.address && <Text style={{ fontSize: 8.5, color: GRAY, marginBottom: 1 }}>{shop.address}</Text>}
            {shop.town    && <Text style={{ fontSize: 8.5, color: GRAY, marginBottom: 1 }}>{shop.town}</Text>}
            {shop.phone   && <Text style={{ fontSize: 8.5, color: GRAY }}>{shop.phone}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: PURPLE, textTransform: "uppercase" }}>Stock Report</Text>
            <Text style={{ fontSize: 8.5, color: GRAY, marginTop: 4 }}>As at {printDate}</Text>
            <Text style={{ fontSize: 8.5, color: GRAY, marginTop: 1 }}>{variants.length} variants · Total qty: {totalQty}</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={{ flexDirection: "row", backgroundColor: PURPLE, paddingVertical: 7, paddingHorizontal: 4 }}>
          <Text style={{ color: "#fff", fontSize: HEADER_FONT, fontFamily: "Helvetica-Bold", width: COL.bucket }}>Bucket</Text>
          <Text style={{ color: "#fff", fontSize: HEADER_FONT, fontFamily: "Helvetica-Bold", width: COL.size }}>Size</Text>
          <Text style={{ color: "#fff", fontSize: HEADER_FONT, fontFamily: "Helvetica-Bold", width: COL.brand }}>Brand</Text>
          <Text style={{ color: "#fff", fontSize: HEADER_FONT, fontFamily: "Helvetica-Bold", width: COL.pos }}>Position</Text>
          <Text style={{ color: "#fff", fontSize: HEADER_FONT, fontFamily: "Helvetica-Bold", width: COL.qty, textAlign: "right" }}>Qty</Text>
          <Text style={{ color: "#fff", fontSize: HEADER_FONT, fontFamily: "Helvetica-Bold", width: COL.wac, textAlign: "right" }}>WAC Cost</Text>
          <Text style={{ color: "#fff", fontSize: HEADER_FONT, fontFamily: "Helvetica-Bold", width: COL.value, textAlign: "right" }}>Value @ WAC</Text>
        </View>

        {/* Rows */}
        {variants.map((v, i) => {
          const value = new Decimal(v.qtyOnHand).mul(v.wacCost.toString());
          const neg = v.qtyOnHand < 0;
          const rowBg = neg ? { backgroundColor: "#FEF2F2" } : i % 2 === 1 ? { backgroundColor: LIGHT } : {};
          const textColor = neg ? RED : "#111827";
          const grayColor = neg ? RED : GRAY;

          return (
            <View key={v.id} style={{ flexDirection: "row", paddingVertical: 5.5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB", ...rowBg }}>
              <Text style={cell({ width: COL.bucket, fontFamily: "Helvetica-Bold", color: textColor })}>{v.sizeBucket}</Text>
              <Text style={cell({ width: COL.size, color: textColor })}>{v.sizeCanonical}</Text>
              <Text style={cell({ width: COL.brand, color: textColor })}>{v.brand.name}</Text>
              <Text style={grayCell({ width: COL.pos, color: grayColor })}>{v.position}</Text>
              <Text style={cell({ width: COL.qty, textAlign: "right", fontFamily: "Helvetica-Bold", color: textColor })}>{v.qtyOnHand}</Text>
              <Text style={grayCell({ width: COL.wac, textAlign: "right", color: grayColor })}>{fmt(v.wacCost.toString())}</Text>
              <Text style={cell({ width: COL.value, textAlign: "right", color: textColor })}>{fmt(value.toString())}</Text>
            </View>
          );
        })}

        {/* Totals row */}
        <View style={{ flexDirection: "row", borderTopWidth: 1.5, borderTopColor: PURPLE, paddingTop: 6, paddingHorizontal: 4, marginTop: 2 }}>
          <Text style={{ fontSize: FONT, color: GRAY, fontFamily: "Helvetica-Bold", width: "68%" }}>
            {variants.length} variant{variants.length !== 1 ? "s" : ""}
          </Text>
          <Text style={{ fontSize: FONT, color: "#111827", fontFamily: "Helvetica-Bold", width: COL.qty, textAlign: "right" }}>
            {totalQty}
          </Text>
          <Text style={{ width: COL.wac }} />
          <Text style={{ fontSize: FONT, color: PURPLE, fontFamily: "Helvetica-Bold", width: COL.value, textAlign: "right" }}>
            {fmt(totalValue.toString())}
          </Text>
        </View>

        {/* Footer */}
        <View style={{ position: "absolute", bottom: 16, left: PAD, right: PAD, borderTopWidth: 0.5, borderTopColor: "#E5E7EB", paddingTop: 5, flexDirection: "row", justifyContent: "space-between" }} fixed>
          <Text style={{ fontSize: 7.5, color: GRAY }}>{shop.name ?? ""} · Stock Report</Text>
          <Text style={{ fontSize: 7.5, color: GRAY }}>As at {printDate}</Text>
        </View>
      </Page>
    </Document>
  );
}
