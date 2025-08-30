import { MdDelete, MdDownload } from 'react-icons/md'

import { Button } from '../chadcn/button'
import { Separator } from '../chadcn/separator'

type Props = {
  pastTranscriptions: {
    [key: string]: { text: string; timestamp: number; id: string }
  } | null
}

export function CaptionsList({ pastTranscriptions }: Props) {
  return (
    <ul className="flex flex-col">
      {pastTranscriptions &&
        Object.entries(pastTranscriptions).map(([key, { timestamp }]) => {
          const date = new Date(timestamp)

          return (
            <li key={key}>
              <div className="flex items-center gap-4 justify-between">
                <h3 className="text-base font-medium">
                  {date.toLocaleString()}
                </h3>
                <div className="flex gap-3">
                  <Button variant="secondary">
                    <MdDownload />
                    Download
                  </Button>
                  <Button variant="destructive">
                    <MdDelete />
                    Delete
                  </Button>
                </div>
              </div>
              <Separator className="my-4" />
            </li>
          )
        })}
    </ul>
  )
}
