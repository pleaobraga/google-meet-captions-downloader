/* eslint-disable no-useless-escape */
const captionsContainer = document.querySelector('[aria-label="Captions"]')

const captions = captionsContainer?.innerText || ''

const regex =
  /(?<=^|\n)([A-Z][a-z]+(?: [A-Z][a-z]+)*)\n([\s\S]+?)(?=\n[A-Z][a-z]+|\Z)/g
const formattedCaptions = []
let match

while ((match = regex.exec(captions)) !== null) {
  const speaker = match[1]
  const speech = match[2].trim()
  formattedCaptions.push(`${speaker}: ${speech}`)
}

const finalText = formattedCaptions.join('\n\n')

console.log(finalText)
