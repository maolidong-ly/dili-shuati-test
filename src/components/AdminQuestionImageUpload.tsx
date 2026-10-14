import { useRef, useState } from 'react'
import {
  adminUploadQuestionImage,
  appendImageMarkdown,
} from '../lib/question-images'

type Props = {
  unitId: string
  disabled?: boolean
  alt?: string
  onInsert: (nextText: string) => void
  currentText: string
}

export function AdminQuestionImageUpload({
  unitId,
  disabled,
  alt = '配图',
  onInsert,
  currentText,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  async function onFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setErr('')
    try {
      const url = await adminUploadQuestionImage(unitId, file)
      onInsert(appendImageMarkdown(currentText, url, alt))
    } catch (e) {
      setErr(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="admin-q-image-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        disabled={disabled || uploading || !unitId}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className="btn ghost small"
        disabled={disabled || uploading || !unitId}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? '上传中…' : '插入图片'}
      </button>
      {err ? <span className="error small inline-err">{err}</span> : null}
    </div>
  )
}
