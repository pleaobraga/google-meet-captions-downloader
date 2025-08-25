import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function errorHandler(error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  return { errorMessage }
}
