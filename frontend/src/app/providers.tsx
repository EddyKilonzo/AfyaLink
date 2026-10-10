"use client";

import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { AuthProvider } from "@/features/auth/auth-context";
import { SyncProvider } from "@/features/sync/sync-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SyncProvider>
        {children}
        <ServiceWorkerRegister />
      </SyncProvider>
    </AuthProvider>
  );
}
