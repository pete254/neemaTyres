import { createContext, useContext } from "react";

interface AuthContextValue {
  isAuthed: boolean;
  setIsAuthed: (v: boolean) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  isAuthed: false,
  setIsAuthed: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
