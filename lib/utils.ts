import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return `S/ ${(value ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatNumber(value: number): string {
  return (value ?? 0).toLocaleString("es-PE")
}

export function formatPercent(value: number): string {
  return `${(value ?? 0).toFixed(2)}%`
}
