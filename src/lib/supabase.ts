import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { LeaderboardRow, LocalProfile, RegisterResult } from '../types'
import { getDeviceId } from './device-id'
import { getOrCreateDevProfile, isDevProfileRestored } from './dev-profiles'
import { mapRpcError, messageForCode } from './rpc-errors'
import { getAllProgress } from './storage'
import { pushUserState } from './user-sync'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isCloudEnabled(): boolean {
  return Boolean(url && anonKey)
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isCloudEnabled()) return null
  if (!client) {
    client = createClient(url!, anonKey!)
  }
  return client
}

function validateNickname(trimmed: string): RegisterResult | null {
  if (trimmed.length < 2 || trimmed.length > 16) {
    return {
      ok: false,
      code: 'invalid_nickname',
      message: messageForCode('invalid_nickname'),
    }
  }
  return null
}

function devLogin(trimmed: string, passphrase: string): RegisterResult {
  const devPass = import.meta.env.VITE_DEV_ACCESS_PASSPHRASE as string | undefined
  if (!devPass) {
    return {
      ok: false,
      code: 'cloud_not_configured',
      message:
        '未配置云数据库。跨设备续刷需 Supabase；本地请设置 VITE_DEV_ACCESS_PASSPHRASE',
    }
  }
  if (passphrase !== devPass) {
    return {
      ok: false,
      code: 'invalid_passphrase',
      message: import.meta.env.DEV
        ? '访问口令不正确（本地默认见 .env 中 VITE_DEV_ACCESS_PASSPHRASE）'
        : '访问口令不正确',
    }
  }
  const restored = isDevProfileRestored(trimmed)
  const profile = getOrCreateDevProfile(trimmed)
  return { ok: true, profile, restored }
}

export async function applyForNickname(
  passphrase: string,
  nickname: string,
): Promise<RegisterResult> {
  const trimmed = nickname.trim()
  const bad = validateNickname(trimmed)
  if (bad) return bad

  const supabase = getSupabase()
  if (!supabase) return devLogin(trimmed, passphrase)

  const { error } = await supabase.rpc('apply_for_nickname', {
    p_passphrase: passphrase,
    p_nickname: trimmed,
  })

  if (error) {
    const code = mapRpcError(error.message)
    return { ok: false, code, message: messageForCode(code) }
  }

  return {
    ok: false,
    code: 'pending_approval',
    message: '申请已提交，请等待老师审核后再登录',
  }
}

export async function enterWithDevice(
  passphrase: string,
  nickname: string,
): Promise<RegisterResult> {
  const trimmed = nickname.trim()
  const bad = validateNickname(trimmed)
  if (bad) return bad

  const supabase = getSupabase()
  if (!supabase) return devLogin(trimmed, passphrase)

  const deviceId = getDeviceId()
  const { data, error } = await supabase.rpc('enter_with_device', {
    p_passphrase: passphrase,
    p_nickname: trimmed,
    p_device_id: deviceId,
  })

  if (error) {
    const code = mapRpcError(error.message)
    return { ok: false, code, message: messageForCode(code) }
  }

  const row = data as {
    id: string
    nickname: string
    sync_token: string
    session_token: string
    device_id: string
  }
  const profile: LocalProfile = {
    userId: row.id,
    nickname: row.nickname,
    syncToken: row.sync_token,
    sessionToken: row.session_token,
    deviceId: row.device_id,
    registeredAt: new Date().toISOString(),
  }
  return { ok: true, profile, restored: true }
}

/** @deprecated 使用 applyForNickname / enterWithDevice */
export async function registerNickname(
  passphrase: string,
  nickname: string,
): Promise<RegisterResult> {
  return enterWithDevice(passphrase, nickname)
}

export async function releaseDeviceSession(profile: LocalProfile): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || !profile.deviceId) return
  await supabase.rpc('release_device_session', {
    p_user_id: profile.userId,
    p_sync_token: profile.syncToken,
    p_device_id: profile.deviceId,
  })
}

export async function syncProgress(profile: LocalProfile): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const stateOk = await pushUserState(profile)

  const all = getAllProgress()
  const rows = Object.entries(all).map(([chapterId, p]) => ({
    p_user_id: profile.userId,
    p_sync_token: profile.syncToken,
    p_chapter_id: chapterId,
    p_answered: p.answeredIds.length,
    p_correct: p.correctIds.length,
  }))

  let statsOk = true
  for (const row of rows) {
    const { error } = await supabase.rpc('upsert_chapter_stats', row)
    if (error) {
      console.warn('stats sync failed', row.p_chapter_id, error.message)
      statsOk = false
    }
  }
  return stateOk && statsOk
}

export type ChapterScoreRow = {
  nickname: string
  chapterId: string
  score: number
  completedAt: string
}

export type GlobalAccuracyRow = {
  nickname: string
  attempted: number
  correct: number
  accuracy: number
}

export async function fetchChapterScoreboard(
  chapterId: string,
): Promise<ChapterScoreRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('leaderboard_chapter_scores', {
    p_chapter_id: chapterId,
  })
  if (error || !data) return []
  return (data as Array<{
    nickname: string
    chapter_id: string
    score: number
    completed_at: string
  }>).map((r) => ({
    nickname: r.nickname,
    chapterId: r.chapter_id,
    score: Number(r.score),
    completedAt: r.completed_at,
  }))
}

export async function fetchGlobalAccuracyBoard(): Promise<GlobalAccuracyRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('leaderboard_global_accuracy')
  if (error || !data) return []
  return (data as GlobalAccuracyRow[]).map((r) => ({
    nickname: r.nickname,
    attempted: r.attempted,
    correct: r.correct,
    accuracy: Number(r.accuracy),
  }))
}

export async function fetchLeaderboard(
  chapterId: string | null,
): Promise<LeaderboardRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase.rpc('leaderboard_stats', {
    p_chapter_id: chapterId,
  })

  if (error || !data) return []

  return (data as Array<{
    nickname: string
    chapter_id: string
    answered: number
    correct: number
  }>).map((r) => ({
    nickname: r.nickname,
    chapterId: r.chapter_id,
    answered: r.answered,
    correct: r.correct,
    accuracy: r.answered > 0 ? r.correct / r.answered : 0,
  }))
}
