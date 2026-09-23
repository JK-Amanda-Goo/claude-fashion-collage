"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCanvases } from "@/hooks/useCanvases";
import { getCurrentUser } from "@/lib/auth";
import type { UseCanvasesReturn } from "@/hooks/useCanvases";
export type { UseCanvasesReturn };

export interface AuthState {
  email: string | null;
  tier: string | null;
  hasAccess: boolean;
}

const DEFAULT_AUTH_STATE: AuthState = { email: null, tier: null, hasAccess: true };

const CanvasesContext = createContext<UseCanvasesReturn | null>(null);
const AuthContext = createContext<AuthState>(DEFAULT_AUTH_STATE);

export function Providers({ children }: { children: React.ReactNode }) {
  const value = useCanvases();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [auth, setAuth] = useState<AuthState>(DEFAULT_AUTH_STATE);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) return;
    const user = getCurrentUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gates render on a client-only auth check (localStorage), not derivable at render time
    setChecked(true);

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setAuth({ email: data.email, tier: data.tier, hasAccess: data.hasAccess });
        }
      })
      .catch(() => {});
  }, [isLoginPage, router]);

  if (!isLoginPage && !checked) return null;

  return (
    <AuthContext.Provider value={auth}>
      <CanvasesContext.Provider value={value}>
        {children}
      </CanvasesContext.Provider>
    </AuthContext.Provider>
  );
}

export function useCanvasesContext(): UseCanvasesReturn {
  const ctx = useContext(CanvasesContext);
  if (!ctx) throw new Error("useCanvasesContext must be used within Providers");
  return ctx;
}

export function useAuthContext(): AuthState {
  return useContext(AuthContext);
}
