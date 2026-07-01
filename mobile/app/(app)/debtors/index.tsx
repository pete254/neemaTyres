import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface Debtor {
  id: string;
  name: string;
  phone: string | null;
  outstanding: string;
}

export default function DebtorsScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const bottomPadding = useBottomPadding();
  const { data = [], isLoading } = useQuery({
    queryKey: keys.debtors,
    queryFn: () => api.get<Debtor[]>("/api/mobile/debtors"),
  });

  const total = data.reduce((sum, d) => sum + parseFloat(d.outstanding), 0);

  return (
    <View style={[styles.container, { paddingTop: top + 16 }]}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total Owed</Text>
        <Text style={styles.summaryValue}>KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
        <Text style={styles.summaryCount}>{data.length} active debtors</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/(app)/debtors/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone && <Text style={styles.phone}>{item.phone}</Text>}
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.amount}>KES {parseFloat(item.outstanding).toLocaleString()}</Text>
              <TouchableOpacity
                style={styles.collectBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/(app)/debt-collections/new?customerId=${item.id}` as never);
                }}
              >
                <Text style={styles.collectBtnText}>Collect</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No debtors</Text> : null}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  summary: { backgroundColor: "#111", borderRadius: 10, padding: 16, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 16 },
  summaryLabel: { color: "#71717A", fontSize: 12 },
  summaryValue: { color: "#F87171", fontSize: 24, fontWeight: "bold", marginTop: 2 },
  summaryCount: { color: "#71717A", fontSize: 12, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" },
  name: { color: "#fff", fontSize: 15, fontWeight: "500" },
  phone: { color: "#71717A", fontSize: 13, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  amount: { color: "#F87171", fontSize: 14, fontWeight: "600" },
  collectBtn: { backgroundColor: "#1C1A00", borderWidth: 1, borderColor: "#EAB308", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  collectBtnText: { color: "#EAB308", fontSize: 11, fontWeight: "600" },
  empty: { color: "#71717A", textAlign: "center", marginTop: 40 },
});
