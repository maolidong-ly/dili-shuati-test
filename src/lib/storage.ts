import type { ChapterProgress, LocalProfile } from '../types'

const KEYS = {
  profile: 'geoquiz.profile.v1',
  progress: 'geoquiz.progress.v1',
  accessOk: 'geoquiz.access.v1',
} as const

type ProgressStore = Record<string, ChapterProgress>

function readProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(KEYS.progress)
    if (!raw) return {}
    return JSON.parse(raw) as ProgressStore
  } catch {
    return {}
  }
}

function writeProgress(store: ProgressStore) {
  localStorage.setItem(KEYS.progress, JSON.stringify(store))
}

export function getProfile(): LocalProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.profile)
    if (!raw) return null
    return JSON.parse(raw) as LocalProfile
  } catch {
    return null
  }
}

export function saveProfile(profile: LocalProfile) {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile))
}

export function clearSession() {
  localStorage.removeItem(KEYS.profile)
  localStorage.removeItem(KEYS.accessOk)
}

export function markAccessGranted() {
  localStorage.setItem(KEYS.accessOk, '1')
}

export function hasAccessGranted(): boolean {
  return localStorage.getItem(KEYS.accessOk) === '1'
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
