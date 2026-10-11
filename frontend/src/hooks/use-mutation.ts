"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, toErrorMessage } from "@/lib/api";

interface MutationState<A extends unknown[], T> {
  run: (...args: A) => Promise<T | undefined>;
  pending: boolean;
  error: string | null;
  /** Per-field validation messages from a 400 response. */
  fieldErrors: string[];
  reset: () => void;
}

/**
 * Wraps a write call (create/update/delete) with pending and error state.
 * `run` resolves to `undefined` on failure instead of throwing, so handlers
 * can simply `if (await run(...))`. Concurrent calls are ignored while pending.
 */
export function useMutation<A extends unknown[], T>(fn: (...args: A) => Promise<T>): MutationState<A, T> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const fnRef = useRef(fn);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args: A) => {
    if (busy.current) return undefined;
    busy.current = true;
    setPending(true);
    setError(null);
    setFieldErrors([]);
    try {
      return await fnRef.current(...args);
    } catch (err) {
      if (mounted.current) {
        setError(toErrorMessage(err));
        if (err instanceof ApiError && err.status === 400) setFieldErrors(err.messages);
      }
      return undefined;
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setFieldErrors([]);
  }, []);

  return { run, pending, error, fieldErrors, reset };
}
