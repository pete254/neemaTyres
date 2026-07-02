import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DatePickerField from "@/components/ui/DatePickerField";
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
  const [showPicker, setShowPicker] = useState(!preselectedId);
  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState<"CASH" | "MPESA">("CASH");
  const [date, setDate] = useState(today());

  const { data: debtors = [], isLoading } = useQuery({
    queryKey: keys.debtors,
    queryFn: () => api.get<Debtor[]>("/api/mobile/debtors"),
  });

  const selected = debtors.find((d) => d.id === customerId);

  const mutation = useMutation({
    mutationFn: () => {
      if (!customerId) throw new Error("Select a customer");
      if (!amount || parseFloat(amount) <= 0) throw new Error("Enter a valid amount");
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

      {/* Customer selection */}
      <Text style={styles.sectionLabel}>Customer</Text>
      {selected && !showPicker ? (
        <View style={styles.selectedCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedName}>{selected.name}</Text>
            <Text style={styles.selectedOwes}>
              Owes KES {parseFloat(selected.outstanding).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {isLoading ? (
            <ActivityIndicator color="#EAB308" style={{ marginVertical: 16 }} />
          ) : (
            debtors.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.customerBtn, customerId === d.id && styles.customerBtnActive]}
                onPress={() => { setCustomerId(d.id); setShowPicker(false); }}
              >
                <Text style={styles.customerName}>{d.name}</Text>
                <Text style={styles.outstanding}>Owes KES {parseFloat(d.outstanding).toLocaleString()}</Text>
              </TouchableOpacity>
            ))
          )}
          {debtors.length === 0 && !isLoading && (
            <Text style={styles.emptyText}>No debtors found</Text>
          )}
        </>
      )}

      {/* Amount */}
      <Text style={styles.sectionLabel}>Amount Collected (KES)</Text>
      {selected && (
        <Text style={styles.maxHint}>Max: KES {parseFloat(selected.outstanding).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</Text>
      )}
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor="#555"
      />

      {/* Channel */}
      <Text style={styles.sectionLabel}>Channel</Text>
      <View style={styles.channelRow}>
        {CHANNELS.map((ch) => (
          <TouchableOpacity key={ch} style={[styles.channelBtn, channel === ch && styles.channelBtnActive]} onPress={() => setChannel(ch)}>
            <Text style={[styles.channelBtnText, channel === ch && styles.channelBtnTextActive]}>{ch}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date */}
      <Text style={styles.sectionLabel}>Date</Text>
      <DatePickerField value={date} onChange={setDate} />

      <TouchableOpacity
        style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Record Collection</Text>}
      </TouchableOpacity>
      <View style={{ height: bottomPadding }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  sectionLabel: { color: "#71717A", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  selectedCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1C1A00", borderWidth: 1, borderColor: "#EAB308", borderRadius: 10, padding: 14, marginBottom: 4 },
  selectedName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  selectedOwes: { color: "#F87171", fontSize: 13, marginTop: 2 },
  changeText: { color: "#EAB308", fontSize: 13, fontWeight: "600" },
  customerBtn: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, padding: 14, marginBottom: 8 },
  customerBtnActive: { borderColor: "#EAB308", backgroundColor: "#1C1A00" },
  customerName: { color: "#fff", fontSize: 14, fontWeight: "500" },
  outstanding: { color: "#F87171", fontSize: 12, marginTop: 2 },
  emptyText: { color: "#71717A", textAlign: "center", marginVertical: 20 },
  maxHint: { color: "#71717A", fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 12, fontSize: 14, marginBottom: 8 },
  channelRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  channelBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A", alignItems: "center" },
  channelBtnActive: { backgroundColor: "#1C1A00", borderColor: "#EAB308" },
  channelBtnText: { color: "#71717A", fontSize: 14 },
  channelBtnTextActive: { color: "#EAB308", fontWeight: "600" },
  submitBtn: { backgroundColor: "#EAB308", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 20 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
