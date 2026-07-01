import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

function today() { return new Date().toISOString().slice(0, 10); }
interface Supplier { id: string; name: string; }

export default function NewSupplierPaymentScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomPadding();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const { data: suppliers = [] } = useQuery({
    queryKey: keys.suppliers,
    queryFn: () => api.get<Supplier[]>("/api/mobile/suppliers"),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!supplierId) throw new Error("Select a supplier");
      if (!amount) throw new Error("Enter an amount");
      return api.post("/api/mobile/supplier-payments", { supplierId, amount, date, note: note || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.suppliers });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
      router.back();
    },
    onError: (e) => Alert.alert("Error", e instanceof Error ? e.message : "Failed"),
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Date</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />

      <Text style={styles.sectionLabel}>Supplier</Text>
      {suppliers.map((s) => (
        <TouchableOpacity key={s.id} style={[styles.chip, supplierId === s.id && styles.chipActive]} onPress={() => setSupplierId(s.id)}>
          <Text style={[styles.chipText, supplierId === s.id && styles.chipTextActive]}>{s.name}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionLabel}>Amount (KES)</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#555" />

      <Text style={styles.sectionLabel}>Note (optional)</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. partial payment" placeholderTextColor="#555" />

      <TouchableOpacity style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Record Payment</Text>}
      </TouchableOpacity>
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 12, fontSize: 14, marginBottom: 8 },
  chip: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, padding: 14, marginBottom: 8 },
  chipActive: { borderColor: "#EAB308", backgroundColor: "#1C1A00" },
  chipText: { color: "#A1A1AA", fontSize: 14 },
  chipTextActive: { color: "#EAB308", fontWeight: "600" },
  submitBtn: { backgroundColor: "#EAB308", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 16 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
