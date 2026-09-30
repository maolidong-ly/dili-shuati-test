import type { ChoiceQuestion } from '../types'

export function isAnswerCorrect(
  question: ChoiceQuestion,
  selected: number | number[] | null,
): boolean {
  if (selected === null) return false
  const kind = question.kind ?? 'single'
  if (kind === 'multiple') {
    const expected = [...(question.answerIndices ?? [])].sort((a, b) => a - b)
    const picked = (Array.isArray(selected) ? selected : [selected]).sort(
      (a, b) => a - b,
    )
    if (expected.length === 0 || picked.length !== expected.length) return false
    return expected.every((v, i) => v === picked[i])
  }
  return selected === question.answerIndex
}

export function correctIndicesForDisplay(question: ChoiceQuestion): number[] {
  if (question.kind === 'multiple') {
    return question.answerIndices ?? []
  }
  return question.answerIndex !== undefined ? [question.answerIndex] : []
}
