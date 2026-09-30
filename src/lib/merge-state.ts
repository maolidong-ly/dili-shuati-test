import type { ChapterProgress, WrongQuestionEntry } from '../types'

export type ProgressStore = Record<string, ChapterProgress>

export function mergeProgress(
  local: ProgressStore,
  remote: ProgressStore,
): ProgressStore {
  const out: ProgressStore = { ...local }
  for (const [unitId, remoteP] of Object.entries(remote)) {
    const localP = out[unitId] ?? { answeredIds: [], correctIds: [] }
    const answeredIds = [...new Set([...localP.answeredIds, ...remoteP.answeredIds])]
    const correctIds = [
      ...new Set([...localP.correctIds, ...remoteP.correctIds]),
    ].filter((id) => answeredIds.includes(id))
    out[unitId] = { answeredIds, correctIds }
  }
  return out
}

export function mergeWrongBook(
  local: WrongQuestionEntry[],
  remote: WrongQuestionEntry[],
): WrongQuestionEntry[] {
  const map = new Map<string, WrongQuestionEntry>()
  for (const e of [...remote, ...local]) {
    const prev = map.get(e.questionId)
    if (!prev) {
      map.set(e.questionId, e)
      continue
    }
    map.set(e.questionId, {
      ...prev,
      ...e,
      wrongCount: Math.max(prev.wrongCount, e.wrongCount),
      lastWrongAt:
        new Date(prev.lastWrongAt) > new Date(e.lastWrongAt)
          ? prev.lastWrongAt
          : e.lastWrongAt,
    })
  }
  return [...map.values()]
}
