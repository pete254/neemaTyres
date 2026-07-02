import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/lib/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/(app)/dashboard" },
  { label: "Sales", href: "/(app)/sales" },
  { label: "Purchases", href: "/(app)/purchases" },
  { label: "Customers", href: "/(app)/customers" },
  { label: "Debtors", href: "/(app)/debtors" },
  { label: "Suppliers", href: "/(app)/suppliers" },
  { label: "Inventory", href: "/(app)/inventory" },
  { label: "Reports", href: "/(app)/reports" },
  { label: "Exceptions", href: "/(app)/exceptions" },
  { label: "History", href: "/(app)/history" },
  { label: "AI Assistant", href: "/(app)/ai" },
];

export default function DrawerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Kwambira Tyres</Text>
      </View>
      <ScrollView style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href.replace("/(app)/", "/"));
          return (
            <TouchableOpacity
              key={item.href}
              style={[styles.item, active && styles.itemActive]}
              onPress={() => router.push(item.href as never)}
            >
              <Text style={[styles.itemText, active && styles.itemTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
    marginBottom: 8,
  },
  brand: { color: "#EAB308", fontSize: 20, fontWeight: "bold" },
  item: { paddingHorizontal: 20, paddingVertical: 13 },
  itemActive: {
    backgroundColor: "#1C1A00",
    borderLeftWidth: 3,
    borderLeftColor: "#EAB308",
  },
  itemText: { color: "#A1A1AA", fontSize: 15 },
  itemTextActive: { color: "#EAB308", fontWeight: "600" },
  signOut: {
    margin: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 8,
    alignItems: "center",
  },
  signOutText: { color: "#71717A", fontSize: 14 },
});
