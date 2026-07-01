import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

interface SaleLine { saleId: string; date: string; items: string; total: string; channels: string; }
interface Profile {
  id: string; name: string; phone: string | null;
  email: string | null; address: string | null; town: string | null; poBox: string | null;
  totalSpent: string; visitCount: number; outstandingDebt: string;
  sales: SaleLine[];
}

const inputClass = { backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 10, fontSize: 13, marginBottom: 8 };

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bottomPadding = useBottomPadding();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ phone: "", email: "", address: "", town: "", poBox: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: keys.customer(id),
    queryFn: () => api.get<Profile>(`/api/mobile/customers/${id}`),
    onSuccess: (d: Profile) => {
      setForm({
        phone: d.phone ?? "",
        email: d.email ?? "",
        address: d.address ?? "",
        town: d.town ?? "",
        poBox: d.poBox ?? "",
      });
    },
  } as any);

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/api/mobile/customers/${id}`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.customer(id) });
      setEditOpen(false);
      Alert.alert("Saved", "Contact details updated.");
    },
    onError: (e) => Alert.alert("Error", e instanceof Error ? e.message : "Update failed"),
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#EAB308" />}
    >
      <Text style={styles.name}>{data?.name ?? "..."}</Text>
      {data?.phone && <Text style={styles.phone}>{data.phone}</Text>}
      {data?.town && <Text style={styles.meta}>{data.town}</Text>}

      {/* Contact details editor */}
      {!editOpen ? (
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditOpen(true)}>
          <Text style={styles.editBtnText}>Edit contact details</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.editCard}>
          <Text style={styles.sectionLabel}>Contact Details</Text>
          <TextInput style={inputClass} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="Phone" placeholderTextColor="#555" keyboardType="phone-pad" />
          <TextInput style={inputClass} value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="Email" placeholderTextColor="#555" keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={inputClass} value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="Address / House" placeholderTextColor="#555" />
          <TextInput style={inputClass} value={form.town} onChangeText={(v) => setForm((f) => ({ ...f, town: v }))} placeholder="Town" placeholderTextColor="#555" />
          <TextInput style={inputClass} value={form.poBox} onChangeText={(v) => setForm((f) => ({ ...f, poBox: v }))} placeholder="P.O. Box" placeholderTextColor="#555" />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.5 }]}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  phone: { color: "#71717A", fontSize: 14, marginBottom: 2 },
  meta: { color: "#71717A", fontSize: 13, marginBottom: 8 },
  editBtn: { borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start", marginBottom: 16 },
  editBtnText: { color: "#71717A", fontSize: 12 },
  editCard: { backgroundColor: "#111", borderRadius: 10, borderWidth: 1, borderColor: "#2A2A2A", padding: 14, marginBottom: 16 },
  editActions: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  saveBtn: { backgroundColor: "#EAB308", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  saveBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
  cancelText: { color: "#71717A", fontSize: 14 },
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
