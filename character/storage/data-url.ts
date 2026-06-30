const IMAGE_DATA_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/

export function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && IMAGE_DATA_URL_PATTERN.test(value)
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (!isImageDataUrl(dataUrl)) {
    throw new Error('Expected an image data URL')
  }

  const response = await fetch(dataUrl)
  return await response.blob()
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob as data URL'))
    reader.readAsDataURL(blob)
  })
}
