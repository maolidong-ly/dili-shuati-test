export type QuestionRichSegment =
  | { kind: 'text'; value: string }
  | { kind: 'image'; alt: string; url: string }

const IMAGE_MD = /!\[([^\]]*)\]\(([^)\s]+)\)/g

/** 解析题干/选项/解析中的 Markdown 图片 ![说明](url) */
export function parseQuestionRichText(input: string): QuestionRichSegment[] {
  if (!input) return [{ kind: 'text', value: '' }]
  const segments: QuestionRichSegment[] = []
  let last = 0
  for (const m of input.matchAll(IMAGE_MD)) {
    const start = m.index ?? 0
    if (start > last) {
      segments.push({ kind: 'text', value: input.slice(last, start) })
    }
    segments.push({
      kind: 'image',
      alt: m[1] || '配图',
      url: m[2],
    })
    last = start + m[0].length
  }
  if (last < input.length) {
    segments.push({ kind: 'text', value: input.slice(last) })
  }
  if (segments.length === 0) {
    segments.push({ kind: 'text', value: input })
  }
  return segments
}

export function stripQuestionImagesForPreview(text: string, maxLen = 56): string {
  const plain = text.replace(IMAGE_MD, '[图]').replace(/\s+/g, ' ').trim()
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen)}…`
}
