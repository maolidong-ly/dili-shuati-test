import type { Chapter } from '../types'
import { getChapterProgress, progressTotals } from './storage'

/** 章节进度：按各节 progress 汇总（刷题以节为单位存储） */
export function getAggregatedChapterProgress(ch: Chapter) {
  const unitIds =
    ch.questions.length > 0
      ? [ch.id, ...ch.sections.map((s) => s.id)]
      : ch.sections.map((s) => s.id)

  const answeredIds: string[] = []
  const correctIds: string[] = []
  for (const id of unitIds) {
    const p = getChapterProgress(id)
    answeredIds.push(...p.answeredIds)
    correctIds.push(...p.correctIds)
  }
  return progressTotals({ answeredIds, correctIds })
}

export function getSectionQuestionCount(section: { questions: unknown[] }) {
  return section.questions.length
}
