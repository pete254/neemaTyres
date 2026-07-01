import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface ReportSummary {
  totalRevenue: string;
  totalCash: string;
  totalMpesa: string;
  totalDebt: string;
  saleCount: number;
  purchaseCount: number;
  stockValue: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(val: string | number) {
  return `KES ${parseFloat(String(val)).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

export default function ReportsScreen() {
  const bottomPadding = useBottomPadding();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [query, setQuery] = useState({ from: today(), to: today() });

  const { data } = useQuery({
    queryKey: keys.reports(query.from, query.to),
    queryFn: () => api.get<{ summary: ReportSummary }>(`/api/mobile/reports?from=${query.from}&to=${query.to}`),
  });

  const s = data?.summary;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.dateRow}>
        <TextInput style={styles.dateInput} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
        <Text style={styles.dateSep}>→</Text>
        <TextInput style={styles.dateInput} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
        <TouchableOpacity style={styles.runBtn} onPress={() => setQuery({ from, to })}>
          <Text style={styles.runBtnText}>Run</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Revenue</Text>
        <Text style={[styles.bigValue, { color: "#EAB308" }]}>{fmt(s?.totalRevenue ?? 0)}</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.label}>Cash</Text>
          <Text style={[styles.value, { color: "#4ADE80" }]}>{fmt(s?.totalCash ?? 0)}</Text>
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.label}>M-Pesa</Text>
          <Text style={[styles.value, { color: "#60A5FA" }]}>{fmt(s?.totalMpesa ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.label}>Debt</Text>
          <Text style={[styles.value, { color: "#F87171" }]}>{fmt(s?.totalDebt ?? 0)}</Text>
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.label}>Stock Value</Text>
          <Text style={[styles.value, { color: "#EAB308" }]}>{fmt(s?.stockValue ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.label}>Sales</Text>
          <Text style={styles.value}>{s?.saleCount ?? "—"}</Text>
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.label}>Purchases</Text>
          <Text style={styles.value}>{s?.purchaseCount ?? "—"}</Text>
        </View>
      </View>
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  dateInput: { flex: 1, backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 10, fontSize: 13 },
  dateSep: { color: "#71717A" },
  runBtn: { backgroundColor: "#EAB308", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  runBtnText: { color: "#000", fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 10, padding: 16, marginBottom: 12 },
  cardTitle: { color: "#71717A", fontSize: 12, marginBottom: 4 },
  bigValue: { fontSize: 28, fontWeight: "bold" },
  row: { flexDirection: "row", marginBottom: 0 },
  label: { color: "#71717A", fontSize: 12, marginBottom: 4 },
  value: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
