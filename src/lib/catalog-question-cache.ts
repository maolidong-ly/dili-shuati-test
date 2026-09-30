import { loadMergedQuestionsForUnit } from './load-unit-questions'
import type { ChoiceQuestion } from '../types'

const cache = new Map<string, ChoiceQuestion[]>()

export function invalidateCatalogQuestionCache() {
  cache.clear()
}

export async function getMergedQuestionsCached(
  unitId: string,
): Promise<ChoiceQuestion[]> {
  const hit = cache.get(unitId)
  if (hit) return hit
  const questions = await loadMergedQuestionsForUnit(unitId)
  cache.set(unitId, questions)
  return questions
}
