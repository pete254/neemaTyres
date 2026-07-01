import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface SaleLine { saleId: string; date: string; items: string; total: string; channels: string; }
interface Profile {
  id: string; name: string; phone: string | null;
  totalSpent: string; visitCount: number; outstandingDebt: string;
  sales: SaleLine[];
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bottomPadding = useBottomPadding();
  const { data, isLoading, refetch } = useQuery({
    queryKey: keys.customer(id),
    queryFn: () => api.get<Profile>(`/api/mobile/customers/${id}`),
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#EAB308" />}
    >
      <Text style={styles.name}>{data?.name ?? "..."}</Text>
      {data?.phone && <Text style={styles.phone}>{data.phone}</Text>}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Total Spend</Text>
          <Text style={[styles.statValue, { color: "#EAB308" }]}>
            KES {parseFloat(data?.totalSpent ?? "0").toLocaleString()}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Outstanding</Text>
          <Text style={[styles.statValue, { color: "#F87171" }]}>
            KES {parseFloat(data?.outstandingDebt ?? "0").toLocaleString()}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Purchase History ({data?.visitCount ?? 0} visits)</Text>
      {(data?.sales ?? []).map((s) => (
        <View key={s.saleId} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{s.items}</Text>
            <Text style={styles.rowMeta}>{new Date(s.date).toLocaleDateString()} · {s.channels}</Text>
          </View>
          <Text style={styles.rowAmount}>KES {parseFloat(s.total).toLocaleString()}</Text>
        </View>
      ))}
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  name: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  phone: { color: "#71717A", fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: "#111", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#2A2A2A" },
  statLabel: { color: "#71717A", fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "bold" },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" },
  rowLabel: { color: "#D4D4D8", fontSize: 13 },
  rowMeta: { color: "#71717A", fontSize: 12, marginTop: 2 },
  rowAmount: { color: "#EAB308", fontSize: 13, fontWeight: "600", marginLeft: 8 },
});
