import { resolveQuizUnit } from '../data/curriculum'
import { sortQuestionsByKind } from './question-display'
import { fetchCloudQuestionsForUnit, mergeQuestionLists } from './questions-cloud'
import { isCloudEnabled } from './supabase'
import type { ChoiceQuestion } from '../types'

/** 学生端 / 后台：静态 + 云端合并，并按题型排序 */
export async function loadMergedQuestionsForUnit(
  unitId: string,
): Promise<ChoiceQuestion[]> {
  const local = resolveQuizUnit(unitId)?.questions ?? []
  if (!isCloudEnabled()) {
    return sortQuestionsByKind([...local])
  }
  const cloud = await fetchCloudQuestionsForUnit(unitId)
  const merged = mergeQuestionLists(local, cloud)
  return sortQuestionsByKind(merged)
}
