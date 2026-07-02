import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import VariantPicker from "@/components/forms/VariantPicker";
import DatePickerField from "@/components/ui/DatePickerField";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

function today() { return new Date().toISOString().slice(0, 10); }

const TYPES = ["SALE_RETURN", "PURCHASE_RETURN"] as const;
type ReturnType = (typeof TYPES)[number];

export default function NewReturnScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomPadding();
  const [type, setType] = useState<ReturnType>("SALE_RETURN");
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [unitValue, setUnitValue] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!variantId) throw new Error("Select a tyre");
      if (!qty || !unitValue) throw new Error("Fill in qty and unit value");
      return api.post("/api/mobile/returns", { type, variantId, qty: parseInt(qty), unitValue, date, note: note || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      router.back();
    },
    onError: (e) => Alert.alert("Error", e instanceof Error ? e.message : "Failed"),
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Return Type</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity key={t} style={[styles.typeBtn, type === t && styles.typeBtnActive]} onPress={() => setType(t)}>
            <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
              {t === "SALE_RETURN" ? "Sale Return" : "Purchase Return"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Tyre</Text>
      <VariantPicker value={variantId} onChange={(id) => setVariantId(id)} />

      <Text style={styles.sectionLabel}>Qty</Text>
      <TextInput style={styles.input} value={qty} onChangeText={setQty} keyboardType="numeric" />

      <Text style={styles.sectionLabel}>Unit Value (KES)</Text>
      <TextInput style={styles.input} value={unitValue} onChangeText={setUnitValue} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#555" />

      <Text style={styles.sectionLabel}>Date</Text>
      <DatePickerField value={date} onChange={setDate} />

      <Text style={styles.sectionLabel}>Note (optional)</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Reason for return" placeholderTextColor="#555" />

      <TouchableOpacity style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Process Return</Text>}
      </TouchableOpacity>
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 12, fontSize: 14, marginBottom: 8 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A", alignItems: "center" },
  typeBtnActive: { backgroundColor: "#1C1A00", borderColor: "#EAB308" },
  typeBtnText: { color: "#71717A", fontSize: 13 },
  typeBtnTextActive: { color: "#EAB308", fontWeight: "600" },
  submitBtn: { backgroundColor: "#EAB308", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 16 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
