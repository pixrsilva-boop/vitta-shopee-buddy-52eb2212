import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  storeName: string;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  storeName: "",
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          // Fetch store name from profiles
          setTimeout(async () => {
            const { data } = await supabase
              .from("profiles")
              .select("store_name")
              .eq("user_id", session.user.id)
              .maybeSingle();
            setStoreName(data?.store_name || "Minha Loja");
          }, 0);
        } else {
          setStoreName("");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("store_name")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            setStoreName(data?.store_name || "Minha Loja");
          });
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, storeName, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
