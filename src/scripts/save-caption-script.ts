const SAVED_ITEMS_PREFIX = 'captionText_'
const HISTORY_SAVED_ITEMS_PREFIX = 'history_captionText_'

let hasCaptionObserver = false
let setToogleCaptionOff = false

let captionText: HTMLDivElement | null = null
let meetingTitle: string = ''

const body = document.querySelector('body')

const startedMeetingDate = new Date()

const currentStorageItem = `${SAVED_ITEMS_PREFIX}${startedMeetingDate.getTime()}`
const currentStorageItemHistory = `${HISTORY_SAVED_ITEMS_PREFIX}${startedMeetingDate.getTime()}`

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
    meetingTitle = getMeetingTitle()
  }

  if (captionText && !hasCaptionObserver) {
    hasCaptionObserver = true
    meetingTitle = getMeetingTitle()

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
  localStorage.setItem(currentStorageItemHistory, '[]')
  saveCloseCaptionAfterMinutes()
}

function saveCaptionText(captionText: string) {
  const itemData = JSON.stringify({
    text: captionText,
    title: meetingTitle,
  })

  localStorage.setItem(currentStorageItem, itemData)
}

function getMeetingTitle(): string {
  const meetingTitle = document.querySelector<HTMLDivElement>(
    '[data-meeting-title]'
  )?.innerText

  if (meetingTitle) {
    return meetingTitle.split(`\n`)[0]
  }

  return ''
}

function saveCloseCaptionAfterMinutes(minutes: number = 5) {
  setInterval(
    () => {
      if (captionText) {
        const currentSaveState = JSON.parse(
          localStorage.getItem(currentStorageItemHistory)!
        )

        // if (currentSaveState.length === 0) {
        const itemData = {
          text: captionText.innerText,
          time: `${diffInMinutes(new Date(), startedMeetingDate)} Minutes`,
        }

        currentSaveState.push(itemData)
        // } else {
        //   const newtext = mergeTexts(
        //     captionText.innerText,
        //     currentSaveState.history[currentSaveState.history.length - 1].text
        //   )

        //   const itemData = {
        //     text: newtext,
        //     time: diffInMinutes(new Date(), startedMeetingDate),
        //   }

        //   currentSaveState.history.push(itemData)
        // }

        localStorage.setItem(
          currentStorageItemHistory,
          JSON.stringify(currentSaveState)
        )
      }
    },
    minutes * 60 * 1000
  )
}

function diffInMinutes(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date1.getTime() - date2.getTime())
  return Math.floor(diffMs / (1000 * 60))
}

// function mergeTexts(a: string, b: string): string {
//   const first = a.trim()
//   const second = b.trim()
//   let overlap = ''

//   // find longest suffix of `first` that is a prefix of `second`
//   for (let i = 1; i <= Math.min(first.length, second.length); i++) {
//     if (first.endsWith(second.slice(0, i))) {
//       overlap = second.slice(0, i)
//     }
//   }

//   return first + second.slice(overlap.length)
// }
