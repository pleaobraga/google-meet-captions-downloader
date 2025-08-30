type Props = {
  pastTranscriptions: {
    [key: string]: { text: string; timestamp: number; id: string }
  } | null
}

export function CaptionsList({ pastTranscriptions }: Props) {
  return (
    <div>
      <h2>Past Captions List</h2>
      <ul>
        {pastTranscriptions &&
          Object.entries(pastTranscriptions).map(
            ([key, { text, timestamp }]) => {
              console.log('Rendering past transcription:', key, text, timestamp)

              const date = new Date(timestamp)

              return (
                <li key={key}>
                  <strong>{date.toLocaleString()}</strong>: {text}
                </li>
              )
            }
          )}
      </ul>
    </div>
  )
}
