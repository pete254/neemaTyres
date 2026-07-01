import { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  drafts?: unknown[];
  gaps?: string[];
}

export default function AIScreen() {
  const { bottom } = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState<unknown[] | null>(null);
  const listRef = useRef<FlatList>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const res = await api.post<{ answer?: string; drafts?: unknown[]; gaps?: string[]; status?: string }>(
        "/api/ai/chat",
        { mode: "smart", message: text }
      );
      if (res.answer) {
        setMessages((m) => [...m, { id: Date.now().toString(), role: "assistant", content: res.answer! }]);
      } else if (res.drafts) {
        setPendingDrafts(res.drafts);
        const gapText = res.gaps?.length ? `\n\nMissing info: ${res.gaps.join(", ")}` : "";
        setMessages((m) => [
          ...m,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `I've parsed ${res.drafts!.length} transaction(s). Review and confirm below.${gapText}`,
            drafts: res.drafts,
          },
        ]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: Date.now().toString(), role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Unknown error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDrafts() {
    if (!pendingDrafts) return;
    setLoading(true);
    try {
      const res = await api.post<{ results?: unknown[] }>("/api/ai/chat", {
        action: "confirm",
        sessionDrafts: pendingDrafts,
      });
      setPendingDrafts(null);
      setMessages((m) => [
        ...m,
        { id: Date.now().toString(), role: "assistant", content: `Posted ${res.results?.length ?? 0} transaction(s). Done!` },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: Date.now().toString(), role: "assistant", content: `Failed to post: ${e instanceof Error ? e.message : "Error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistBubble]}>
            <Text style={[styles.bubbleText, item.role === "user" && { color: "#000" }]}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.hint}>Ask anything about sales, stock, or debtors. Or describe a transaction to record it.</Text>
        }
      />

      {pendingDrafts && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>{pendingDrafts.length} draft(s) ready</Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={confirmDrafts} disabled={loading}>
            <Text style={styles.confirmBtnText}>Post Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPendingDrafts(null)}>
            <Text style={styles.cancelText}>Discard</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputRow, { paddingBottom: bottom + 12 }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor="#555"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.sendBtnText}>↑</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  hint: { color: "#3F3F46", textAlign: "center", marginTop: 80, fontSize: 14 },
  bubble: { maxWidth: "80%", borderRadius: 12, padding: 12, marginBottom: 10 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#EAB308" },
  assistBubble: { alignSelf: "flex-start", backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A" },
  bubbleText: { color: "#E4E4E7", fontSize: 14, lineHeight: 20 },
  confirmBar: { margin: 12, backgroundColor: "#111", borderWidth: 1, borderColor: "#EAB308", borderRadius: 10, padding: 16, gap: 10, alignItems: "center" },
  confirmText: { color: "#EAB308", fontSize: 13 },
  confirmBtn: { backgroundColor: "#EAB308", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  confirmBtnText: { color: "#000", fontWeight: "700" },
  cancelText: { color: "#71717A", fontSize: 13 },
  inputRow: { flexDirection: "row", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: "#1A1A1A" },
  input: { flex: 1, backgroundColor: "#111", borderWidth: 1, borderColor: "#2A2A2A", borderRadius: 12, color: "#fff", padding: 12, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: "#EAB308", borderRadius: 12, width: 44, alignItems: "center", justifyContent: "center" },
  sendBtnText: { color: "#000", fontSize: 22, fontWeight: "bold" },
});
