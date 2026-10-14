export type LoadedExportImage = {
  bytes: Uint8Array
  widthPx: number
  heightPx: number
  type: 'png' | 'jpg' | 'gif'
}

const MAX_WIDTH_PX = 460

function imageTypeFromUrl(url: string): 'png' | 'jpg' | 'gif' {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (/\.jpe?g$/.test(path)) return 'jpg'
  if (/\.gif$/.test(path)) return 'gif'
  return 'png'
}

function scaleToMaxWidth(w: number, h: number, maxW: number): { widthPx: number; heightPx: number } {
  if (w <= 0 || h <= 0) return { widthPx: maxW, heightPx: Math.round(maxW * 0.75) }
  if (w <= maxW) return { widthPx: w, heightPx: h }
  const heightPx = Math.round((h * maxW) / w)
  return { widthPx: maxW, heightPx }
}

function readNaturalSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => reject(new Error('image_load_failed'))
    img.src = url
  })
}

export async function loadExportImage(url: string): Promise<LoadedExportImage | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    const type = imageTypeFromUrl(url)
    const { w, h } = await readNaturalSize(url)
    const { widthPx, heightPx } = scaleToMaxWidth(w, h, MAX_WIDTH_PX)
    return { bytes, widthPx, heightPx, type }
  } catch {
    return null
  }
}
