"use client";

import { useAccess } from "./AccessProvider";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Clipboard, LayoutGrid, UserRoundX } from "lucide-react";
import { Button } from "./ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

// One lookup per id per session, shared by every page that shows the same crumb.
const names = new Map<string, Promise<string | null>>();
const lookup = (key: string, load: () => Promise<string | null>) => {
  if (!names.has(key)) names.set(key, load().catch(() => null));
  return names.get(key)!;
};
const json = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject()));

const houseName = (id: string) =>
  lookup(`house:${id}`, () => json("/api/properties/names").then((all: { id: string; name: string }[]) => all.find((h) => h.id === id)?.name ?? null));
const unitName = (id: string) => lookup(`unit:${id}`, () => json(`/api/units/one/${id}`).then((u) => u?.unitNumber ?? null));
const tenantName = (id: string) => lookup(`lease:${id}`, () => json(`/api/tenant/pastTenant/${id}`).then((t) => t?.data?.tenant?.name ?? null));

type Crumb = { label: string; href: string };

/** Breadcrumbs, a back arrow to the parent page, and shortcuts for the property and unit pages. */
export default function PageNav({ onPropertyReport }: { onPropertyReport: (houseId: string) => void }) {
  const pathname = usePathname();
  const [, root, houseId, units, unitId, past, leaseId] = pathname.split("/");
  const [label, setLabel] = useState<Record<string, string>>({});
  const { can } = useAccess();

  useEffect(() => {
    if (root !== "properties") return;
    const found = (key: string) => (name: string | null) => name && setLabel((l) => ({ ...l, [key]: name }));
    if (houseId) houseName(houseId).then(found(houseId));
    if (unitId) unitName(unitId).then(found(unitId));
    if (leaseId) tenantName(leaseId).then(found(leaseId));
  }, [root, houseId, unitId, leaseId]);

  if (root !== "properties" || !houseId) return null;

  const base = `/properties/${houseId}`;
  const crumbs: Crumb[] = [
    { label: "Properties", href: "/properties" },
    { label: label[houseId] ?? "Property", href: base },
  ];
  if (units) crumbs.push({ label: "Units", href: `${base}/units` });
  if (unitId) crumbs.push({ label: label[unitId] ?? "Unit", href: `${base}/units/${unitId}` });
  if (past) crumbs.push({ label: "Past tenants", href: `${base}/units/${unitId}/past` });
  if (leaseId) crumbs.push({ label: label[leaseId] ?? "Tenant", href: `${base}/units/${unitId}/past/${leaseId}` });
  const parent = crumbs[crumbs.length - 2];
  const onUnit = unitId && !past;

  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="outline" size="icon" className="size-8 shrink-0 rounded-full">
          <Link href={parent.href} aria-label={`Back to ${parent.label}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              // Phones keep the parent and the current page; the back arrow covers the rest.
              const phone = i >= crumbs.length - 2 ? "inline-flex" : "hidden sm:inline-flex";
              return (
                <Fragment key={c.href}>
                  {i > 0 && <BreadcrumbSeparator className={i === crumbs.length - 1 ? "" : "hidden sm:inline-flex"} />}
                  <BreadcrumbItem className={`${phone} min-w-0`}>
                    {last ? (
                      <BreadcrumbPage className="truncate font-medium">{c.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild className="truncate">
                        <Link href={c.href}>{c.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {!units && (
        <div className="flex gap-2">
          {can("units.view", houseId) && <Button asChild variant="outline" size="sm">
            <Link href={`${base}/units`}>
              <LayoutGrid />
              Units
            </Link>
          </Button>}
          {can("reports.view", houseId) && <Button variant="outline" size="sm" onClick={() => onPropertyReport(houseId)}>
            <Clipboard />
            Report
          </Button>}
        </div>
      )}
      {onUnit && can("pastTenants.view", houseId) && (
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}/units/${unitId}/past`}>
            <UserRoundX />
            Past tenants
          </Link>
        </Button>
      )}
    </div>
  );
}
