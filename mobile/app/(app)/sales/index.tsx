import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface SaleLineItem {
  variantLabel: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
}

interface SaleGroup {
  saleId: string;
  customerName: string | null;
  total: string;
  channels: string;
  lines: SaleLineItem[];
}

interface SaleDay {
  date: string;
  salesCount: number;
  revenue: string;
  cash: string;
  mpesa: string;
  debt: string;
  saleGroups: SaleGroup[];
}

export default function SalesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { top } = useSafeAreaInsets();
  const bottomPadding = useBottomPadding();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [query, setQuery] = useState({ from: today(), to: today() });

  const { data } = useQuery({
    queryKey: keys.sales(query.from, query.to),
    queryFn: () => api.get<{ days: SaleDay[]; totalRevenue: string }>(`/api/mobile/sales?from=${query.from}&to=${query.to}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (saleId: string) => api.delete(`/api/mobile/sales/${saleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.sales(query.from, query.to) });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
      queryClient.invalidateQueries({ queryKey: keys.inventory });
    },
    onError: (e) => Alert.alert("Error", e instanceof Error ? e.message : "Delete failed"),
  });

  const confirmDelete = (saleId: string) => {
    Alert.alert("Delete Sale", "This will restore stock. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(saleId) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: top + 16 }]}>
      <View style={styles.dateRow}>
        <TextInput style={styles.dateInput} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
        <Text style={styles.sep}>→</Text>
        <TextInput style={styles.dateInput} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
        <TouchableOpacity style={styles.runBtn} onPress={() => setQuery({ from, to })}>
          <Text style={styles.runText}>Go</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(app)/sales/new")}>
        <Text style={styles.addBtnText}>+ Record Sale</Text>
      </TouchableOpacity>
      <FlatList
        data={data?.days ?? []}
        keyExtractor={(d) => d.date}
        renderItem={({ item }) => (
          <View style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayDate}>{item.date}</Text>
              <Text style={styles.dayRevenue}>KES {parseFloat(item.revenue).toLocaleString()}</Text>
            </View>
            {item.saleGroups.map((sale) => (
              <View key={sale.saleId} style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <Text style={styles.saleName}>{sale.customerName ?? "Walk-in"}</Text>
                  <View style={styles.saleActions}>
                    <Text style={styles.saleTotal}>KES {parseFloat(sale.total).toLocaleString()}</Text>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(sale.saleId)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {sale.lines.map((l, i) => (
                  <View key={i} style={styles.line}>
                    <Text style={styles.lineText}>{l.variantLabel} × {l.qty}</Text>
                    <Text style={styles.lineAmount}>KES {parseFloat(l.lineTotal).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No sales in range</Text>}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  dateInput: { flex: 1, backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 10, fontSize: 13 },
  sep: { color: "#71717A" },
  runBtn: { backgroundColor: "#EAB308", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  runText: { color: "#000", fontWeight: "700", fontSize: 13 },
  addBtn: { backgroundColor: "#1C1A00", borderWidth: 1, borderColor: "#EAB308", borderRadius: 8, padding: 12, alignItems: "center", marginBottom: 16 },
  addBtnText: { color: "#EAB308", fontWeight: "600" },
  dayBlock: { marginBottom: 16 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#2A2A2A" },
  dayDate: { color: "#A1A1AA", fontSize: 13, fontWeight: "600" },
  dayRevenue: { color: "#EAB308", fontSize: 13, fontWeight: "600" },
  saleCard: { backgroundColor: "#0D0D0D", borderWidth: 1, borderColor: "#1E1E1E", borderRadius: 8, padding: 12, marginBottom: 8 },
  saleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  saleName: { color: "#fff", fontSize: 13, fontWeight: "500", flex: 1 },
  saleActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  saleTotal: { color: "#EAB308", fontSize: 13, fontWeight: "600" },
  deleteBtn: { backgroundColor: "#1A0000", borderWidth: 1, borderColor: "#7F1D1D", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  deleteBtnText: { color: "#F87171", fontSize: 11 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  lineText: { color: "#A1A1AA", fontSize: 12 },
  lineAmount: { color: "#71717A", fontSize: 12 },
  empty: { color: "#71717A", textAlign: "center", marginTop: 40 },
});
