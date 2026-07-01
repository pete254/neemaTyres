import { useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

const POSITIONS = ["", "AP", "DIFF", "STEERING", "NONE"];

interface VariantRow {
  id: string;
  sizeCanonical: string;
  sizeBucket: string;
  position: string;
  subLabel: string | null;
  qtyOnHand: number;
  wacCost: string;
  referenceSellPrice: string | null;
  brand: { name: string };
}

export default function InventoryScreen() {
  const bottomPadding = useBottomPadding();
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: keys.inventory(search, position),
    queryFn: () =>
      api.get<VariantRow[]>(`/api/mobile/inventory?search=${encodeURIComponent(search)}&position=${position}`),
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search size or brand…"
        placeholderTextColor="#555"
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.posFilter}>
        {POSITIONS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.posBtn, position === p && styles.posBtnActive]}
            onPress={() => setPosition(p)}
          >
            <Text style={[styles.posBtnText, position === p && styles.posBtnTextActive]}>
              {p || "All"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                {item.sizeCanonical} {item.brand.name}
                {item.subLabel ? ` (${item.subLabel})` : ""}
              </Text>
              <Text style={styles.meta}>{item.position} · WAC KES {item.wacCost}</Text>
            </View>
            <Text style={[styles.qty, item.qtyOnHand < 0 ? styles.qtyNeg : item.qtyOnHand === 0 ? styles.qtyZero : styles.qtyPos]}>
              {item.qtyOnHand}
            </Text>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No results</Text> : null}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  search: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 12, marginBottom: 12 },
  posFilter: { flexDirection: "row", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  posBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A" },
  posBtnActive: { backgroundColor: "#1C1A00", borderColor: "#EAB308" },
  posBtnText: { color: "#71717A", fontSize: 12 },
  posBtnTextActive: { color: "#EAB308" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" },
  label: { color: "#fff", fontSize: 14, fontWeight: "500" },
  meta: { color: "#71717A", fontSize: 12, marginTop: 2 },
  qty: { fontSize: 22, fontWeight: "bold" },
  qtyPos: { color: "#4ADE80" },
  qtyZero: { color: "#71717A" },
  qtyNeg: { color: "#F87171" },
  empty: { color: "#71717A", textAlign: "center", marginTop: 40 },
});
