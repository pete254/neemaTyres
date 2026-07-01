import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface Supplier {
  id: string;
  name: string;
  openingBalance: string;
}

export default function SuppliersScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const bottomPadding = useBottomPadding();
  const { data = [], isLoading } = useQuery({
    queryKey: keys.suppliers,
    queryFn: () => api.get<Supplier[]>("/api/mobile/suppliers"),
  });

  return (
    <View style={[styles.container, { paddingTop: top + 16 }]}>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/(app)/suppliers/${item.id}`)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No suppliers</Text> : null}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" },
  name: { color: "#fff", fontSize: 15, fontWeight: "500" },
  arrow: { color: "#71717A", fontSize: 20 },
  empty: { color: "#71717A", textAlign: "center", marginTop: 40 },
});
