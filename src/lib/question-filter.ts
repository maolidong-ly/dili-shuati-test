import type { ChoiceQuestion, StarFilter, StarLevel } from '../types'
import { applyQuestionMeta, getEffectiveStars } from './question-meta'

export function filterQuestions(
  questions: ChoiceQuestion[],
  starFilter: StarFilter,
  questionIds?: string[],
): ChoiceQuestion[] {
  let list = applyQuestionMeta(questions)

  if (questionIds && questionIds.length > 0) {
    const set = new Set(questionIds)
    list = list.filter((q) => set.has(q.id))
  }

  if (starFilter === 'all') return list

  const allowed = new Set<StarLevel>(starFilter)
  return list.filter((q) => {
    const stars = getEffectiveStars(q)
    return stars !== undefined && allowed.has(stars)
  })
}

export function countByStar(questions: ChoiceQuestion[]): Record<StarLevel, number> {
  const enriched = applyQuestionMeta(questions)
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<StarLevel, number>
  for (const q of enriched) {
    const s = getEffectiveStars(q)
    if (s) counts[s] += 1
  }
  return counts
}

export function starLabel(level: StarLevel): string {
  return '★'.repeat(level)
}
