import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/database.types";

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ userId: string } | null>;
  signIn: (email: string, password: string) => Promise<Profile | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (fetchError) {
      if (fetchError.code === "PGRST116") return null; // no row
      console.error("Profile fetch error:", fetchError);
      return null;
    }
    return data as Profile;
  }, []);

  const ensureSessionAndProfile = useCallback(async () => {
    const {
      data: { session: currentSession },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      setError(sessionError.message);
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    if (currentSession?.user) {
      const p = await fetchProfile(currentSession.user.id);
      setProfile(p);
    } else {
      setProfile(null);
    }
    setIsLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    ensureSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const uid = newSession.user.id;
        // Do not await Supabase inside this callback: it can deadlock the auth
        // client so signInWithPassword never settles (login stuck on "Signing in…").
        setTimeout(() => {
          void (async () => {
            const p = await fetchProfile(uid);
            const {
              data: { session: latest },
            } = await supabase.auth.getSession();
            if (latest?.user?.id === uid) setProfile(p);
          })();
        }, 0);
      } else {
        setProfile(null);
      }
      if (event === "SIGNED_OUT") setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [ensureSessionAndProfile, fetchProfile]);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, role: UserRole): Promise<{ userId: string } | null> => {
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        throw signUpError;
      }
      if (data.user && !data.session) {
        setError("Check your email to confirm your account.");
        throw new Error("Email confirmation required");
      }
      if (data.user) {
        const p = await fetchProfile(data.user.id);
        setProfile(p);
        return { userId: data.user.id };
      }
      return null;
    },
    [fetchProfile]
  );

  const signIn = useCallback(async (email: string, password: string): Promise<Profile | null> => {
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      throw signInError;
    }
    if (data.user) {
      let p = await fetchProfile(data.user.id);
      if (!p) {
        const meta = data.user.user_metadata as { full_name?: string; role?: UserRole } | undefined;
        const { error: insertError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: meta?.full_name ?? data.user.email ?? null,
          role: meta?.role ?? "patient",
        });
        if (!insertError) p = await fetchProfile(data.user.id);
      }
      setProfile(p);
      await supabase.from("audit_logs").insert({
        user_id: data.user.id,
        action: "login",
        resource: "auth",
        details: {},
      });
      return p;
    }
    return null;
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      error,
      signUp,
      signIn,
      signOut,
      clearError,
    }),
    [session, user, profile, isLoading, error, signUp, signIn, signOut, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
