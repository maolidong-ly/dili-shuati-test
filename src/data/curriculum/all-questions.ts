import type { ChoiceQuestion } from '../../types'
import { getQuizUnitLabel, resolveQuizUnit } from './quiz-unit'
import { textbooks } from './pep2019'
import { topicCategories } from './topics'

export type QuestionRef = {
  question: ChoiceQuestion
  unitId: string
  unitLabel: string
}

export function findQuestionGlobal(questionId: string): QuestionRef | undefined {
  for (const book of textbooks) {
    for (const chapter of book.chapters) {
      for (const section of chapter.sections) {
        const q = section.questions.find((item) => item.id === questionId)
        if (q) {
          const unit = resolveQuizUnit(section.id)!
          return {
            question: q,
            unitId: section.id,
            unitLabel: getQuizUnitLabel(unit),
          }
        }
      }
      const q = chapter.questions.find((item) => item.id === questionId)
      if (q) {
        const unit = resolveQuizUnit(chapter.id)!
        return { question: q, unitId: chapter.id, unitLabel: getQuizUnitLabel(unit) }
      }
    }
  }
  for (const cat of topicCategories) {
    for (const topic of cat.topics) {
      const q = topic.questions.find((item) => item.id === questionId)
      if (q) {
        const unit = resolveQuizUnit(topic.id)!
        return {
          question: q,
          unitId: topic.id,
          unitLabel: getQuizUnitLabel(unit),
        }
      }
    }
  }
  return undefined
}

export function collectQuestionsByIds(ids: string[]): QuestionRef[] {
  const out: QuestionRef[] = []
  for (const id of ids) {
    const hit = findQuestionGlobal(id)
    if (hit) out.push(hit)
  }
  return out
}
