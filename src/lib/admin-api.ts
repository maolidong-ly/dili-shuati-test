import type { AdminProfileRow, WrongQuestionEntry } from '../types'
import { getSupabase } from './supabase'

export type AdminStudentReport = {
  profile: {
    id: string
    nickname: string
    status: string
    created_at: string
  }
  progress: Record<string, { answeredIds: string[]; correctIds: string[] }>
  wrong_book: WrongQuestionEntry[]
  saved_updated_at?: string
  question_stats: {
    attempted: number
    ever_correct: number
    accuracy: number
  }
  chapter_scores: Array<{
    chapter_id: string
    score: number
    completed_at: string
  }>
  recent_sessions: Array<{
    id: string
    unit_id: string | null
    started_at: string
    ended_at: string | null
    session_score: number | null
    answered_count: number
    correct_count: number
  }>
}

export async function adminListProfiles(
  adminPassphrase: string,
): Promise<AdminProfileRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_list_profiles', {
    p_admin_passphrase: adminPassphrase,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminProfileRow[]
}

export async function adminSetStatus(
  adminPassphrase: string,
  profileId: string,
  status: 'pending' | 'active' | 'disabled',
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('cloud_not_configured')
  const { error } = await supabase.rpc('admin_set_profile_status', {
    p_admin_passphrase: adminPassphrase,
    p_profile_id: profileId,
    p_status: status,
  })
  if (error) throw new Error(error.message)
}

export async function adminDeleteProfile(
  adminPassphrase: string,
  profileId: string,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('cloud_not_configured')
  const { error } = await supabase.rpc('admin_delete_profile', {
    p_admin_passphrase: adminPassphrase,
    p_profile_id: profileId,
  })
  if (error) throw new Error(error.message)
}

export type AdminQuestionAttemptRow = {
  question_id: string
  unit_id: string
  question_type: string
  stem: string
  sort_order: number
  attempt_count: number
  ever_correct: boolean
  last_answered_at: string | null
}

export async function adminGetStudentChapterAttempts(
  adminPassphrase: string,
  profileId: string,
  chapterId: string,
): Promise<AdminQuestionAttemptRow[]> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('cloud_not_configured')
  const { data, error } = await supabase.rpc('admin_get_student_chapter_attempts', {
    p_admin_passphrase: adminPassphrase,
    p_profile_id: profileId,
    p_chapter_id: chapterId,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminQuestionAttemptRow[]
}

export async function adminGetStudentReport(
  adminPassphrase: string,
  profileId: string,
): Promise<AdminStudentReport> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('cloud_not_configured')
  const { data, error } = await supabase.rpc('admin_get_student_report', {
    p_admin_passphrase: adminPassphrase,
    p_profile_id: profileId,
  })
  if (error) throw new Error(error.message)
  return data as AdminStudentReport
}
