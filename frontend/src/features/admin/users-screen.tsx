"use client";

import { ChevronRight, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AsyncBoundary } from "@/components/async-boundary";
import { Stagger, StaggerItem } from "@/components/motion";
import { Pagination } from "@/components/pagination";
import { Badge, ButtonLink, FilterSelect, PageHeader, Panel } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { formatRelative, initials } from "@/lib/format";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/types";
import { useUsers } from "./hooks";

export function UsersScreen() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<UserRole | "">("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  // Debounce typing so each keystroke does not hit the rate-limited API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const users = useUsers({ page, limit: 20, role: role || undefined, isActive: active === "" ? undefined : active === "true", q: q || undefined });

  return (
    <>
      <PageHeader
        title="Users"
        description="Volunteers and administrators. New accounts start with a password you share with the person directly."
        action={
          <ButtonLink href="/admin/users/new" icon={<UserPlus className="size-4" aria-hidden />} className="max-sm:w-full">
            Add user
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            aria-label="Search by name or email"
            placeholder="Search name or email"
            maxLength={80}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block min-h-10 w-full rounded-[10px] border border-line-strong bg-surface pl-10 pr-3 text-sm shadow-xs transition-[border-color,box-shadow] focus:border-brand-500 focus:shadow-[var(--shadow-glow)] focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <FilterSelect
            label="Role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole | "");
              setPage(1);
            }}
            className="flex-1"
          >
            <option value="">All roles</option>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Status"
            value={active}
            onChange={(e) => {
              setActive(e.target.value as "" | "true" | "false");
              setPage(1);
            }}
            className="flex-1"
          >
            <option value="">Any status</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </FilterSelect>
        </div>
      </div>

      <Panel className="p-2">
        <AsyncBoundary
          state={users}
          isEmpty={(d) => d.items.length === 0}
          empty={{ icon: Users, title: q || role || active ? "No users match" : "No users yet", description: q ? "Check the spelling, or search by email." : undefined }}
        >
          {(d) => (
            <>
              <Stagger className="space-y-0.5">
                {d.items.map((u) => (
                  <StaggerItem key={u.id}>
                    <Link href={`/admin/users/${u.id}`} className={cx("group flex items-center gap-3 rounded-2xl px-3 py-3 press-lift transition-[background-color,transform,box-shadow] duration-[var(--duration-micro)] hover:bg-sunken hover:shadow-[var(--shadow-ring)] active:scale-[0.992] sm:gap-4")}>
                      <span
                        className={cx(
                          "grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold",
                          u.isActive ? "bg-brand-600 text-white" : "bg-sunken text-muted ring-1 ring-line",
                        )}
                        aria-hidden
                      >
                        {initials(u.fullName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-semibold text-ink">
                          <span className="truncate">{u.fullName}</span>
                          {u.mfaEnabled && <ShieldCheck className="size-3.5 shrink-0 text-synced" aria-label="Two-factor on" />}
                        </span>
                        <span className="block truncate text-[0.8125rem] text-muted">{u.email}</span>
                      </span>
                      <span className="hidden text-right text-xs text-muted md:block">
                        {u.lastLoginAt ? `Signed in ${formatRelative(u.lastLoginAt)}` : "Never signed in"}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <Badge tone={u.role === "ADMIN" ? "info" : "brand"}>{u.role === "ADMIN" ? "Admin" : "CHV"}</Badge>
                        {!u.isActive && <Badge tone="neutral">Deactivated</Badge>}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
              <div className="px-2 pb-2">
                <Pagination page={d} onPageChange={setPage} />
              </div>
            </>
          )}
        </AsyncBoundary>
      </Panel>
    </>
  );
}
