import {
  downloadCaptions,
  extractCaptions,
} from '../features/captions/captions'

let currentWindowId: number | undefined

chrome.action.onClicked.addListener(async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  currentWindowId = tab?.id

  await chrome.windows.create({
    url: chrome.runtime.getURL('index.html'),
    type: 'popup',
    width: 420,
    height: 720,
  })
})

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type !== 'INJECT_AND_RUN') return
  if (!currentWindowId) return
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
})
