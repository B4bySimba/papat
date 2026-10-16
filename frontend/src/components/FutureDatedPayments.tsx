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
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {payments.length} payment{payments.length > 1 ? "s" : ""} dated in the future
      </div>
      <p className="mt-1 text-amber-800">
        Kept exactly as entered. A payment dated in a later month isn&apos;t counted until that month arrives, so
        check whether the date is a typo.
      </p>
      <ul className="mt-2 space-y-1">
        {payments.map((p) => (
          <li key={p.reference}>
            KES {p.amount.toLocaleString()} · {p.tenantName ?? "Unknown tenant"} · {p.houseName} {p.unitNumber} · dated{" "}
            {day(p.date)} · entered {day(p.enteredOn)} · ref {p.reference}
          </li>
        ))}
      </ul>
    </div>
  );
}
