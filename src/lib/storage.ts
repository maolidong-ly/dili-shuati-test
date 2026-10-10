import type { ChapterProgress, LocalProfile } from '../types'
import { detectStorageTier, storageForTier } from './browser-storage'

const KEYS = {
  profile: 'geoquiz.profile.v1',
  progress: 'geoquiz.progress.v1',
  accessOk: 'geoquiz.access.v1',
} as const

type ProgressStore = Record<string, ChapterProgress>

function getStorage(): Storage | null {
  return storageForTier(detectStorageTier())
}

function readProgress(): ProgressStore {
  try {
    const s = getStorage()
    if (!s) return {}
    const raw = s.getItem(KEYS.progress)
    if (!raw) return {}
    return JSON.parse(raw) as ProgressStore
  } catch {
    return {}
  }
}

function writeProgress(data: ProgressStore) {
  const s = getStorage()
  if (!s) return
  s.setItem(KEYS.progress, JSON.stringify(data))
}

export function getProfile(): LocalProfile | null {
  try {
    const s = getStorage()
    if (!s) return null
    const raw = s.getItem(KEYS.profile)
    if (!raw) return null
    return JSON.parse(raw) as LocalProfile
  } catch {
    return null
  }
}

export function saveProfile(profile: LocalProfile) {
  const s = getStorage()
  if (!s) throw new Error('storage_unavailable')
  s.setItem(KEYS.profile, JSON.stringify(profile))
}

export function clearSession() {
  const s = getStorage()
  if (!s) return
  s.removeItem(KEYS.profile)
  s.removeItem(KEYS.accessOk)
}

/** 切换账号时清空本机刷题进度（避免串到新账号） */
export function resetLocalQuizState() {
  writeProgress({})
}

export function markAccessGranted() {
  const s = getStorage()
  if (!s) throw new Error('storage_unavailable')
  s.setItem(KEYS.accessOk, '1')
}

export function hasAccessGranted(): boolean {
  const s = getStorage()
  if (!s) return false
  return s.getItem(KEYS.accessOk) === '1'
}

export function isLoginStorageReady(): boolean {
  return detectStorageTier() !== 'none'
}

export function getChapterProgress(chapterId: string): ChapterProgress {
  const store = readProgress()
  return store[chapterId] ?? { answeredIds: [], correctIds: [] }
}

export function recordAnswer(
  unitId: string,
  questionId: string,
  correct: boolean,
  options?: { allowRetry?: boolean },
): ChapterProgress {
  const store = readProgress()
  const current = store[unitId] ?? { answeredIds: [], correctIds: [] }
  const already = current.answeredIds.includes(questionId)

  if (!already) {
    current.answeredIds = [...current.answeredIds, questionId]
    if (correct) {
      current.correctIds = [...current.correctIds, questionId]
    }
  } else if (options?.allowRetry) {
    if (correct && !current.correctIds.includes(questionId)) {
      current.correctIds = [...current.correctIds, questionId]
    }
  }

  store[unitId] = current
  writeProgress(store)
  return current
}

export function getAllProgress(): ProgressStore {
  return readProgress()
}

export function replaceAllProgress(store: ProgressStore) {
  writeProgress(store)
}

export function progressTotals(progress: ChapterProgress) {
  return {
    answered: progress.answeredIds.length,
    correct: progress.correctIds.length,
    accuracy:
      progress.answeredIds.length === 0
        ? 0
        : progress.correctIds.length / progress.answeredIds.length,
  }
}
