import { Button } from '@/components/chadcn/button'
import { Separator } from '@/components/chadcn/separator'
import { MdDelete, MdDownload } from 'react-icons/md'
import { useCaptionItem } from './use-caption-item'

type Props = {
  date: Date
  id: string
}

export function CaptionListItem({ date, id }: Props) {
  const { downloadTranscript } = useCaptionItem()

  return (
    <li>
      <div className="flex items-center gap-4 justify-between">
        <h3 className="text-base font-medium">{date.toLocaleString()}</h3>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => downloadTranscript({ id, date })}
          >
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
}
