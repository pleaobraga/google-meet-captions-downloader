export {}

declare global {
  interface DocumentPictureInPicture {
    requestWindow(options?: {
      width?: number
      height?: number
    }): Promise<Window>
    readonly window: Window | null
  }

  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}
