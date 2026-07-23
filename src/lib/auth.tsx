import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, type ApiUser } from "@/lib/api";

interface AuthContextType {
  user: ApiUser | null;
  session: { user: ApiUser } | null;
  loading: boolean;
  role: string | null;
  signUp: (email: string, password: string, metadata: Record<string, any>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [session, setSession] = useState<{ user: ApiUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ user: Omit<ApiUser, "user_metadata"> }>("/auth/me")
      .then(({ user: currentUser }) => setAuthenticatedUser(currentUser))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const setAuthenticatedUser = (currentUser: Omit<ApiUser, "user_metadata">) => {
    const normalized = { ...currentUser, user_metadata: { full_name: currentUser.full_name, phone: currentUser.phone } };
    setUser(normalized);
    setSession({ user: normalized });
    setRole(normalized.role);
  };

  const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
    try {
      await api.post("/auth/register", { email, password, full_name: metadata.full_name, phone: metadata.phone, role: metadata.role });
      return { error: null };
    } catch (error) { return { error: error instanceof Error ? error : new Error("Unable to create account") }; }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user: currentUser } = await api.post<{ user: Omit<ApiUser, "user_metadata"> }>("/auth/login", { email, password });
      setAuthenticatedUser(currentUser);
      return { error: null };
    } catch (error) { return { error: error instanceof Error ? error : new Error("Unable to sign in") }; }
  };

  const signOut = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
