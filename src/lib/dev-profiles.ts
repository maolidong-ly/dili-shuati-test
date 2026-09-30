import type { LocalProfile } from '../types'
import { randomId } from './random-id'

const KEY = 'geoquiz.dev-nickname-profiles.v1'

type MapStore = Record<string, LocalProfile>

function read(): MapStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as MapStore
  } catch {
    return {}
  }
}

function write(store: MapStore) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

/** 未接 Supabase 时：同昵称在本机复用同一匿名 id（不能跨设备） */
export function getOrCreateDevProfile(nickname: string): LocalProfile {
  const nick = nickname.trim()
  const store = read()
  const existing = store[nick]
  if (existing) return existing

  const profile: LocalProfile = {
    userId: randomId(),
    nickname: nick,
    syncToken: randomId(),
    registeredAt: new Date().toISOString(),
  }
  store[nick] = profile
  write(store)
  return profile
}

export function isDevProfileRestored(nickname: string): boolean {
  return Boolean(read()[nickname.trim()])
}
