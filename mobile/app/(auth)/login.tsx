import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signIn } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";

export default function LoginScreen() {
  const { setIsAuthed } = useAuth();
  const { top, bottom } = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      setIsAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        {/* Logo / brand */}
        <View style={styles.logoRow}>
          <Ionicons name="car-sport" size={32} color="#EAB308" />
        </View>
        <Text style={styles.logo}>Kwambira Tyres</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#FCA5A5" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Email field */}
        <View style={styles.fieldWrapper}>
          <Ionicons name="mail-outline" size={18} color="#555" style={styles.fieldIcon} />
          <TextInput
            style={styles.fieldInput}
            placeholder="Email"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password field */}
        <View style={styles.fieldWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color="#555" style={styles.fieldIcon} />
          <TextInput
            style={styles.fieldInput}
            placeholder="Password"
            placeholderTextColor="#555"
            secureTextEntry={!showPassword}
            autoCorrect={false}
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {/* Eye open = password visible; eye-off = password hidden */}
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="#71717A"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="log-in-outline" size={18} color="#000" />
              <Text style={styles.buttonText}>Sign In</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  logoRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    color: "#EAB308",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: "#71717A",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1010",
    borderWidth: 1,
    borderColor: "#7F1D1D",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1,
  },
  fieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 14,
  },
  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 14,
  },
  button: {
    backgroundColor: "#EAB308",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 15,
  },
});
