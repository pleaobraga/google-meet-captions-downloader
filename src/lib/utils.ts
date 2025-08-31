import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function errorHandler(error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  return { errorMessage }
}

export function formatDateToFilename(date?: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const currentDate = date ? new Date(date) : new Date()

  const firstFormat = formatter.format(currentDate)

  const formattedDate = firstFormat.replace(
    /(\d{2})\/(\d{2})\/(\d{4}),\s(\d{2}):(\d{2})/,
    '$1-$2-$3T$4-$5'
  )

  return formattedDate
}
