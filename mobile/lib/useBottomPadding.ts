import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useBottomPadding(extra = 16) {
  const { bottom } = useSafeAreaInsets();
  return bottom + extra;
}
