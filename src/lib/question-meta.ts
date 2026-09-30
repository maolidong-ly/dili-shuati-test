import type { ChoiceQuestion, QuestionMetaRow, StarLevel } from '../types'
import { getSupabase, isCloudEnabled } from './supabase'

const CACHE_KEY = 'geoquiz.question-meta.v1'

let memoryCache: Record<string, StarLevel> | null = null

function readCache(): Record<string, StarLevel> {
  if (memoryCache) return memoryCache
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    memoryCache = JSON.parse(raw) as Record<string, StarLevel>
    return memoryCache
  } catch {
    return {}
  }
}

function writeCache(map: Record<string, StarLevel>) {
  memoryCache = map
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(map))
}

/** 启动时拉取老师后台设置的星级（需 Supabase question_meta 表） */
export async function refreshQuestionMetaFromCloud(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const { data, error } = await supabase.from('question_meta').select('question_id, stars')
  if (error || !data) return

  const map: Record<string, StarLevel> = {}
  for (const row of data as QuestionMetaRow[]) {
    if (row.stars >= 1 && row.stars <= 5) {
      map[row.question_id] = row.stars as StarLevel
    }
  }
  writeCache(map)
}

export function getQuestionMetaMap(): Record<string, StarLevel> {
  return readCache()
}

export function getEffectiveStars(q: ChoiceQuestion): StarLevel | undefined {
  const cloud = readCache()[q.id]
  if (cloud) return cloud
  return q.stars
}

export function applyQuestionMeta(questions: ChoiceQuestion[]): ChoiceQuestion[] {
  const map = readCache()
  return questions.map((q) => {
    const stars = map[q.id] ?? q.stars
    return stars === q.stars ? q : { ...q, stars }
  })
}

export function isCloudMetaEnabled(): boolean {
  return isCloudEnabled()
}
