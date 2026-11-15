/** Baixa um arquivo de texto gerado na hora, sem permissão extra do Chrome. */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
