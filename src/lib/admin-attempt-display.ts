import type { AdminQuestionAttemptRow } from './admin-api'
import type { QuestionKind } from '../types'

const KIND_ORDER: Record<QuestionKind, number> = {
  single: 0,
  multiple: 1,
  judgment: 2,
}

function kindOf(row: AdminQuestionAttemptRow): QuestionKind {
  const t = row.question_type
  if (t === 'multiple' || t === 'judgment') return t
  return 'single'
}

function idSortKey(id: string): number {
  const m =
    id.match(/-(?:single|multiple|judgment)-(\d+)$/i) ??
    id.match(/-q-?(\d+)/)
  return m ? Number.parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

export function sortAttemptRows(rows: AdminQuestionAttemptRow[]): AdminQuestionAttemptRow[] {
  return [...rows].sort((a, b) => {
    const ka = KIND_ORDER[kindOf(a)]
    const kb = KIND_ORDER[kindOf(b)]
    if (ka !== kb) return ka - kb
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    const diff = idSortKey(a.question_id) - idSortKey(b.question_id)
    if (diff !== 0) return diff
    return a.question_id.localeCompare(b.question_id, 'zh-CN')
  })
}

export function groupAttemptsByUnitAndKind(
  rows: AdminQuestionAttemptRow[],
): Map<string, Record<QuestionKind, AdminQuestionAttemptRow[]>> {
  const sorted = sortAttemptRows(rows)
  const out = new Map<string, Record<QuestionKind, AdminQuestionAttemptRow[]>>()
  for (const row of sorted) {
    let unit = out.get(row.unit_id)
    if (!unit) {
      unit = { single: [], multiple: [], judgment: [] }
      out.set(row.unit_id, unit)
    }
    unit[kindOf(row)].push(row)
  }
  return out
}

export function sectionSortKey(unitId: string): number {
  const m = unitId.match(/-s(\d+)$/)
  return m ? Number.parseInt(m[1], 10) : 0
}
