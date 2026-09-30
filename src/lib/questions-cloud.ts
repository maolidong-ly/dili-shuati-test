import { allChapters } from '../data/curriculum'
import type { ChoiceQuestion, QuestionKind } from '../types'
import { getSupabase, isCloudEnabled } from './supabase'

type DbQuestion = {
  id: string
  unit_id: string
  question_type: QuestionKind
  stem: string
  options: string[]
  correct_single: number | null
  correct_multiple: number[] | null
  explanation: string | null
}

function rowToQuestion(row: DbQuestion): ChoiceQuestion {
  const options = Array.isArray(row.options) ? row.options : []
  if (row.question_type === 'multiple') {
    return {
      id: row.id,
      stem: row.stem,
      options,
      kind: 'multiple',
      answerIndices: row.correct_multiple ?? [],
      explanation: row.explanation ?? undefined,
    }
  }
  if (row.question_type === 'judgment') {
    return {
      id: row.id,
      stem: row.stem,
      options: options.length >= 2 ? options : ['对', '错'],
      kind: 'judgment',
      answerIndex: (row.correct_single ?? 0) as 0 | 1,
      explanation: row.explanation ?? undefined,
    }
  }
  return {
    id: row.id,
    stem: row.stem,
    options,
    kind: 'single',
    answerIndex: (row.correct_single ?? 0) as 0 | 1 | 2 | 3,
    explanation: row.explanation ?? undefined,
  }
}

async function fetchCloudQuestionsForUnitId(unitId: string): Promise<ChoiceQuestion[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('list_questions_for_unit', {
    p_unit_id: unitId,
  })
  if (error || !data) return []
  return (data as DbQuestion[]).map(rowToQuestion)
}

export async function fetchCloudQuestionsForUnit(
  unitId: string,
): Promise<ChoiceQuestion[]> {
  if (!isCloudEnabled()) return []

  const chapter = allChapters.find((c) => c.id === unitId)
  if (chapter) {
    const unitIds = [
      chapter.id,
      ...chapter.sections.map((s) => s.id),
    ]
    const batches = await Promise.all(
      unitIds.map((id) => fetchCloudQuestionsForUnitId(id)),
    )
    return mergeQuestionLists([], batches.flat())
  }

  return fetchCloudQuestionsForUnitId(unitId)
}

export function mergeQuestionLists(
  local: ChoiceQuestion[],
  cloud: ChoiceQuestion[],
): ChoiceQuestion[] {
  const map = new Map<string, ChoiceQuestion>()
  for (const q of local) map.set(q.id, q)
  for (const q of cloud) map.set(q.id, q)
  return [...map.values()]
}
