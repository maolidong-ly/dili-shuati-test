import type { LocalProfile, WrongQuestionEntry } from '../types'
import { mergeProgress, mergeWrongBook } from './merge-state'
import { getAllProgress, replaceAllProgress } from './storage'
import { getSupabase, isCloudEnabled } from './supabase'
import { listWrongQuestions, replaceAllWrongQuestions } from './wrong-book'

export async function pullAndMergeUserState(
  profile: LocalProfile,
  mode: 'merge' | 'replace' = 'merge',
): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const { data, error } = await supabase.rpc('get_user_saved_state', {
    p_user_id: profile.userId,
    p_sync_token: profile.syncToken,
  })

  if (error || !data) return false

  const payload = data as {
    progress: Record<string, { answeredIds: string[]; correctIds: string[] }>
    wrong_book: WrongQuestionEntry[]
  }

  if (mode === 'replace') {
    replaceAllProgress(payload.progress ?? {})
    replaceAllWrongQuestions(payload.wrong_book ?? [])
  } else {
    replaceAllProgress(
      mergeProgress(getAllProgress(), payload.progress ?? {}),
    )
    replaceAllWrongQuestions(
      mergeWrongBook(listWrongQuestions(), payload.wrong_book ?? []),
    )
  }
  return true
}

export async function pushUserState(profile: LocalProfile): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase.rpc('upsert_user_saved_state', {
    p_user_id: profile.userId,
    p_sync_token: profile.syncToken,
    p_progress: getAllProgress(),
    p_wrong_book: listWrongQuestions(),
  })

  return !error
}

export function canSyncAcrossDevices(): boolean {
  return isCloudEnabled()
}
