import type { ChoiceQuestion, QuestionKind } from '../types'

const KIND_ORDER: Record<QuestionKind, number> = {
  single: 0,
  multiple: 1,
  judgment: 2,
}

export const KIND_LABELS: Record<QuestionKind, string> = {
  single: '单选题',
  multiple: '多选题',
  judgment: '判断题',
}

export function questionKind(q: ChoiceQuestion): QuestionKind {
  return q.kind ?? 'single'
}

/** 题干前是否已有「1.」「1、」等序号 */
export function stemHasLeadingIndex(stem: string): boolean {
  return /^\d+\s*[.．、]\s*/.test(stem.trim())
}

/** 刷题页展示：无序号时在题干前加「n. 」 */
export function formatStemWithIndex(indexOneBased: number, stem: string): string {
  const s = stem.trim()
  if (stemHasLeadingIndex(s)) return stem
  return `${indexOneBased}. ${stem}`
}

function idSortKey(id: string): number {
  const m =
    id.match(/-(?:single|multiple|judgment)-(\d+)$/i) ??
    id.match(/-q-?(\d+)(?:$|[^0-9])/) ??
    id.match(/-q(\d+)$/)
  return m ? Number.parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

/** 单选 → 多选 → 判断，同题型内按 id 序号 */
export function sortQuestionsByKind(questions: ChoiceQuestion[]): ChoiceQuestion[] {
  return [...questions].sort((a, b) => {
    const ka = KIND_ORDER[questionKind(a)]
    const kb = KIND_ORDER[questionKind(b)]
    if (ka !== kb) return ka - kb
    const diff = idSortKey(a.id) - idSortKey(b.id)
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id, 'zh-CN')
  })
}

export function groupQuestionsByKind(
  questions: ChoiceQuestion[],
): Record<QuestionKind, ChoiceQuestion[]> {
  const sorted = sortQuestionsByKind(questions)
  const out: Record<QuestionKind, ChoiceQuestion[]> = {
    single: [],
    multiple: [],
    judgment: [],
  }
  for (const q of sorted) {
    out[questionKind(q)].push(q)
  }
  return out
}

/** 该题在同题型列表中的序号（从 1 开始） */
export function indexWithinKind(
  questions: ChoiceQuestion[],
  questionId: string,
): number {
  const q = questions.find((x) => x.id === questionId)
  if (!q) return 1
  const kind = questionKind(q)
  const idx = questions.filter((x) => questionKind(x) === kind).findIndex((x) => x.id === questionId)
  return idx >= 0 ? idx + 1 : 1
}

export function nextQuestionIdForKind(
  unitId: string,
  kind: QuestionKind,
  existing: ChoiceQuestion[],
): string {
  const prefix = `${unitId}-${kind}-`
  let max = 0
  for (const q of existing) {
    if (questionKind(q) !== kind) continue
    if (q.id.startsWith(prefix)) {
      const n = Number.parseInt(q.id.slice(prefix.length), 10)
      if (!Number.isNaN(n)) max = Math.max(max, n)
    } else {
      const m = q.id.match(/-(\d+)$/)
      if (m && questionKind(q) === kind) max = Math.max(max, Number.parseInt(m[1], 10))
    }
  }
  return `${prefix}${String(max + 1).padStart(2, '0')}`
}

export function sortOrderForKind(
  kind: QuestionKind,
  indexOneBasedInKind: number,
): number {
  return KIND_ORDER[kind] * 1000 + indexOneBasedInKind
}
