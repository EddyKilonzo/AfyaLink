import { api, apiJson, toQuery } from "@/lib/api";
import type { Location } from "@/types";

export interface CreateLocationInput {
  county: string;
  subCounty: string;
  ward: string;
  village?: string;
  latitude?: number;
  longitude?: number;
}

export const locationsService = {
  list: (county?: string) => api<{ items: Location[] }>(`/locations${toQuery({ county })}`).then((r) => r.items),
  /** ADMIN only. 409 if the same unit already exists. */
  create: (input: CreateLocationInput) => apiJson<Location>("/locations", "POST", input),
  /** ADMIN only. 409 if volunteers are still assigned to it. */
  remove: (id: number) => apiJson<void>(`/locations/${id}`, "DELETE"),
  /** ADMIN only. Partial update; re-validates uniqueness. */
  update: (id: number, input: Partial<CreateLocationInput>) =>
    apiJson<Location>(`/locations/${id}`, "PATCH", input),
};

export function formatLocation(location: Pick<Location, "county" | "subCounty" | "ward" | "village">): string {
  return [location.village, location.ward, location.subCounty, location.county].filter(Boolean).join(", ");
}
