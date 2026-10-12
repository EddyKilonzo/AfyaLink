"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

export function usePersistentStorage() {
  const toast = useToast();

  useEffect(() => {
    if (!("storage" in navigator) || !("persist" in navigator.storage)) return;

    let cancelled = false;

    navigator.storage.persisted().then((persisted) => {
      if (cancelled) return;
      if (persisted) return;

      navigator.storage.persist().then((granted) => {
        if (cancelled) return;
        if (!granted) {
          toast.info(
            "Storage not persisted",
            "Your offline reports may be cleared if the device runs low on space. You can enable persistence in browser settings."
          );
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [toast]);
}