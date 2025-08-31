import { CaptionListItem } from './components/caption-list-item'

type Props = {
  pastTranscriptions: {
    [key: string]: { text: string; timestamp: number; id: string }
  } | null
}

export function CaptionsList({ pastTranscriptions }: Props) {
  return (
    <ul className="flex flex-col">
      {pastTranscriptions &&
        Object.entries(pastTranscriptions)
          .reverse()
          .map(([, { timestamp, id }]) => {
            const date = new Date(timestamp)

            return <CaptionListItem key={id} date={date} id={id} />
          })}
    </ul>
  )
}
