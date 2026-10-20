import { AlertTriangle } from "lucide-react";

export interface FutureDatedPayment {
  amount: number;
  date: string;
  enteredOn: string;
  reference: string;
  tenantName: string | null;
  unitNumber: string | null;
  houseName: string | null;
}

const day = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Payments typed with a future date are kept as entered; this makes them visible so someone checks the date. */
export default function FutureDatedPayments({ payments }: { payments: FutureDatedPayment[] }) {
  if (!payments.length) return null;

  return (
    <div className="@container/fdp rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {payments.length} payment{payments.length > 1 ? "s" : ""} dated in the future
          </p>
          <p className="mt-0.5 text-amber-800">
            Kept exactly as entered. A payment dated in a later month isn&apos;t counted until that month arrives, so
            check whether the date is a typo.
          </p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-amber-200/70 overflow-hidden rounded-lg border border-amber-200/70 bg-white/60">
        {payments.map((p) => (
          <li key={p.reference} className="flex flex-col gap-0.5 px-3 py-2 @3xl/fdp:flex-row @3xl/fdp:items-center @3xl/fdp:gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 font-semibold tabular-nums">KES {p.amount.toLocaleString()}</span>
              <span className="truncate">
                {p.tenantName ?? "Unknown tenant"} · {p.houseName} {p.unitNumber}
              </span>
            </span>
            <span className="text-xs text-amber-800/90 @3xl/fdp:ml-auto @3xl/fdp:shrink-0">
              dated {day(p.date)} · entered {day(p.enteredOn)} · ref {p.reference}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
