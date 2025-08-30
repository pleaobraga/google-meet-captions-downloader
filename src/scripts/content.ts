let hasCaptionObserver = false

let captionText: HTMLDivElement | null = null

const body = document.querySelector('body')

const currentStorageItem = `captionText_${Date.now()}`

console.log('currentStorageItem', currentStorageItem)

const observerCaptions = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (captionText && mutation.type === 'characterData') {
      saveCaptionText(captionText.innerText)
    }
  })
})

const observerBody = new MutationObserver(() => {
  const captionToogle = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn on captions"]'
  )
  captionText = document.querySelector<HTMLDivElement>(
    '[aria-label="Captions"]'
  )

  if (captionToogle) {
    // open captions
    captionToogle.click()
  }

  if (captionText && !hasCaptionObserver) {
    hasCaptionObserver = true
    observerCaptions.observe(captionText, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  }
})

if (body) {
  observerBody.observe(body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}

function saveCaptionText(captionText: string) {
  localStorage.setItem(currentStorageItem, captionText)
}
