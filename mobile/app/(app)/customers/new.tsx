import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "@/lib/queryKeys";
import { useBottomPadding } from "@/lib/useBottomPadding";

export default function NewCustomerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomPadding();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Name is required");
      return api.post("/api/mobile/customers", { name: name.trim(), phone: phone.trim() || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.customers });
      router.back();
    },
    onError: (e) => Alert.alert("Error", e instanceof Error ? e.message : "Failed"),
  });

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Customer name" placeholderTextColor="#555" />
      <Text style={styles.label}>Phone (optional)</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+254…" placeholderTextColor="#555" keyboardType="phone-pad" />
      <TouchableOpacity style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.submitBtnText}>Create Customer</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  label: { color: "#71717A", fontSize: 12, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: "#1C1C1C", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 8, color: "#fff", padding: 12, fontSize: 14 },
  submitBtn: { backgroundColor: "#EAB308", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 24 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
