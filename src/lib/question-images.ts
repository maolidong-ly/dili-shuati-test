import { getSupabase, isCloudEnabled } from './supabase'

const BUCKET = 'question-images'
const MAX_BYTES = 10 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

function storageObjectKey(originalName: string): string {
  const id = crypto.randomUUID()
  const m = /\.([a-zA-Z0-9]{1,8})$/.exec(originalName.trim())
  const ext = m ? `.${m[1].toLowerCase()}` : '.png'
  return `${id}${ext}`
}

export function questionImagePublicUrl(storagePath: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!base) return null
  const encoded = storagePath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')
  return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`
}

export function imageMarkdown(url: string, alt = '配图'): string {
  return `![${alt}](${url})`
}

export function appendImageMarkdown(text: string, url: string, alt = '配图'): string {
  const snippet = imageMarkdown(url, alt)
  const trimmed = text.trimEnd()
  if (!trimmed) return snippet
  return `${trimmed}\n\n${snippet}`
}

export async function adminUploadQuestionImage(
  unitId: string,
  file: File,
): Promise<string> {
  if (!isCloudEnabled()) throw new Error('cloud_not_configured')
  if (!unitId.trim()) throw new Error('请先选择单元/章节')
  if (file.size > MAX_BYTES) throw new Error('图片不能超过 10MB')
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    throw new Error('仅支持 JPG、PNG、GIF、WebP 图片')
  }

  const supabase = getSupabase()
  if (!supabase) throw new Error('cloud_not_configured')

  const safeUnit = unitId.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80)
  const objectKey = storageObjectKey(file.name)
  const storagePath = `${safeUnit}/${objectKey}`

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/png',
  })
  if (error) throw new Error(error.message)

  const url = questionImagePublicUrl(storagePath)
  if (!url) throw new Error('upload_ok_but_url_failed')
  return url
}
