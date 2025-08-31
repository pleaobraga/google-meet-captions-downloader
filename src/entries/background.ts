import {
  deletePastTranscriptions,
  downloadCaptions,
  extractCaptions,
  formatCaptions,
  getPastTranscriptions,
  transcriptNameByDate,
} from '@/features/captions/captions'
import { increaseVideoSize } from '@/features/resize-video/resize-video'
import { errorHandler } from '@/lib/utils'

let currentWindowId: number | undefined
let videoFullStyle: string | null = null
let elementsFullStyle: Record<string, string> | null = null

chrome.action.onClicked.addListener(async (tab) => {
  currentWindowId = tab?.id

  if (!currentWindowId) return console.warn('No active window ID.')

  await chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 470,
    height: 600,
  })
})

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keepAlive') {
    port.onMessage.addListener(() => {})
    port.onDisconnect.addListener(() => {})
  }
})

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  console.log('message', message)
  ;(async () => {
    if (message.target !== 'background') {
      return false
    }

    if (!currentWindowId) return console.warn('No active window ID.')

    switch (message?.type) {
      case 'GET_CURRENT_CAPTIONS_TRANSCRIPT': {
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: currentWindowId },
            func: extractCaptions,
          })

          const captions = (result as string) || ''
          if (!captions) throw new Error('No captions found.')

          const formatted = formatCaptions(captions)

          downloadCaptions(formatted)

          sendResponse({ success: true })
        } catch (error) {
          const { errorMessage } = errorHandler(error)
          sendResponse({ error: errorMessage })
          console.error('Error extracting captions:', errorMessage)
        }

        break
      }

      case 'GET_CAPTION_TRANSCRIPT': {
        try {
          if (!message.payload.text)
            throw new Error('No caption text provided.')

          const formatted = formatCaptions(message.payload.text)

          const filename = transcriptNameByDate(message.payload.date)

          downloadCaptions(formatted, filename)

          sendResponse({ success: true })
        } catch (error) {
          const { errorMessage } = errorHandler(error)
          sendResponse({ error: errorMessage })
          console.error('Error extracting captions:', errorMessage)
        }

        break
      }

      case 'APPLY_FULL_VIDEO_SCREEN': {
        try {
          if (!videoFullStyle || !elementsFullStyle) {
            console.warn('No video or elements style found.')
            throw new Error('No video or elements style found.')
          }

          await chrome.scripting.executeScript({
            target: { tabId: currentWindowId },
            args: [{ videoFullStyle, elementsFullStyle }],
            func: increaseVideoSize,
          })
          sendResponse({ success: true })
        } catch (error) {
          const { errorMessage } = errorHandler(error)
          sendResponse({ error: errorMessage })
          console.error('Error increasing video size:', errorMessage)
        }

        break
      }

      case 'GET_FULL_VIDEO_SCREEN_STYLES': {
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: currentWindowId! },
            func: () => {
              const video = document.querySelector<HTMLVideoElement>('video')

              if (!video) {
                throw new Error('Video element not found')
              }

              //current rule to get the other documents that impact on the <video> size
              const otherHeight = Number(video.style.height.split('px')[0]) - 2
              const otherElements = document.querySelectorAll<HTMLElement>(
                `[style*="height: ${otherHeight}px"]`
              )
              const videoStyle = video.style.cssText

              const elementsStyle: Record<string, string> = {}

              otherElements.forEach((element, i) => {
                const id = `el-${i}-${Date.now()}`
                element.id = id
                elementsStyle[id] = element.style.cssText
              })

              console.log('videoStyle', videoStyle)
              console.dir(elementsStyle)

              return {
                videoStyle,
                elementsStyle,
              }
            },
          })

          if (!result) throw new Error('No Elements found')

          videoFullStyle = result.videoStyle
          elementsFullStyle = result.elementsStyle

          console.log('videoFullStyle', videoFullStyle)
          console.log('elementsFullStyle', elementsFullStyle)
          sendResponse({ success: true })
        } catch (error) {
          const { errorMessage } = errorHandler(error)
          sendResponse({ error: errorMessage })
          console.error('Error getting video size:', errorMessage)
        }

        break
      }

      case 'GET_PAST_TRANSCRIPTIONS': {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: currentWindowId },
          func: getPastTranscriptions,
        })
        return sendResponse({
          success: true,
          pastTranscriptions: result,
        })
      }

      case 'DELETE_PAST_TRANSCRIPT': {
        try {
          if (!message.payload.id) throw new Error('No caption ID provided.')

          await chrome.scripting.executeScript({
            target: { tabId: currentWindowId },
            func: deletePastTranscriptions,
            args: [message.payload.id],
          })

          sendResponse({ success: true })
        } catch (error) {
          const { errorMessage } = errorHandler(error)
          sendResponse({ error: errorMessage })
          console.error('Error extracting captions:', errorMessage)
        }

        break
      }
    }
  })()

  return true
})
