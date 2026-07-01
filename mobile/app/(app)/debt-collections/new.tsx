import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

function today() { return new Date().toISOString().slice(0, 10); }

const CHANNELS = ["CASH", "MPESA"] as const;

interface Debtor { id: string; name: string; outstanding: string; }

export default function NewDebtCollectionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomPadding();
  const { customerId: preselectedId } = useLocalSearchParams<{ customerId?: string }>();
  const [customerId, setCustomerId] = useState<string | null>(preselectedId ?? null);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState<"CASH" | "MPESA">("CASH");
  const [date, setDate] = useState(today());

  const { data: debtors = [] } = useQuery({
    queryKey: keys.debtors,
    queryFn: () => api.get<Debtor[]>("/api/mobile/debtors"),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!customerId) throw new Error("Select a customer");
      if (!amount) throw new Error("Enter an amount");
      return api.post("/api/mobile/debt-collections", { customerId, amount, channel, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.debtors });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
      router.back();
    },
    onError: (e) => Alert.alert("Error", e instanceof Error ? e.message : "Failed"),
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Date</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />

      <Text style={styles.sectionLabel}>Customer</Text>
      {debtors.map((d) => (
        <TouchableOpacity
          key={d.id}
          style={[styles.customerBtn, customerId === d.id && styles.customerBtnActive]}
          onPress={() => setCustomerId(d.id)}
        >
          <Text style={styles.customerName}>{d.name}</Text>
          <Text style={styles.outstanding}>Owes KES {parseFloat(d.outstanding).toLocaleString()}</Text>
        </TouchableOpacity>
      ))}

      {customerId && (() => {
        const sel = debtors.find((d) => d.id === customerId);
        if (!sel) return null;
        return (
          <View style={styles.debtBanner}>
            <Text style={styles.debtBannerLabel}>Outstanding balance</Text>
            <Text style={styles.debtBannerValue}>KES {parseFloat(sel.outstanding).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
          </View>
        );
      })()}

      <Text style={styles.sectionLabel}>Amount (KES)</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#555" />

      <Text style={styles.sectionLabel}>Channel</Text>
      <View style={styles.channelRow}>
        {CHANNELS.map((ch) => (
          <TouchableOpacity key={ch} style={[styles.channelBtn, channel === ch && styles.channelBtnActive]} onPress={() => setChannel(ch)}>
            <Text style={[styles.channelBtnText, channel === ch && styles.channelBtnTextActive]}>{ch}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Record Collection</Text>}
      </TouchableOpacity>
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 12, fontSize: 14, marginBottom: 8 },
  customerBtn: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, padding: 14, marginBottom: 8 },
  customerBtnActive: { borderColor: "#EAB308", backgroundColor: "#1C1A00" },
  customerName: { color: "#fff", fontSize: 14, fontWeight: "500" },
  outstanding: { color: "#F87171", fontSize: 12, marginTop: 2 },
  debtBanner: { backgroundColor: "#1A0000", borderWidth: 1, borderColor: "#7F1D1D", borderRadius: 8, padding: 12, marginVertical: 8 },
  debtBannerLabel: { color: "#F87171", fontSize: 11, marginBottom: 2 },
  debtBannerValue: { color: "#F87171", fontSize: 20, fontWeight: "bold" },
  channelRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  channelBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A", alignItems: "center" },
  channelBtnActive: { backgroundColor: "#1C1A00", borderColor: "#EAB308" },
  channelBtnText: { color: "#71717A", fontSize: 14 },
  channelBtnTextActive: { color: "#EAB308", fontWeight: "600" },
  submitBtn: { backgroundColor: "#EAB308", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 16 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
