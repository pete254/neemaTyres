import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface ExceptionFlag {
  id: string;
  entityType: string;
  entityId: string;
  flagType: string;
  details: Record<string, unknown>;
  resolved: boolean;
  createdAt: string;
}

export default function ExceptionsScreen() {
  const bottomPadding = useBottomPadding();
  const [showAll, setShowAll] = useState(false);
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: keys.exceptions(showAll),
    queryFn: () => api.get<ExceptionFlag[]>(`/api/mobile/exceptions${showAll ? "?all=1" : ""}`),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => api.post(`/api/mobile/exceptions/${id}/resolve`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.exceptions(showAll) }),
  });

  function confirmResolve(id: string) {
    Alert.alert("Resolve Flag", "Mark this exception as resolved?", [
      { text: "Cancel", style: "cancel" },
      { text: "Resolve", onPress: () => resolve.mutate(id) },
    ]);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggle} onPress={() => setShowAll((p) => !p)}>
        <Text style={styles.toggleText}>{showAll ? "Hide Resolved" : "Show Resolved"}</Text>
      </TouchableOpacity>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={[styles.card, item.resolved && styles.cardResolved]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.flagType}>{item.flagType.replace(/_/g, " ")}</Text>
              <Text style={styles.entityType}>{item.entityType} · {new Date(item.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.details}>{JSON.stringify(item.details)}</Text>
            </View>
            {!item.resolved && (
              <TouchableOpacity style={styles.resolveBtn} onPress={() => confirmResolve(item.id)}>
                <Text style={styles.resolveBtnText}>Resolve</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No exceptions</Text> : null}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  toggle: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, padding: 12, alignItems: "center", marginBottom: 16 },
  toggleText: { color: "#A1A1AA", fontSize: 14 },
  card: { backgroundColor: "#111", borderWidth: 1, borderColor: "#FB923C", borderRadius: 10, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  cardResolved: { borderColor: "#2A2A2A", opacity: 0.5 },
  flagType: { color: "#FB923C", fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  entityType: { color: "#71717A", fontSize: 12, marginTop: 2 },
  details: { color: "#A1A1AA", fontSize: 11, marginTop: 4 },
  resolveBtn: { backgroundColor: "#EAB308", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  resolveBtnText: { color: "#000", fontWeight: "700", fontSize: 12 },
  empty: { color: "#4ADE80", textAlign: "center", marginTop: 40 },
});
