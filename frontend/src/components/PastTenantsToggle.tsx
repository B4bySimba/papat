"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/** Puts `?pastTenants=1` on the URL; the page then asks the backend to keep past tenants in the totals. */
export default function PastTenantsToggle({ checked }: { checked: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex max-w-xs flex-col gap-1">
      <div className="flex items-center gap-2">
        <Switch
          id="chart-past-tenants"
          checked={checked}
          disabled={pending}
          onCheckedChange={(on) =>
            startTransition(() => router.replace(on ? `${pathname}?pastTenants=1` : pathname, { scroll: false }))
          }
        />
        <Label htmlFor="chart-past-tenants">Include past tenants</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        {checked
          ? "Past tenants stay in the totals after moving out, with no new charges: what they still owe and anything they pay later."
          : "A tenant stops counting once they move out. Turn on to include past tenants' numbers."}
      </p>
    </div>
  );
}
