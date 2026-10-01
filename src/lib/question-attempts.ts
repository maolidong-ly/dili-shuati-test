import type { LocalProfile } from '../types'
import { getSupabase, isCloudEnabled } from './supabase'

const KEY = 'geoquiz.question-attempts.v1'

type AttemptStore = Record<string, number>

function readLocal(): AttemptStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as AttemptStore
  } catch {
    return {}
  }
}

function writeLocal(store: AttemptStore) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

export function getLocalAttemptCount(questionId: string): number {
  return readLocal()[questionId] ?? 0
}

export function clearLocalAttempts() {
  localStorage.removeItem(KEY)
}

export function incrementLocalAttempt(questionId: string): number {
  const store = readLocal()
  const next = (store[questionId] ?? 0) + 1
  store[questionId] = next
  writeLocal(store)
  return next
}

export function getAttemptCountForQuestions(
  questionIds: string[],
  cloudMap: Record<string, number>,
): Record<string, number> {
  const local = readLocal()
  const out: Record<string, number> = {}
  for (const id of questionIds) {
    out[id] = Math.max(cloudMap[id] ?? 0, local[id] ?? 0)
  }
  return out
}

export async function fetchUnitAttemptCounts(
  profile: LocalProfile,
  unitId: string,
): Promise<Record<string, number>> {
  if (!isCloudEnabled()) return readLocal()
  const supabase = getSupabase()
  if (!supabase) return readLocal()

  const { data, error } = await supabase.rpc('get_user_unit_question_attempts', {
    p_user_id: profile.userId,
    p_sync_token: profile.syncToken,
    p_unit_id: unitId,
  })
  if (error || !data || !Array.isArray(data)) return readLocal()

  const cloud: Record<string, number> = {}
  for (const row of data as { question_id: string; attempt_count: number }[]) {
    cloud[row.question_id] = row.attempt_count ?? 0
  }
  return getAttemptCountForQuestions(Object.keys(cloud), cloud)
}
