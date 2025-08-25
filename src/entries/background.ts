import { downloadCaptions, extractCaptions } from '@/features/captions/captions'

let currentWindowId: number | undefined
let videoFullStyle: string | null = null
let elementsFullStyle: Record<string, string> | null = null

chrome.action.onClicked.addListener(async (tab) => {
  currentWindowId = tab?.id

  if (!currentWindowId) return console.warn('No active window ID.')

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

  if (!result) return console.warn('No result found.')

  videoFullStyle = result.videoStyle
  elementsFullStyle = result.elementsStyle

  console.log('videoFullStyle', videoFullStyle)
  console.log('elementsFullStyle', elementsFullStyle)

  await chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 420,
    height: 720,
  })
})

chrome.runtime.onMessage.addListener(async (msg) => {
  if (!currentWindowId) return console.warn('No active window ID.')

  switch (msg?.type) {
    case 'GET_CAPTIONS_TRANSCRIPT':
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: currentWindowId },
          func: extractCaptions,
        })

        const formatted = (result as string) || ''
        if (!formatted) return console.warn('No captions found.')

        downloadCaptions(formatted)
      } catch (error) {
        console.error('Error extracting captions:', error)
      }

      break
  }
})
