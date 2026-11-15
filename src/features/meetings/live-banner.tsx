import { cn } from '@/lib/utils'
import type { LiveStatus } from '@/shared/types'

type LiveBannerProps = {
  live: LiveStatus | undefined
}

export function LiveBanner({ live }: LiveBannerProps) {
  if (live?.state === 'captions-unavailable') {
    return (
      <Banner className="border-destructive text-destructive">
        Não foi possível ler as legendas da reunião em andamento. Verifique se
        as legendas estão ligadas no Meet.
      </Banner>
    )
  }
  if (live?.state === 'captions-off') {
    return (
      <Banner>
        Legendas desligadas na reunião em andamento · gravação pausada
      </Banner>
    )
  }
  return null
}

function Banner({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      role="status"
      className={cn('rounded-md border px-4 py-2 text-sm', className)}
    >
      {children}
    </div>
  )
}
