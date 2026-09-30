import type { Chapter } from '../types'
import { getChapterProgress, progressTotals } from './storage'

function collectUnitIds(ch: Chapter): string[] {
  return ch.questions.length > 0
    ? [ch.id, ...ch.sections.map((s) => s.id)]
    : ch.sections.map((s) => s.id)
}

/** 章节进度：按各节 progress 汇总；可选只统计仍在题库中的题 */
export function getAggregatedChapterProgress(
  ch: Chapter,
  validQuestionIds?: Set<string>,
) {
  const unitIds = collectUnitIds(ch)

  const answeredIds: string[] = []
  const correctIds: string[] = []
  for (const id of unitIds) {
    const p = getChapterProgress(id)
    answeredIds.push(...p.answeredIds)
    correctIds.push(...p.correctIds)
  }

  if (!validQuestionIds || validQuestionIds.size === 0) {
    return progressTotals({ answeredIds, correctIds })
  }

  const answered = [...new Set(answeredIds)].filter((id) =>
    validQuestionIds.has(id),
  )
  const correct = [...new Set(correctIds)].filter(
    (id) => validQuestionIds.has(id) && answered.includes(id),
  )
  return progressTotals({ answeredIds: answered, correctIds: correct })
}

export function getSectionQuestionCount(section: { questions: unknown[] }) {
  return section.questions.length
}
