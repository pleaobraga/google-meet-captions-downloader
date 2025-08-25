import { downloadCaptions, extractCaptions } from '@/features/captions/captions'
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
    width: 420,
    height: 720,
  })
})

chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  ;(async () => {
    if (!currentWindowId) return console.warn('No active window ID.')

    switch (message?.type) {
      case 'GET_CAPTIONS_TRANSCRIPT': {
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: currentWindowId },
            func: extractCaptions,
          })

          const formatted = (result as string) || ''
          if (!formatted) throw new Error('No captions found.')

          downloadCaptions(formatted)

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
    }
  })()

  return true
})
