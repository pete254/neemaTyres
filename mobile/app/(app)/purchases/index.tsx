import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface PurchaseLine {
  variantLabel: string;
  qty: number;
  unitCost: string;
  lineTotal: string;
}

interface PurchaseDay {
  date: string;
  purchaseCount: number;
  totalCost: string;
  lines: PurchaseLine[];
}

export default function PurchasesScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const bottomPadding = useBottomPadding();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [query, setQuery] = useState({ from: today(), to: today() });

  const { data } = useQuery({
    queryKey: keys.purchases(query.from, query.to),
    queryFn: () => api.get<{ days: PurchaseDay[] }>(`/api/mobile/purchases?from=${query.from}&to=${query.to}`),
  });

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
      <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(app)/purchases/new")}>
        <Text style={styles.addBtnText}>+ New Purchase</Text>
      </TouchableOpacity>
      <FlatList
        data={data?.days ?? []}
        keyExtractor={(d) => d.date}
        renderItem={({ item }) => (
          <View style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayDate}>{item.date}</Text>
              <Text style={styles.dayCost}>KES {parseFloat(item.totalCost).toLocaleString()}</Text>
            </View>
            {item.lines.map((l, i) => (
              <View key={i} style={styles.line}>
                <Text style={styles.lineText}>{l.variantLabel} × {l.qty}</Text>
                <Text style={styles.lineAmount}>KES {parseFloat(l.lineTotal).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No purchases in range</Text>}
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
  dayCost: { color: "#60A5FA", fontSize: 13, fontWeight: "600" },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  lineText: { color: "#D4D4D8", fontSize: 13 },
  lineAmount: { color: "#A1A1AA", fontSize: 13 },
  empty: { color: "#71717A", textAlign: "center", marginTop: 40 },
});
