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
};

export function formatLocation(location: Pick<Location, "county" | "subCounty" | "ward" | "village">): string {
  return [location.village, location.ward, location.subCounty, location.county].filter(Boolean).join(", ");
}
