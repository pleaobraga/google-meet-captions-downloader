import { toast } from '@/components/chadcn/sonner'
import { useState } from 'react'

export function useCaptionItem() {
  const [isDownloading, setIsDownloading] = useState(false)

  async function getCaptionTranscript({
    id,
    date,
  }: {
    id: string
    date: Date
  }): Promise<void> {
    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'GET_CAPTION_TRANSCRIPT',
      target: 'background',
      payload: { id, date },
    })

    if (captionsError) {
      toast.error(`Error extracting captions: ${captionsError}`)
    }
  }

  const downloadTranscript = async ({
    id,
    date,
  }: {
    id: string
    date: Date
  }) => {
    setIsDownloading(true)
    await getCaptionTranscript({ id, date })
    setIsDownloading(false)
  }

  return {
    isDownloading,
    downloadTranscript,
  }
}
