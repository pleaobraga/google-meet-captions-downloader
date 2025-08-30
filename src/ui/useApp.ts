import { toast } from '@/components/chadcn/sonner'
import { useEffect, useState } from 'react'

export function useApp() {
  const [isLoading, setIsLoading] = useState(false)
  const [pastTranscriptions, setPastTranscriptions] = useState<Record<
    string,
    { text: string; timestamp: number; id: string }
  > | null>(null)

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'keepAlive' })
    setInterval(() => port.postMessage({ ping: Date.now() }), 20_000)

    getPastTranscriptions()
  }, [])

  async function getCaptionsTranscript(): Promise<void> {
    setIsLoading(true)

    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'GET_CAPTIONS_TRANSCRIPT',
      target: 'background',
    })

    if (captionsError) {
      toast.error(`Error extracting captions: ${captionsError}`)
    }

    setIsLoading(false)
  }

  async function getFullVideoScreen(): Promise<void> {
    const { error, success } = await chrome.runtime.sendMessage({
      type: 'APPLY_FULL_VIDEO_SCREEN',
      target: 'background',
    })

    if (success) {
      toast.success('Successfully applied full video styles!')
    }

    if (error) {
      toast.error(`Error increasing video size: ${error}`)
    }
  }

  async function getPastTranscriptions(): Promise<void> {
    const { error, pastTranscriptions } = await chrome.runtime.sendMessage({
      type: 'GET_PAST_TRANSCRIPTIONS',
      target: 'background',
    })

    setPastTranscriptions(pastTranscriptions)

    console.log('pastTranscriptions', pastTranscriptions)

    if (error) {
      toast.error(`Error retrieving past transcriptions: ${error}`)
    }
  }

  return {
    isLoading,
    pastTranscriptions,
    getCaptionsTranscript,
    getFullVideoScreen,
    getPastTranscriptions,
  }
}
