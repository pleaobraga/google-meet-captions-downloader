import { toast } from '@/ui/components/chadcn/sonner'
import { useState } from 'react'

export function useCaptionItem() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function getCaptionTranscript({
    date,
    text,
    title,
  }: {
    date: Date
    text: string
    title: string
  }): Promise<void> {
    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'GET_CAPTION_TRANSCRIPT',
      target: 'background',
      payload: { date, text, title },
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

  async function getHistoryCaptionTranscript({
    date,
    history,
    title,
  }: {
    date: Date
    history: Array<{ text: string; time: string | number }>
    title: string
  }): Promise<void> {
    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'GET_HISTORY_CAPTION_TRANSCRIPT',
      target: 'background',
      payload: { date, history, title },
    })

    if (captionsError) {
      toast.error(`Error extracting History captions: ${captionsError}`)
    }
  }
  const downloadTranscript = async ({
    date,
    text,
    title,
  }: {
    date: Date
    text: string
    title: string
  }) => {
    setIsDownloading(true)
    await getCaptionTranscript({ date, text, title })
    setIsDownloading(false)
  }

  const deleteTranscript = async ({ id }: { id: string }) => {
    setIsDeleting(true)
    await deleteCaptionTranscript({ id })
    setIsDeleting(false)
  }

  const downloadHistoryTranscript = async ({
    date,
    history,
    title,
  }: {
    date: Date
    history: Array<{ text: string; time: string | number }>
    title: string
  }) => {
    setIsDownloading(true)
    await getHistoryCaptionTranscript({ date, history, title })
    setIsDownloading(false)
  }

  return {
    isDownloading,
    isDeleting,
    downloadTranscript,
    deleteTranscript,
    downloadHistoryTranscript,
  }
}
