import type { LocalProfile } from '../types'
import { getSupabase, isCloudEnabled } from './supabase'

export async function startCloudPracticeSession(
  profile: LocalProfile,
  unitId: string,
): Promise<string | null> {
  if (!isCloudEnabled()) return null
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('start_practice_session', {
    p_user_id: profile.userId,
    p_sync_token: profile.syncToken,
    p_unit_id: unitId,
  })
  if (error || !data) return null
  return data as string
}

export async function recordCloudSessionAnswer(
  profile: LocalProfile,
  sessionId: string,
  questionId: string,
  correct: boolean,
  chapterId: string,
): Promise<void> {
  if (!isCloudEnabled()) return
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.rpc('record_session_answer', {
    p_user_id: profile.userId,
    p_sync_token: profile.syncToken,
    p_session_id: sessionId,
    p_question_id: questionId,
    p_correct: correct,
    p_chapter_id: chapterId,
  })
}

export async function finishCloudPracticeSession(
  profile: LocalProfile,
  sessionId: string,
): Promise<{ session_score: number; answered: number; correct: number } | null> {
  if (!isCloudEnabled()) return null
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.rpc('finish_practice_session', {
    p_user_id: profile.userId,
    p_sync_token: profile.syncToken,
    p_session_id: sessionId,
  })
  if (error || !data) return null
  const row = data as { session_score: number; answered: number; correct: number }
  return row
}
