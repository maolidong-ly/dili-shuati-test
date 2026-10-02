import { findQuestionGlobal } from '../data/curriculum'
import { loadMergedQuestionsForUnit } from './load-unit-questions'
import { applyQuestionMeta } from './question-meta'
import type { ChoiceQuestion } from '../types'

export type CrossUnitQuestionSource = {
  questionId: string
  unitId: string
  unitLabel: string
}

export type LoadedCrossUnitQuestion = {
  question: ChoiceQuestion
  unitId: string
  unitLabel: string
}

const unitCache = new Map<string, Promise<ChoiceQuestion[]>>()

function loadUnitQuestions(unitId: string): Promise<ChoiceQuestion[]> {
  let p = unitCache.get(unitId)
  if (!p) {
    p = loadMergedQuestionsForUnit(unitId)
      .then((list) => applyQuestionMeta(list))
      .catch(() => [] as ChoiceQuestion[])
    unitCache.set(unitId, p)
  }
  return p
}

/** 错题本跨单元重练：静态 + 云端题库 */
export async function loadCrossUnitQuestions(
  sources: CrossUnitQuestionSource[],
): Promise<LoadedCrossUnitQuestion[]> {
  const out: LoadedCrossUnitQuestion[] = []
  for (const src of sources) {
    const staticHit = findQuestionGlobal(src.questionId)
    if (staticHit) {
      out.push({
        question: staticHit.question,
        unitId: staticHit.unitId,
        unitLabel: staticHit.unitLabel,
      })
      continue
    }
    const list = await loadUnitQuestions(src.unitId)
    const q = list.find((item) => item.id === src.questionId)
    if (q) {
      out.push({
        question: q,
        unitId: src.unitId,
        unitLabel: src.unitLabel,
      })
    }
  }
  return out
}
