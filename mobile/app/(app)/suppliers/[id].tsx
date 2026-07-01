import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface LedgerEntry { id: string; description: string; debit: string; credit: string; runningBalance: string; createdAt: string; }
interface SupplierDetail { supplier: { id: string; name: string }; entries: LedgerEntry[]; }

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bottomPadding = useBottomPadding();
  const { data, isLoading, refetch } = useQuery({
    queryKey: keys.supplier(id),
    queryFn: () => api.get<SupplierDetail>(`/api/mobile/suppliers/${id}`),
  });

  const balance = data?.entries.length
    ? parseFloat(data.entries[data.entries.length - 1].runningBalance)
    : 0;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#EAB308" />}>
      <Text style={styles.name}>{data?.supplier.name ?? "..."}</Text>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Running Balance</Text>
        <Text style={[styles.balanceValue, { color: balance > 0 ? "#F87171" : "#4ADE80" }]}>
          KES {Math.abs(balance).toLocaleString()} {balance > 0 ? "(owed to supplier)" : "(credit)"}
        </Text>
      </View>
      <Text style={styles.sectionLabel}>Ledger</Text>
      {(data?.entries ?? []).map((e) => (
        <View key={e.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.desc}>{e.description}</Text>
            <Text style={styles.date}>{new Date(e.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {parseFloat(e.debit) > 0 && <Text style={{ color: "#F87171", fontSize: 13 }}>+{parseFloat(e.debit).toLocaleString()}</Text>}
            {parseFloat(e.credit) > 0 && <Text style={{ color: "#4ADE80", fontSize: 13 }}>−{parseFloat(e.credit).toLocaleString()}</Text>}
            <Text style={styles.running}>{parseFloat(e.runningBalance).toLocaleString()}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  name: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  balanceCard: { backgroundColor: "#111", borderRadius: 10, padding: 16, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 24 },
  balanceLabel: { color: "#71717A", fontSize: 12, marginBottom: 4 },
  balanceValue: { fontSize: 18, fontWeight: "bold" },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" },
  desc: { color: "#D4D4D8", fontSize: 13 },
  date: { color: "#71717A", fontSize: 12, marginTop: 2 },
  running: { color: "#71717A", fontSize: 11, marginTop: 2 },
});
