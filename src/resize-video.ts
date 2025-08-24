export function getHTMLElements() {
  const video = document.querySelector<HTMLVideoElement>('video')

  if (!video) {
    throw new Error('Video element not found')
  }

  const otherHeight = Number(video.style.height.split('px')[0]) - 2

  const otherElements = document.querySelectorAll<HTMLElement>(
    `[style*="height: ${otherHeight}px"]`
  )

  return { video, otherElements }
}

export function getfullScreamStyles() {
  const { video, otherElements } = getHTMLElements()

  const videoStyle = video.style.cssText

  const elementsStyle: Record<string, string> = {}

  otherElements.forEach((element, i) => {
    const id = `el-${i}-${Date.now()}`
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
  const { video, otherElements } = getHTMLElements()

  otherElements.forEach((element) => {
    element.style.cssText = elementsFullStyle[element.id]
  })

  video.style.cssText = videoFullStyle
}

// const { videoStyle, elementsStyle} = getfullScreamStyles()

// console.log("videoStyle", videoStyle)
// console.dir(elementsStyle)

// increaseVideoSize(videoStyle, elementsStyle)
