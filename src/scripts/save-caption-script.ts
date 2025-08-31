const SAVED_ITEMS_PREFIX = 'captionText_'

let hasCaptionObserver = false
let setToogleCaptionOff = false

let captionText: HTMLDivElement | null = null

const body = document.querySelector('body')

const currentStorageItem = `${SAVED_ITEMS_PREFIX}${Date.now()}`

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

  const captionOffToggle = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn off captions"]'
  )

  if (captionToogle) {
    // open captions
    captionToogle.click()
  }

  if (captionOffToggle && !setToogleCaptionOff) {
    setToogleCaptionOff = true
    captionOffToggle.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
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
