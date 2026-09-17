import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Ledger balance: positive = owed, negative = credit (overpaid), zero = settled.
export const formatBalance = (balance: number) =>
  `${balance < 0 ? "-" : ""}Ksh.${Math.abs(balance).toLocaleString()}`

export const balanceTone = (balance: number) =>
  balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : "text-muted-foreground"
