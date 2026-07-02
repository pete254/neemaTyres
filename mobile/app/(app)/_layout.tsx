import { Drawer } from "expo-router/drawer";
import DrawerContent from "@/components/layout/DrawerContent";

export default function AppLayout() {
  return (
    <Drawer
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        headerStyle: { backgroundColor: "#111" },
        headerTintColor: "#EAB308",
        headerTitleStyle: { color: "#fff", fontWeight: "600" },
        drawerStyle: { backgroundColor: "#0A0A0A" },
        sceneStyle: { backgroundColor: "#000" },
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Drawer.Screen name="sales" options={{ title: "Sales", headerShown: false }} />
      <Drawer.Screen name="purchases" options={{ title: "Purchases", headerShown: false }} />
      <Drawer.Screen name="customers" options={{ title: "Customers", headerShown: false }} />
      <Drawer.Screen name="debtors" options={{ title: "Debtors", headerShown: false }} />
      <Drawer.Screen name="debt-collections" options={{ title: "Debt Collection" }} />
      <Drawer.Screen name="supplier-payments" options={{ title: "Supplier Payment" }} />
      <Drawer.Screen name="returns" options={{ title: "New Return" }} />
      <Drawer.Screen name="suppliers" options={{ title: "Suppliers", headerShown: false }} />
      <Drawer.Screen name="inventory" options={{ title: "Inventory" }} />
      <Drawer.Screen name="reports" options={{ title: "Reports" }} />
      <Drawer.Screen name="history" options={{ title: "History" }} />
    </Drawer>
  );
}
