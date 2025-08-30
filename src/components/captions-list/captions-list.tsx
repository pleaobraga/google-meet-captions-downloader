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
    <div className="flex flex-col gap-5">
      <h2 className="text-2xl font-semibold">Past Captions List</h2>
      <ul className="flex flex-col">
        {pastTranscriptions &&
          Object.entries(pastTranscriptions).map(([key, { timestamp }]) => {
            const date = new Date(timestamp)

            return (
              <li key={key}>
                <div className="flex items-center gap-4">
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
    </div>
  )
}
