const observer = new MutationObserver(() => {
  const caption = document.querySelector<HTMLButtonElement>(
    '[aria-label="Turn on captions"]'
  )

  if (caption) {
    // open captions
    caption.click()
  }
})

const body = document.querySelector('body')

observer.observe(body!, {
  childList: true,
  subtree: true,
})
