import { toast } from '@/components/chadcn/sonner'
import { useState } from 'react'

export function useCaptionItem() {
  const [isDownloading, setIsDownloading] = useState(false)

  async function getCaptionTranscript({
    date,
    text,
  }: {
    date: Date
    text: string
  }): Promise<void> {
    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'GET_CAPTION_TRANSCRIPT',
      target: 'background',
      payload: { date, text },
    })

    if (captionsError) {
      toast.error(`Error extracting captions: ${captionsError}`)
    }
  }

  const downloadTranscript = async ({
    date,
    text,
  }: {
    date: Date
    text: string
  }) => {
    setIsDownloading(true)
    await getCaptionTranscript({ date, text })
    setIsDownloading(false)
  }

  return {
    isDownloading,
    downloadTranscript,
  }
}
