import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface DashboardData {
  todayStr: string;
  stockValue: string;
  activeDebtors: number;
  totalOwed: string;
  tyresInStore: number;
  todaySales: string;
  todayPurchases: string;
  todayProfit: string;
}

function fmt(val: string | number) {
  return `KES ${parseFloat(String(val)).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const { data, isLoading, refetch } = useQuery({
    queryKey: keys.dashboard,
    queryFn: () => api.get<DashboardData>("/api/mobile/dashboard"),
  });

  const profit = parseFloat(data?.todayProfit ?? "0");

  const QUICK_ACTIONS = [
    { label: "Record Sale", href: "/(app)/sales/new" },
    { label: "Record Purchase", href: "/(app)/purchases/new" },
    { label: "Collect Debt", href: "/(app)/debt-collections/new" },
    { label: "Pay Supplier", href: "/(app)/supplier-payments/new" },
    { label: "Process Return", href: "/(app)/returns/new" },
    { label: "Exceptions", href: "/(app)/exceptions" },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#EAB308" />}
    >
      <Text style={styles.sectionLabel}>Today — {data?.todayStr ?? "..."}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.card, styles.cardLink, { flex: 1 }]} onPress={() => router.push("/(app)/sales")}>
          <Text style={styles.cardLabel}>Total Sales</Text>
          <Text style={[styles.cardValue, { color: "#EAB308" }]}>{fmt(data?.todaySales ?? 0)}</Text>
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity style={[styles.card, styles.cardLink, { flex: 1 }]} onPress={() => router.push("/(app)/purchases")}>
          <Text style={styles.cardLabel}>Purchases</Text>
          <Text style={[styles.cardValue, { color: "#60A5FA" }]}>{fmt(data?.todayPurchases ?? 0)}</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, { marginBottom: 24 }]}>
        <Text style={styles.cardLabel}>Gross Profit</Text>
        <Text style={[styles.cardValue, { color: profit >= 0 ? "#4ADE80" : "#F87171" }]}>
          {fmt(data?.todayProfit ?? 0)}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Overview</Text>
      <View style={styles.row}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardLabel}>Stock Value (WAC)</Text>
          <Text style={[styles.cardValue, { color: "#EAB308" }]}>{fmt(data?.stockValue ?? 0)}</Text>
        </View>
        <View style={{ width: 12 }} />
        <TouchableOpacity style={[styles.card, styles.cardLink, { flex: 1 }]} onPress={() => router.push("/(app)/debtors")}>
          <Text style={styles.cardLabel}>Active Debtors</Text>
          <Text style={styles.cardValue}>{data?.activeDebtors ?? "—"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.card, styles.cardLink, { flex: 1 }]} onPress={() => router.push("/(app)/debtors")}>
          <Text style={styles.cardLabel}>Total Owed</Text>
          <Text style={[styles.cardValue, { color: "#F87171" }]}>{fmt(data?.totalOwed ?? 0)}</Text>
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity style={[styles.card, styles.cardLink, { flex: 1 }]} onPress={() => router.push("/(app)/inventory")}>
          <Text style={styles.cardLabel}>Tyres in Store</Text>
          <Text style={[styles.cardValue, { color: "#4ADE80" }]}>
            {data?.tyresInStore ?? "—"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.href}
            style={styles.actionBtn}
            onPress={() => router.push(a.href as never)}
          >
            <Text style={styles.actionText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: "row", marginBottom: 12 },
  card: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 10, padding: 16, marginBottom: 12 },
  cardLink: { borderColor: "#2A2A2A" },
  cardLabel: { color: "#71717A", fontSize: 12, marginBottom: 6 },
  cardValue: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionBtn: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, padding: 14, width: "47%" },
  actionText: { color: "#D4D4D8", fontSize: 14, fontWeight: "500" },
});
