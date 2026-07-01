import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  totalSpend: string;
}

export default function CustomersScreen() {
  const router = useRouter();
  const bottomPadding = useBottomPadding();
  const { data = [], isLoading } = useQuery({
    queryKey: keys.customers,
    queryFn: () => api.get<Customer[]>("/api/mobile/customers"),
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(app)/customers/new")}>
        <Text style={styles.addBtnText}>+ New Customer</Text>
      </TouchableOpacity>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => router.push(`/(app)/customers/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone && <Text style={styles.phone}>{item.phone}</Text>}
            </View>
            <Text style={styles.spend}>KES {parseFloat(item.totalSpend).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No customers</Text> : null}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  addBtn: { backgroundColor: "#1C1A00", borderWidth: 1, borderColor: "#EAB308", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 16 },
  addBtnText: { color: "#EAB308", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" },
  name: { color: "#fff", fontSize: 15, fontWeight: "500" },
  phone: { color: "#71717A", fontSize: 13, marginTop: 2 },
  spend: { color: "#EAB308", fontSize: 14 },
  empty: { color: "#71717A", textAlign: "center", marginTop: 40 },
});
