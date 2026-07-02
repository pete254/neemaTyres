import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import VariantPicker from "@/components/forms/VariantPicker";
import DatePickerField from "@/components/ui/DatePickerField";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

function today() { return new Date().toISOString().slice(0, 10); }

const TERMS = ["CASH", "CREDIT", "FREE"] as const;
type Terms = (typeof TERMS)[number];

interface Line { variantId: string | null; variantLabel: string; qty: string; unitCost: string; }
interface Supplier { id: string; name: string; }

export default function NewPurchaseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomPadding();
  const [date, setDate] = useState(today());
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [terms, setTerms] = useState<Terms>("CASH");
  const [lines, setLines] = useState<Line[]>([{ variantId: null, variantLabel: "", qty: "1", unitCost: "" }]);

  const { data: suppliers = [] } = useQuery({
    queryKey: keys.suppliers,
    queryFn: () => api.get<Supplier[]>("/api/mobile/suppliers"),
  });

  const mutation = useMutation({
    mutationFn: () => {
      for (const l of lines) {
        if (!l.variantId) throw new Error("Select a tyre for all lines");
        if (!l.qty || (!l.unitCost && terms !== "FREE")) throw new Error("Fill in all fields");
      }
      return api.post("/api/mobile/purchases", {
        date,
        supplierId: supplierId ?? undefined,
        terms,
        lines: lines.map((l) => ({ variantId: l.variantId, qty: parseInt(l.qty), unitCost: terms === "FREE" ? "0" : l.unitCost })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      router.back();
    },
    onError: (e) => Alert.alert("Error", e instanceof Error ? e.message : "Failed"),
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Date</Text>
      <DatePickerField value={date} onChange={setDate} />

      <Text style={styles.sectionLabel}>Supplier (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <TouchableOpacity style={[styles.chip, !supplierId && styles.chipActive]} onPress={() => setSupplierId(null)}>
          <Text style={[styles.chipText, !supplierId && styles.chipTextActive]}>None</Text>
        </TouchableOpacity>
        {suppliers.map((s) => (
          <TouchableOpacity key={s.id} style={[styles.chip, supplierId === s.id && styles.chipActive]} onPress={() => setSupplierId(s.id)}>
            <Text style={[styles.chipText, supplierId === s.id && styles.chipTextActive]}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>Terms</Text>
      <View style={styles.channelRow}>
        {TERMS.map((t) => (
          <TouchableOpacity key={t} style={[styles.channelBtn, terms === t && styles.channelBtnActive]} onPress={() => setTerms(t)}>
            <Text style={[styles.channelBtnText, terms === t && styles.channelBtnTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Purchase Lines</Text>
      {lines.map((line, i) => (
        <View key={i} style={styles.lineCard}>
          <VariantPicker
            value={line.variantId}
            onChange={(id, lbl) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, variantId: id, variantLabel: lbl } : l))}
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Qty</Text>
              <TextInput style={styles.input} value={line.qty} onChangeText={(v) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, qty: v } : l))} keyboardType="numeric" />
            </View>
            {terms !== "FREE" && (
              <>
                <View style={{ width: 12 }} />
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>Unit Cost (KES)</Text>
                  <TextInput style={styles.input} value={line.unitCost} onChangeText={(v) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, unitCost: v } : l))} keyboardType="decimal-pad" />
                </View>
              </>
            )}
          </View>
          {lines.length > 1 && (
            <TouchableOpacity onPress={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addLineBtn} onPress={() => setLines((prev) => [...prev, { variantId: null, variantLabel: "", qty: "1", unitCost: "" }])}>
        <Text style={styles.addLineBtnText}>+ Add Line</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Post Purchase</Text>}
      </TouchableOpacity>
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 12, fontSize: 14, marginBottom: 8 },
  fieldLabel: { color: "#71717A", fontSize: 12, marginBottom: 4 },
  lineCard: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 10, padding: 14, marginBottom: 12, gap: 8 },
  row: { flexDirection: "row" },
  removeText: { color: "#F87171", fontSize: 13 },
  addLineBtn: { borderWidth: 1, borderColor: "#2A2A2A", borderStyle: "dashed", borderRadius: 8, padding: 12, alignItems: "center", marginBottom: 8 },
  addLineBtnText: { color: "#71717A", fontSize: 14 },
  channelRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  channelBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A", alignItems: "center" },
  channelBtnActive: { backgroundColor: "#1C1A00", borderColor: "#EAB308" },
  channelBtnText: { color: "#71717A", fontSize: 13 },
  channelBtnTextActive: { color: "#EAB308", fontWeight: "600" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A", marginRight: 6 },
  chipActive: { backgroundColor: "#1C1A00", borderColor: "#EAB308" },
  chipText: { color: "#71717A", fontSize: 13 },
  chipTextActive: { color: "#EAB308" },
  submitBtn: { backgroundColor: "#EAB308", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 16 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
