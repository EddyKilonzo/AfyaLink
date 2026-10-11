"use client";

import { MapPin, MapPinPlus, Search } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { AsyncBoundary } from "@/components/async-boundary";
import { Reveal } from "@/components/motion";
import { Badge, Button, Field, Input, PageHeader, Panel, ServerErrors } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useCreateLocation, useLocations } from "@/features/locations/hooks";
import type { CreateLocationInput } from "@/services/locations.service";
import type { Location } from "@/types";

const EMPTY = { county: "", subCounty: "", ward: "", village: "", latitude: "", longitude: "" };
type FormState = typeof EMPTY;

function toInput(form: FormState): CreateLocationInput {
  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  return {
    county: form.county.trim(),
    subCounty: form.subCounty.trim(),
    ward: form.ward.trim(),
    village: form.village.trim() || undefined,
    latitude: num(form.latitude),
    longitude: num(form.longitude),
  };
}

export function LocationsScreen() {
  const locations = useLocations();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map<string, Location[]>();
    for (const l of locations.data ?? []) {
      const text = `${l.county} ${l.subCounty} ${l.ward} ${l.village ?? ""}`.toLowerCase();
      if (q && !text.includes(q)) continue;
      map.set(l.county, [...(map.get(l.county) ?? []), l]);
    }
    return [...map.entries()];
  }, [locations.data, filter]);

  return (
    <>
      <PageHeader
        title="Locations"
        description="Areas volunteers report from. A volunteer's assigned area limits them to its county."
        action={
          <Button onClick={() => setOpen(true)} icon={<MapPinPlus className="size-4" aria-hidden />} className="max-sm:w-full">
            Add location
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          aria-label="Filter locations"
          placeholder="Filter by county, ward or village"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="block min-h-10 w-full rounded-[10px] border border-line-strong bg-surface pl-10 pr-3 text-sm shadow-xs focus:border-brand-500 focus:shadow-[var(--shadow-glow)] focus:outline-none sm:max-w-sm"
        />
      </div>

      <AsyncBoundary state={locations} isEmpty={(d) => d.length === 0} empty={{ icon: MapPin, title: "No locations yet", description: "Add the first area your volunteers work in." }}>
        {() =>
          grouped.length === 0 ? (
            <Panel className="p-8 text-center text-sm text-muted">No locations match “{filter}”.</Panel>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {grouped.map(([county, items], i) => (
                <Reveal key={county} delay={Math.min(i, 6) * 0.04}>
                  <Panel className="h-full">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                      <h2 className="text-h3">{county}</h2>
                      <Badge tone="brand">{items.length === 1 ? "1 area" : `${items.length} areas`}</Badge>
                    </div>
                    <ul className="divide-y divide-line">
                      {items.map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {l.ward}
                              {l.village ? `, ${l.village}` : ""}
                            </span>
                            <span className="block truncate text-xs text-muted">{l.subCounty} sub-county</span>
                          </span>
                          <span className="shrink-0 text-right text-xs tabular-nums text-muted">
                            {l.latitude && l.longitude ? (
                              <>
                                {Number(l.latitude).toFixed(3)}, {Number(l.longitude).toFixed(3)}
                              </>
                            ) : (
                              "No coordinates"
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </Reveal>
              ))}
            </div>
          )
        }
      </AsyncBoundary>

      <AddLocationDialog open={open} onClose={() => setOpen(false)} onCreated={locations.reload} />
    </>
  );
}

function AddLocationDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const create = useCreateLocation();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const location = await create.run(toInput(form));
    if (location) {
      toast.success("Location added", `${location.ward}, ${location.county}`);
      setForm(EMPTY);
      onCreated();
      onClose();
    }
  }

  const field = (key: keyof FormState, label: string, opts: { required?: boolean; decimal?: boolean } = {}) => (
    <Field name={`loc-${key}`} label={label} required={opts.required} optional={!opts.required}>
      <Input
        id={`loc-${key}`}
        required={opts.required}
        inputMode={opts.decimal ? "decimal" : undefined}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </Field>
  );

  return (
    <Dialog open={open} onClose={onClose} title="Add a location" description="Administrative units must be unique." size="md">
      <form id="add-location" onSubmit={onSubmit} className="grid gap-4">
        <ServerErrors error={create.error} fieldErrors={create.fieldErrors} />
        <div className="grid gap-4 sm:grid-cols-2">
          {field("county", "County", { required: true })}
          {field("subCounty", "Sub-county", { required: true })}
          {field("ward", "Ward", { required: true })}
          {field("village", "Village")}
          {field("latitude", "Latitude", { decimal: true })}
          {field("longitude", "Longitude", { decimal: true })}
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.pending}>
            Add location
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
