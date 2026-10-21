"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/** Puts `?pastTenants=1` on the URL; the page then asks the backend to keep past tenants in the totals. */
export default function PastTenantsToggle({ checked }: { checked: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  // Flips at once; the page's own value takes over when the new totals arrive.
  const [shown, setShown] = useOptimistic(checked);

  return (
    <div className="flex max-w-xs flex-col gap-1" aria-busy={pending}>
      <div className="flex items-center gap-2">
        <Switch
          id="chart-past-tenants"
          checked={shown}
          disabled={pending}
          onCheckedChange={(on) =>
            startTransition(() => {
              setShown(on);
              router.replace(on ? `${pathname}?pastTenants=1` : pathname, { scroll: false });
            })
          }
        />
        <Label htmlFor="chart-past-tenants">Include past tenants</Label>
        {pending && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Updating totals...
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {shown
          ? "Past tenants are included: the months they lived there and anything after they left (late payments, deposit refunds)."
          : "Only current tenants are counted. Turn on to include past tenants' numbers."}
      </p>
    </div>
  );
}
