import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "./ui";

interface AsyncLike<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload?: () => void;
}

/**
 * Standard loading / error / empty handling for a `useAsync` result. Shows
 * skeletons (or a custom `loading` node) and keeps stale data visible while
 * reloading, so lists never flash.
 */
export function AsyncBoundary<T>({
  state,
  isEmpty,
  empty,
  loading,
  loadingLabel,
  children,
}: {
  state: AsyncLike<T>;
  isEmpty?: (data: T) => boolean;
  empty?: { title: string; description?: string; action?: ReactNode; icon?: LucideIcon };
  loading?: ReactNode;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}) {
  if (state.error && !state.data) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (state.data === null) return state.loading ? (loading ?? <LoadingState label={loadingLabel} />) : null;
  if (isEmpty?.(state.data) && empty) return <EmptyState {...empty} />;
  return (
    <>
      {state.error && <ErrorState message={state.error} onRetry={state.reload} className="mb-4" />}
      {children(state.data)}
    </>
  );
}
