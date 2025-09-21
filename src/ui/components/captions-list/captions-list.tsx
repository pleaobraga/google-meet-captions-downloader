import { CaptionListItem } from './components/caption-list-item'

type Props = {
  pastTranscriptions: {
    [key: string]: {
      text: string
      timestamp: number
      id: string
      title: string
      history: Array<{ text: string; time: string }>
    }
  } | null
  onDelete: (id: string) => void
}

export function CaptionsList({ pastTranscriptions, onDelete }: Props) {
  if (!pastTranscriptions || Object.keys(pastTranscriptions).length === 0) {
    return <p>No previous captions available</p>
  }

  return (
    <ul className="flex flex-col gap-4">
      {pastTranscriptions &&
        Object.entries(pastTranscriptions)
          .reverse()
          .map(([, { timestamp, id, text, title, history }]) => {
            const date = new Date(timestamp)

            return (
              <CaptionListItem
                key={id}
                date={date}
                id={id}
                text={text}
                title={title}
                history={history}
                onDelete={onDelete}
              />
            )
          })}
    </ul>
  )
}
