import { Button } from '@/components/chadcn/button'
import { Separator } from '@/components/chadcn/separator'
import { MdDelete, MdDownload } from 'react-icons/md'
import { useCaptionItem } from './use-caption-item'

type Props = {
  date: Date
  id: string
  text: string
  onDelete: (id: string) => void
}

export function CaptionListItem({ date, text, id, onDelete }: Props) {
  const { downloadTranscript, deleteTranscript, isDeleting, isDownloading } =
    useCaptionItem()

  const handleDelete = async () => {
    try {
      await deleteTranscript({ id })
      onDelete(id)
    } catch (error) {
      console.error('Error deleting transcript:', error)
    }
  }

  return (
    <li>
      <div className="flex items-center gap-4 justify-between">
        <h3 className="text-base font-medium">{date.toLocaleString()}</h3>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            disabled={isDownloading}
            onClick={() => downloadTranscript({ date, text })}
          >
            <MdDownload />
            Download
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <MdDelete />
            Delete
          </Button>
        </div>
      </div>
      <Separator className="my-4" />
    </li>
  )
}
