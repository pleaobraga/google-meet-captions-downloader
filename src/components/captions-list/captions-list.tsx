import { CaptionListItem } from './components/caption-list-item'

type Props = {
  pastTranscriptions: {
    [key: string]: {
      text: string
      timestamp: number
      id: string
      title: string
    }
  } | null
  onDelete: (id: string) => void
}

export function CaptionsList({ pastTranscriptions, onDelete }: Props) {
  return (
    <ul className="flex flex-col gap-4">
      {pastTranscriptions &&
        Object.entries(pastTranscriptions)
          .reverse()
          .map(([, { timestamp, id, text, title }]) => {
            const date = new Date(timestamp)

            return (
              <CaptionListItem
                key={id}
                date={date}
                id={id}
                text={text}
                title={title}
                onDelete={onDelete}
              />
            )
          })}
    </ul>
  )
}
