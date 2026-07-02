import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getStoredToken } from "@/lib/auth";
import { AuthContext } from "@/lib/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    getStoredToken().then((t) => {
      setIsAuthed(!!t);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const inAuth = segments[0] === "(auth)";
    if (!isAuthed && !inAuth) {
      router.replace("/(auth)/login");
    } else if (isAuthed && inAuth) {
      router.replace("/(app)/dashboard");
    }
  }, [isReady, isAuthed, segments]);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  return (
    <AuthContext.Provider value={{ isAuthed, setIsAuthed }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <Slot />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthContext.Provider>
  );
}
