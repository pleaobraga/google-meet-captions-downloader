import { toast } from '@/components/chadcn/sonner'
import { useEffect, useState } from 'react'

export function useApp() {
  const [isLoading, setIsLoading] = useState(false)
  const [hideCaption, setHideCaption] = useState(false)

  useEffect(() => {
    const port = chrome.runtime.connect({ name: 'keepAlive' })
    setInterval(() => port.postMessage({ ping: Date.now() }), 20_000)
  }, [])

  async function getCaptionsTranscript(): Promise<void> {
    setIsLoading(true)

    const { error: captionsError } = await chrome.runtime.sendMessage({
      type: 'GET_CAPTIONS_TRANSCRIPT',
    })

    if (captionsError) {
      toast.error(`Error extracting captions: ${captionsError}`)
    }

    setIsLoading(false)
  }

  async function getFullVideoScreen(): Promise<void> {
    const { error, success } = await chrome.runtime.sendMessage({
      type: 'APPLY_FULL_VIDEO_SCREEN',
    })

    if (success) {
      toast.success('Successfully applied full video styles!')
    }

    if (error) {
      toast.error(`Error increasing video size: ${error}`)
    }
  }

  async function getFullVideoScreenStyles(): Promise<void> {
    const { error, success } = await chrome.runtime.sendMessage({
      type: 'GET_FULL_VIDEO_SCREEN_STYLES',
    })

    if (error) {
      toast.error(`Error getting video size: ${error}`)
    }

    if (success) {
      toast.success('Successfully got video styles!')
    }
  }

  async function hideCaptions(): Promise<void> {
    const { error, success } = await chrome.runtime.sendMessage({
      type: 'HIDE_CAPTIONS',
    })

    if (error) {
      toast.error(`Error hiding captions: ${error}`)
    }

    if (success) {
      setHideCaption(true)
      toast.success('Successfully hid captions!')
    }
  }

  async function showCaptions(): Promise<void> {
    const { error, success } = await chrome.runtime.sendMessage({
      type: 'SHOW_CAPTIONS',
    })

    if (error) {
      toast.error(`Error showing captions: ${error}`)
    }

    if (success) {
      setHideCaption(false)
      toast.success('Successfully showed captions!')
    }
  }

  return {
    isLoading,
    hideCaption,
    getCaptionsTranscript,
    getFullVideoScreen,
    getFullVideoScreenStyles,
    hideCaptions,
    showCaptions,
  }
}
