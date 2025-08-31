import { toast } from '@/components/chadcn/sonner'
import { useState } from 'react'

export function useCaptionItem() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  async function deleteCaptionTranscript({
    id,
  }: {
    id: string
  }): Promise<void> {
    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'DELETE_PAST_TRANSCRIPT',
      target: 'background',
      payload: { id },
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

  const deleteTranscript = async ({ id }: { id: string }) => {
    setIsDeleting(true)
    await deleteCaptionTranscript({ id })
    setIsDeleting(false)
  }

  return {
    isDownloading,
    isDeleting,
    downloadTranscript,
    deleteTranscript,
  }
}
