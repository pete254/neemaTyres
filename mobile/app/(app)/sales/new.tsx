import { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import VariantPicker from "@/components/forms/VariantPicker";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const CHANNELS = ["CASH", "MPESA", "DEBT"] as const;
type Channel = (typeof CHANNELS)[number];

interface Line { variantId: string | null; variantLabel: string; qty: string; unitPrice: string; }
interface Payment { channel: Channel; amount: string; }

export default function NewSaleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomPadding();
  const [date, setDate] = useState(today());
  const [walkinName, setWalkinName] = useState("");
  const [lines, setLines] = useState<Line[]>([{ variantId: null, variantLabel: "", qty: "1", unitPrice: "" }]);
  const [payments, setPayments] = useState<Payment[]>([{ channel: "CASH", amount: "" }]);

  const lineTotal = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const payTotal = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const balanced = Math.abs(lineTotal - payTotal) < 0.01;

  const mutation = useMutation({
    mutationFn: () => {
      for (const l of lines) {
        if (!l.variantId) throw new Error("Select a tyre for all lines");
        if (!l.qty || !l.unitPrice) throw new Error("Fill in qty and price for all lines");
      }
      if (!balanced) throw new Error(`Line total (${lineTotal.toFixed(2)}) ≠ payment total (${payTotal.toFixed(2)})`);
      return api.post("/api/mobile/sales", {
        date,
        walkinName: walkinName.trim() || undefined,
        lines: lines.map((l) => ({ variantId: l.variantId, qty: parseInt(l.qty), unitPrice: l.unitPrice })),
        payments: payments.map((p) => ({ channel: p.channel, amount: p.amount })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: keys.debtors });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      router.back();
    },
    onError: (e) => Alert.alert("Error", e instanceof Error ? e.message : "Failed"),
  });

  function addLine() {
    setLines((prev) => [...prev, { variantId: null, variantLabel: "", qty: "1", unitPrice: "" }]);
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addPayment() {
    setPayments((prev) => [...prev, { channel: "CASH", amount: "" }]);
  }

  function removePayment(i: number) {
    setPayments((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Date</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />

      <Text style={styles.sectionLabel}>Customer (optional — leave blank for walk-in)</Text>
      <TextInput style={styles.input} value={walkinName} onChangeText={setWalkinName} placeholder="Walk-in name" placeholderTextColor="#555" />

      <Text style={styles.sectionLabel}>Sale Lines</Text>
      {lines.map((line, i) => (
        <View key={i} style={styles.lineCard}>
          <VariantPicker
            value={line.variantId}
            onChange={(id, lbl) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, variantId: id, variantLabel: lbl } : l))}
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Qty</Text>
              <TextInput
                style={styles.input}
                value={line.qty}
                onChangeText={(v) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, qty: v } : l))}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 2 }}>
              <Text style={styles.fieldLabel}>Unit Price (KES)</Text>
              <TextInput
                style={styles.input}
                value={line.unitPrice}
                onChangeText={(v) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, unitPrice: v } : l))}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          {line.qty && line.unitPrice && (
            <Text style={styles.lineSubtotal}>
              Subtotal: KES {((parseFloat(line.qty) || 0) * (parseFloat(line.unitPrice) || 0)).toLocaleString()}
            </Text>
          )}
          {lines.length > 1 && (
            <TouchableOpacity onPress={() => removeLine(i)}>
              <Text style={styles.removeText}>Remove line</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addLineBtn} onPress={addLine}>
        <Text style={styles.addLineBtnText}>+ Add Line</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Payments</Text>
      {payments.map((pay, i) => (
        <View key={i} style={styles.lineCard}>
          <View style={styles.channelRow}>
            {CHANNELS.map((ch) => (
              <TouchableOpacity
                key={ch}
                style={[styles.channelBtn, pay.channel === ch && styles.channelBtnActive]}
                onPress={() => setPayments((prev) => prev.map((p, idx) => idx === i ? { ...p, channel: ch } : p))}
              >
                <Text style={[styles.channelBtnText, pay.channel === ch && styles.channelBtnTextActive]}>{ch}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={pay.amount}
            onChangeText={(v) => setPayments((prev) => prev.map((p, idx) => idx === i ? { ...p, amount: v } : p))}
            keyboardType="decimal-pad"
            placeholder="Amount"
            placeholderTextColor="#555"
          />
          {payments.length > 1 && (
            <TouchableOpacity onPress={() => removePayment(i)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addLineBtn} onPress={addPayment}>
        <Text style={styles.addLineBtnText}>+ Add Payment</Text>
      </TouchableOpacity>

      <View style={styles.totalsRow}>
        <Text style={styles.totalLabel}>Line Total</Text>
        <Text style={styles.totalValue}>KES {lineTotal.toLocaleString()}</Text>
      </View>
      <View style={styles.totalsRow}>
        <Text style={styles.totalLabel}>Payment Total</Text>
        <Text style={[styles.totalValue, !balanced && { color: "#F87171" }]}>KES {payTotal.toLocaleString()}</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (!balanced || mutation.isPending) && styles.submitBtnDisabled]}
        onPress={() => mutation.mutate()}
        disabled={!balanced || mutation.isPending}
      >
        {mutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Post Sale</Text>}
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
  lineSubtotal: { color: "#EAB308", fontSize: 13 },
  removeText: { color: "#F87171", fontSize: 13 },
  addLineBtn: { borderWidth: 1, borderColor: "#2A2A2A", borderStyle: "dashed", borderRadius: 8, padding: 12, alignItems: "center", marginBottom: 8 },
  addLineBtnText: { color: "#71717A", fontSize: 14 },
  channelRow: { flexDirection: "row", gap: 8 },
  channelBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: "#2A2A2A", alignItems: "center" },
  channelBtnActive: { backgroundColor: "#1C1A00", borderColor: "#EAB308" },
  channelBtnText: { color: "#71717A", fontSize: 13 },
  channelBtnTextActive: { color: "#EAB308", fontWeight: "600" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#1A1A1A" },
  totalLabel: { color: "#71717A", fontSize: 14 },
  totalValue: { color: "#fff", fontSize: 14, fontWeight: "600" },
  submitBtn: { backgroundColor: "#EAB308", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 16 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
