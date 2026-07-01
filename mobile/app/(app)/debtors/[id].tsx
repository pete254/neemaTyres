import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface DebtLine {
  saleId: string;
  date: string;
  description: string;
  debtAmount: string;
  collected: string;
  outstanding: string;
  daysOld: number;
}

interface DebtorDetail {
  customer: { id: string; name: string; phone: string | null };
  debtResult: {
    totalOutstanding: string;
    totalDebt: string;
    totalCollected: string;
    lines: DebtLine[];
  } | null;
}

export default function DebtorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bottomPadding = useBottomPadding();
  const { data, isLoading, refetch } = useQuery({
    queryKey: keys.debtor(id),
    queryFn: () => api.get<DebtorDetail>(`/api/mobile/debtors/${id}`),
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#EAB308" />}
    >
      <Text style={styles.name}>{data?.customer.name ?? "..."}</Text>
      {data?.customer.phone && <Text style={styles.phone}>{data.customer.phone}</Text>}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Outstanding</Text>
        <Text style={styles.summaryValue}>
          KES {parseFloat(data?.debtResult?.totalOutstanding ?? "0").toLocaleString()}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryMeta}>
            Debt: KES {parseFloat(data?.debtResult?.totalDebt ?? "0").toLocaleString()}
          </Text>
          <Text style={styles.summaryMeta}>
            Paid: KES {parseFloat(data?.debtResult?.totalCollected ?? "0").toLocaleString()}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Unpaid Invoices</Text>
      {(data?.debtResult?.lines ?? []).map((l, i) => (
        <View key={`${l.saleId}-${i}`} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.desc}>{l.description}</Text>
            <Text style={styles.meta}>
              {new Date(l.date).toLocaleDateString()} · {l.daysOld} days old
            </Text>
          </View>
          <Text style={styles.outstanding}>KES {parseFloat(l.outstanding).toLocaleString()}</Text>
        </View>
      ))}
      {(data?.debtResult?.lines?.length ?? 0) === 0 && !isLoading && (
        <Text style={styles.empty}>No outstanding debt</Text>
      )}
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  name: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  phone: { color: "#71717A", fontSize: 14, marginBottom: 16 },
  summaryCard: { backgroundColor: "#1A0000", borderWidth: 1, borderColor: "#7F1D1D", borderRadius: 10, padding: 16, marginBottom: 24 },
  summaryLabel: { color: "#71717A", fontSize: 12, marginBottom: 4 },
  summaryValue: { color: "#F87171", fontSize: 24, fontWeight: "bold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  summaryMeta: { color: "#71717A", fontSize: 12 },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" },
  desc: { color: "#D4D4D8", fontSize: 13 },
  meta: { color: "#71717A", fontSize: 12, marginTop: 2 },
  outstanding: { color: "#F87171", fontSize: 14, fontWeight: "600" },
  empty: { color: "#4ADE80", textAlign: "center", marginTop: 32 },
});
