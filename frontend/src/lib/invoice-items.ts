// Pure invoice-item builder over the tenant summary (V2 event-ledger) response.
// Kept free of React/fetch so it can be exercised standalone; the invariant it
// maintains for "Comprehensive" invoices is: total === the month row's
// `expected` (the month's statement). See docs/BILLING_MODEL.md §8.

export interface InvoiceLineItem {
  id: number;
  description: string;
  amount: number;
  quantity?: number;
  rate?: number;
  serviceCharge?: number;
  utilityType?: string;
  isInfoItem?: boolean;
}

export interface BuiltInvoice {
  items: InvoiceLineItem[];
  /** Billing date (YYYY-MM-DD) of the invoiced month — rent's due date. */
  dueDate: string | null;
  total: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getMonthRow(summary: any, year: number, month: number): any | null {
  if (!summary || month < 1 || month > 12) return null;
  return summary?.[year]?.[MONTH_NAMES[month - 1]] ?? null;
}

/** December of the previous year when asked for the row before January. */
export function getPreviousMonthRow(summary: any, year: number, month: number): any | null {
  return month === 1 ? getMonthRow(summary, year - 1, 12) : getMonthRow(summary, year, month - 1);
}

function labelize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, " $1");
}

export function buildInvoiceItems(
  data: { summary?: any } | null | undefined,
  year: number,
  month: number,
  invoiceType: string,
  selectedUtility?: string,
): BuiltInvoice | null {
  const row = getMonthRow(data?.summary, year, month);
  if (!row) return null;

  const dueDate: string | null = row.billingDate ?? null;
  const items: InvoiceLineItem[] = [];
  let id = 0;
  const push = (item: Omit<InvoiceLineItem, "id">) => items.push({ id: ++id, ...item });

  switch (invoiceType) {
    case "Comprehensive": {
      // rentCharged is what the ledger actually posted this month (0 while the
      // billing date hasn't been reached on a terminated lease); older backend
      // responses without the field fall back to the flat rate.
      const rent = row.rentCharged ?? row.rentRate ?? 0;
      if (rent > 0) push({ description: "Monthly Rent", amount: rent });

      if (row.deposit > 0) push({ description: "Security Deposit", amount: row.deposit });
      if (row.arrearsbf > 0) push({ description: "Arrears Brought Forward", amount: row.arrearsbf });

      const prev = getPreviousMonthRow(data?.summary, year, month);
      const carried = prev?.balance ?? 0;
      if (carried > 0) push({ description: "Arrears Balance", amount: carried });
      else if (carried < 0) push({ description: "Credit Balance (overpayment)", amount: carried });

      if ((row.waterCharge ?? 0) > 0) {
        push({
          description: `Water Charge (${row.previousReading} → ${row.currentReading})`,
          quantity: row.usage,
          rate: row.waterRate,
          amount: row.waterCharge, // already includes the service charge
          serviceCharge: row.serviceCharge || 0,
          utilityType: "water",
        });
      }

      for (const [name, amount] of Object.entries(row.extraCharges ?? {})) {
        if (amount) push({ description: labelize(name), amount: Number(amount) });
      }
      break;
    }

    case "utilities": {
      if (selectedUtility !== "water") return { items: [], dueDate, total: 0 };
      if (row.previousReading === null || row.currentReading === null) {
        return { items: [], dueDate, total: 0 };
      }
      push({
        description: `Previous Meter Reading (${row.previousReading})`,
        amount: 0,
        isInfoItem: true,
      });
      push({
        description: `Current Meter Reading (${row.currentReading})`,
        amount: 0,
        isInfoItem: true,
      });
      push({
        description: `Water Usage (${row.usage} units)`,
        quantity: row.usage,
        rate: 0,
        amount: 0,
        isInfoItem: true,
      });
      push({
        description: `Water Rate (KSH ${row.waterRate}/unit)`,
        quantity: row.usage,
        rate: row.waterRate,
        amount: (row.waterCharge ?? 0) - (row.serviceCharge ?? 0),
      });
      if ((row.serviceCharge ?? 0) > 0) {
        push({ description: "Service Charge", amount: row.serviceCharge });
      }
      break;
    }

    case "security-deposit": {
      if (row.deposit > 0) push({ description: "Security Deposit", amount: row.deposit });
      break;
    }

    // maintenance / late-fees / custom: line items are entered manually in the
    // generator; nothing is derived from the ledger here.
    default:
      break;
  }

  return { items, dueDate, total: items.reduce((sum, i) => sum + i.amount, 0) };
}
