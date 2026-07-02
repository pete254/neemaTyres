import { useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useBottomPadding } from "@/lib/useBottomPadding";

const ACTION_LABELS: Record<string, string> = {
  CREATE_SALE: "New Sale",
  UPDATE_SALE: "Sale Updated",
  DELETE_SALE: "Sale Deleted",
  CREATE_PURCHASE: "New Purchase",
  UPDATE_PURCHASE: "Purchase Updated",
  DELETE_PURCHASE: "Purchase Deleted",
  CREATE_DEBT_COLLECTION: "Debt Collection",
  CREATE_SUPPLIER_PAYMENT: "Supplier Payment",
  CREATE_RETURN: "Return",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_SALE: "#4ADE80",
  UPDATE_SALE: "#EAB308",
  DELETE_SALE: "#F87171",
  CREATE_PURCHASE: "#60A5FA",
  UPDATE_PURCHASE: "#EAB308",
  DELETE_PURCHASE: "#F87171",
  CREATE_DEBT_COLLECTION: "#FB923C",
  CREATE_SUPPLIER_PAYMENT: "#C084FC",
  CREATE_RETURN: "#F472B6",
};

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  user: { id: string; name: string; email: string };
}

interface HistoryPage {
  logs: AuditEntry[];
  nextCursor: string | null;
}

export default function HistoryScreen() {
  const { top } = useSafeAreaInsets();
  const bottomPadding = useBottomPadding();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<HistoryPage>({
      queryKey: ["history"],
      queryFn: ({ pageParam }) =>
        api.get<HistoryPage>(
          `/api/mobile/history${pageParam ? `?cursor=${pageParam}` : ""}`
        ),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  const entries = data?.pages.flatMap((p) => p.logs) ?? [];

  return (
    <View style={[styles.container, { paddingTop: top + 16 }]}>
      <FlatList
        data={entries}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={
          isLoading ? null : (
            <Text style={styles.empty}>No activity recorded yet</Text>
          )
        }
        ListHeaderComponent={
          <Text style={styles.heading}>Activity History</Text>
        }
        renderItem={({ item }) => {
          const label = ACTION_LABELS[item.action] ?? item.action;
          const color = ACTION_COLORS[item.action] ?? "#A1A1AA";
          const source = item.metadata?.source === "mobile" ? "Mobile" : "Web";
          return (
            <View style={styles.row}>
              <View style={[styles.badge, { borderColor: color + "44" }]}>
                <Text style={[styles.badgeText, { color }]}>{label}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.meta}>
                  {item.user.name} · {source} · {new Date(item.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          hasNextPage ? (
            <TouchableOpacity
              style={styles.loadMore}
              onPress={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <ActivityIndicator color="#EAB308" />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
      />
      {isLoading && (
        <ActivityIndicator color="#EAB308" style={styles.loadingOverlay} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  heading: { color: "#fff", fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10, backgroundColor: "#111", borderRadius: 10, borderWidth: 1, borderColor: "#2A2A2A", padding: 12 },
  badge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 1 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  rowBody: { flex: 1 },
  desc: { color: "#E4E4E7", fontSize: 13 },
  meta: { color: "#71717A", fontSize: 11, marginTop: 3 },
  empty: { color: "#71717A", textAlign: "center", marginTop: 40 },
  loadMore: { paddingVertical: 16, alignItems: "center" },
  loadMoreText: { color: "#EAB308", fontSize: 14 },
  loadingOverlay: { position: "absolute", top: "50%", left: "50%", transform: [{ translateX: -12 }, { translateY: -12 }] },
});
