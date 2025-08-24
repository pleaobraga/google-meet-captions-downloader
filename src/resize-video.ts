// get video current values
export function getfullScreamValues() {
  const video = document.querySelector<HTMLVideoElement>('video')

  if (!video) {
    throw new Error('Video element not found')
  }

  const videoStyle = video.style.cssText

  const otherHeight = Number(video.style.height.split('px')[0]) - 2

  const otherElements = document.querySelectorAll<HTMLElement>(
    `[style*="height: ${otherHeight}px"]`
  )

  const elementsStyle: Record<string, string> = {}

  otherElements.forEach((element, i) => {
    const id = `el-${i}-${Date.now()}` // CSS-safe (avoids ":" from ISO)
    element.id = id
    elementsStyle[id] = element.style.cssText
  })

  return {
    videoStyle,
    elementsStyle,
  }
}

type increaseVideoSizeParams = {
  videoFullStyle: string
  elementsFullStyle: Record<string, string>
}

export function increaseVideoSize({
  videoFullStyle,
  elementsFullStyle,
}: increaseVideoSizeParams) {
  const video = document.querySelector<HTMLVideoElement>('video')

  if (!video) {
    throw new Error('Video element not found')
  }

  const otherHeight = Number(video.style.height.split('px')[0]) - 2

  const otherElements = document.querySelectorAll<HTMLElement>(
    `[style*="height: ${otherHeight}px"]`
  )

  otherElements.forEach((element) => {
    element.style.cssText = elementsFullStyle[element.id]
  })

  video.style.cssText = videoFullStyle
}

// const { videoStyle, elementsStyle} = getfullScreamValues()

// console.log("videoStyle", videoStyle)
// console.dir(elementsStyle)

// increaseVideoSize(videoStyle, elementsStyle)
