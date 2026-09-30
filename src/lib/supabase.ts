import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { LeaderboardRow, LocalProfile, RegisterResult } from '../types'
import { getOrCreateDevProfile, isDevProfileRestored } from './dev-profiles'
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

const ERROR_MESSAGES: Record<string, string> = {
  invalid_passphrase: '访问口令不正确',
  invalid_nickname: '昵称需 2～16 个字符，勿含空格首尾',
  nickname_taken: '该昵称已被使用，请换一个',
  quota_full: '注册人数已达上限（100 人），请联系老师',
}

export async function registerNickname(
  passphrase: string,
  nickname: string,
): Promise<RegisterResult> {
  const supabase = getSupabase()
  const trimmed = nickname.trim()

  if (trimmed.length < 2 || trimmed.length > 16) {
    return {
      ok: false,
      code: 'invalid_nickname',
      message: ERROR_MESSAGES.invalid_nickname,
    }
  }

  if (!supabase) {
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

  const { data, error } = await supabase.rpc('enter_with_nickname', {
    p_passphrase: passphrase,
    p_nickname: trimmed,
  })

  if (error) {
    const code = error.message.includes('invalid_passphrase')
      ? 'invalid_passphrase'
      : error.message.includes('nickname_taken')
        ? 'nickname_taken'
        : error.message.includes('quota_full')
          ? 'quota_full'
          : error.message.includes('invalid_nickname')
            ? 'invalid_nickname'
            : 'unknown'
    return {
      ok: false,
      code,
      message: ERROR_MESSAGES[code] ?? error.message,
    }
  }

  const row = data as {
    id: string
    nickname: string
    sync_token: string
    restored?: boolean
  }
  const profile: LocalProfile = {
    userId: row.id,
    nickname: row.nickname,
    syncToken: row.sync_token,
    registeredAt: new Date().toISOString(),
  }
  return { ok: true, profile, restored: Boolean(row.restored) }
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
