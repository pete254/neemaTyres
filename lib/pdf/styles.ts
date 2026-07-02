import { StyleSheet } from "@react-pdf/renderer";

export const PURPLE = "#4B0082";
export const YELLOW = "#CA8A04";
export const DARK = "#111827";
export const GRAY = "#6B7280";
export const LIGHT = "#F3F4F6";
export const RED = "#DC2626";

export const base = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
  },
  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottomWidth: 2, borderBottomColor: PURPLE, paddingBottom: 14 },
  shopName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 3 },
  shopDetail: { fontSize: 8, color: GRAY, marginBottom: 1 },
  docType: { fontSize: 20, fontFamily: "Helvetica-Bold", color: PURPLE, textTransform: "uppercase", textAlign: "right" },
  docMeta: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 3 },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: PURPLE, paddingVertical: 6, paddingHorizontal: 4 },
  tableHeaderCell: { color: "#ffffff", fontSize: 8, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  tableRowAlt: { backgroundColor: LIGHT },
  tableCell: { fontSize: 8, color: DARK },
  tableCellGray: { fontSize: 8, color: GRAY },
  // Sections
  sectionBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 10, marginBottom: 14 },
  sectionLabel: { fontSize: 7, color: GRAY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  sectionName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 2 },
  sectionDetail: { fontSize: 8, color: GRAY, marginBottom: 1 },
  // Totals
  totalsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10, marginBottom: 14 },
  totalWords: { fontSize: 8, color: GRAY, maxWidth: "55%" },
  totalAmount: { fontSize: 16, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
  totalLabel: { fontSize: 7, color: GRAY, textAlign: "right", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: "#E5E7EB", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: GRAY },
});

export const fmt = (n: number | string) =>
  "KES " + Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
