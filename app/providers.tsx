"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCanvases } from "@/hooks/useCanvases";
import { getCurrentUser } from "@/lib/auth";
import type { UseCanvasesReturn } from "@/hooks/useCanvases";
export type { UseCanvasesReturn };

const CanvasesContext = createContext<UseCanvasesReturn | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const value = useCanvases();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setChecked(true);
      return;
    }
    const user = getCurrentUser();
    if (!user) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (!checked) return null;

  return (
    <CanvasesContext.Provider value={value}>
      {children}
    </CanvasesContext.Provider>
  );
}

export function useCanvasesContext(): UseCanvasesReturn {
  const ctx = useContext(CanvasesContext);
  if (!ctx) throw new Error("useCanvasesContext must be used within Providers");
  return ctx;
}
