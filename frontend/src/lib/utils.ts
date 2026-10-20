import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Ledger balance: positive = owed, negative = credit (overpaid), zero = settled.
export const formatBalance = (balance: number) =>
  `${balance < 0 ? "-" : ""}Ksh.${Math.abs(balance).toLocaleString()}`

const compactFormat = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })

// Chart axis ticks: 26950264 -> "27M", so the axis fits on a phone.
export const formatCompact = (value: number) => compactFormat.format(value)

export const balanceTone = (balance: number) =>
  balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : "text-muted-foreground"
