import { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";

interface Variant {
  id: string;
  sizeCanonical: string;
  sizeBucket: string;
  position: string;
  subLabel: string | null;
  qtyOnHand: number;
  brand: { name: string };
}

interface Props {
  value: string | null;
  onChange: (variantId: string, label: string) => void;
}

export default function VariantPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [bucket, setBucket] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: variants = [] } = useQuery({
    queryKey: keys.variants,
    queryFn: () => api.get<Variant[]>("/api/mobile/variants"),
  });

  const buckets = useMemo(
    () => Array.from(new Set(variants.map((v) => v.sizeBucket))).sort(),
    [variants]
  );

  const filtered = useMemo(() => {
    if (!bucket) return [];
    return variants.filter(
      (v) =>
        v.sizeBucket === bucket &&
        (search === "" ||
          `${v.sizeCanonical} ${v.brand.name} ${v.position} ${v.subLabel ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    );
  }, [variants, bucket, search]);

  const variantLabel = (v: Variant) =>
    `${v.sizeCanonical} ${v.brand.name} [${v.position}]${v.subLabel ? ` · ${v.subLabel}` : ""}`;

  const selected = variants.find((v) => v.id === value);
  const label = selected ? variantLabel(selected) : "Select tyre…";

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        {selected ? (
          <View style={styles.triggerSelected}>
            <View style={styles.triggerTop}>
              <Text style={styles.triggerText}>{selected.sizeCanonical} {selected.brand.name}</Text>
              <View style={styles.posBadge}>
                <Text style={styles.posBadgeText}>{selected.position}</Text>
              </View>
            </View>
            {selected.subLabel ? (
              <Text style={styles.triggerSub}>{selected.subLabel}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={[styles.triggerText, { color: "#555" }]}>Select tyre…</Text>
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Tyre</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setBucket(null); setSearch(""); }}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          {!bucket ? (
            <>
              <Text style={styles.stepLabel}>Step 1: Select size bucket</Text>
              <FlatList
                data={buckets}
                keyExtractor={(b) => b}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.listItem} onPress={() => setBucket(item)}>
                    <Text style={styles.listItemText}>{item}</Text>
                    <Text style={styles.listItemCount}>{variants.filter((v) => v.sizeBucket === item).length}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.backBtn} onPress={() => setBucket(null)}>
                <Text style={styles.backBtnText}>← {bucket}</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.searchInput}
                placeholder="Filter…"
                placeholderTextColor="#555"
                value={search}
                onChangeText={setSearch}
              />
              <FlatList
                data={filtered}
                keyExtractor={(v) => v.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => {
                      onChange(item.id, variantLabel(item));
                      setOpen(false);
                      setBucket(null);
                      setSearch("");
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.listItemRow}>
                        <Text style={styles.listItemText}>{item.sizeCanonical} {item.brand.name}</Text>
                        <View style={styles.posBadge}>
                          <Text style={styles.posBadgeText}>{item.position}</Text>
                        </View>
                      </View>
                      {item.subLabel ? <Text style={styles.listItemSub}>{item.subLabel}</Text> : null}
                    </View>
                    <Text style={[styles.qtyBadge, item.qtyOnHand < 1 && { color: "#F87171" }]}>
                      {item.qtyOnHand} in stock
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, padding: 14 },
  triggerSelected: { gap: 4 },
  triggerTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  triggerText: { color: "#fff", fontSize: 14 },
  triggerSub: { color: "#71717A", fontSize: 12 },
  modal: { flex: 1, backgroundColor: "#000", paddingTop: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  closeBtn: { color: "#EAB308", fontSize: 15 },
  stepLabel: { color: "#71717A", fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  backBtnText: { color: "#EAB308", fontSize: 14 },
  searchInput: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 12, marginHorizontal: 16, marginBottom: 8 },
  listItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1A1A1A", gap: 12 },
  listItemRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  listItemText: { color: "#fff", fontSize: 15 },
  listItemSub: { color: "#71717A", fontSize: 12, marginTop: 3 },
  listItemCount: { color: "#71717A", fontSize: 13 },
  qtyBadge: { color: "#4ADE80", fontSize: 12, textAlign: "right" },
  posBadge: { backgroundColor: "#1C1A00", borderWidth: 1, borderColor: "#EAB308", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  posBadgeText: { color: "#EAB308", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
});
