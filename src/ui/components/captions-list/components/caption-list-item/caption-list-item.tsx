import { MdDelete, MdDownload } from 'react-icons/md'
import { useCaptionItem } from './use-caption-item'
import { Button } from '@/ui/components/chadcn/button'

type Props = {
  date: Date
  id: string
  text: string
  title: string
  onDelete: (id: string) => void
}

export function CaptionListItem({ date, text, id, onDelete, title }: Props) {
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
    <li className="flex p-4 bg-[#292928] rounded-md">
      <div className="flex items-center gap-4 justify-between w-full">
        <div className="flex flex-col">
          <h3 className="text-xl font-medium">{date.toLocaleString()}</h3>
          <h4 className="text-sm text-muted-foreground">{title}</h4>
        </div>
        <div className="flex gap-3">
          <Button
            title="Download this transcript"
            variant="secondary"
            size="icon"
            disabled={isDownloading}
            onClick={() => downloadTranscript({ date, text })}
          >
            <MdDownload />
          </Button>
          <Button
            title="Delete this transcript"
            variant="destructive"
            size="icon"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <MdDelete />
          </Button>
        </div>
      </div>
    </li>
  )
}
