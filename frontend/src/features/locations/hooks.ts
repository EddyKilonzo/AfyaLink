"use client";

import { useMemo } from "react";
import { useAsync } from "@/hooks/use-async";
import { useMutation } from "@/hooks/use-mutation";
import { getMeta, setMeta } from "@/lib/db";
import { locationsService, type CreateLocationInput } from "@/services/locations.service";
import type { Location } from "@/types";

const CACHE_KEY = "locations";

/**
 * All locations, with an IndexedDB fallback so the report form's picker still
 * works offline. Locations are reference data, not health data.
 */
export function useLocations() {
  const state = useAsync(async (): Promise<Location[]> => {
    try {
      const items = await locationsService.list();
      await setMeta(CACHE_KEY, items);
      return items;
    } catch (error) {
      const cached = await getMeta<Location[]>(CACHE_KEY);
      if (cached?.length) return cached;
      throw error;
    }
  }, []);

  const byId = useMemo(() => new Map((state.data ?? []).map((l) => [l.id, l])), [state.data]);
  const counties = useMemo(() => [...new Set((state.data ?? []).map((l) => l.county))], [state.data]);
  return { ...state, byId, counties };
}

export function useCreateLocation() {
  return useMutation((input: CreateLocationInput) => locationsService.create(input));
}

export function useUpdateLocation() {
  return useMutation(({ id, input }: { id: number; input: Partial<CreateLocationInput> }) =>
    locationsService.update(id, input),
  );
}

/** Delete a location. The API rejects it if volunteers are assigned to it. */
export function useDeleteLocation() {
  return useMutation((id: number) => locationsService.remove(id));
}
