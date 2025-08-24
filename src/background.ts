import { defaultName, extractCaptions } from './captions'

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

    const dataUrl =
      'data:text/plain;charset=utf-8,' + encodeURIComponent(formatted)

    await chrome.downloads.download({
      url: dataUrl,
      filename: defaultName(),
      saveAs: true,
    })
  } catch (error) {
    console.error('Error extracting captions:', error)
  }
})
