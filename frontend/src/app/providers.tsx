"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme";
import { MotionProvider } from "@/components/motion";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ConfirmProvider } from "@/components/ui/dialog";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/features/auth/auth-context";
import { SyncProvider } from "@/features/sync/sync-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SyncProvider>
              <ThemeProvider>{children}</ThemeProvider>
              <ServiceWorkerRegister />
            </SyncProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </MotionProvider>
  );
}