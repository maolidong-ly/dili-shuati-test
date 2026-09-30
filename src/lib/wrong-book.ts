import type { WrongBookKind, WrongQuestionEntry } from '../types'

const KEY = 'geoquiz.wrong-book.v1'

export function inferWrongBookKind(unitId: string): WrongBookKind {
  return unitId.startsWith('topic-') ? 'topic' : 'chapter'
}

type StoredWrongEntry = Omit<WrongQuestionEntry, 'kind'> & { kind?: WrongBookKind }

function normalize(entry: StoredWrongEntry): WrongQuestionEntry {
  if (entry.kind) return entry as WrongQuestionEntry
  return { ...entry, kind: inferWrongBookKind(entry.unitId) }
}

function read(): WrongQuestionEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return (JSON.parse(raw) as StoredWrongEntry[]).map(normalize)
  } catch {
    return []
  }
}

function write(entries: WrongQuestionEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function listWrongQuestions(kind?: WrongBookKind): WrongQuestionEntry[] {
  const all = read().sort(
    (a, b) => new Date(b.lastWrongAt).getTime() - new Date(a.lastWrongAt).getTime(),
  )
  return kind ? all.filter((e) => e.kind === kind) : all
}

export function listWrongByUnit(unitId: string): WrongQuestionEntry[] {
  return listWrongQuestions().filter((e) => e.unitId === unitId)
}

export function countWrongQuestions(kind?: WrongBookKind): number {
  return listWrongQuestions(kind).length
}

export function recordWrongAttempt(entry: {
  questionId: string
  unitId: string
  unitLabel: string
  stemPreview: string
  kind: WrongBookKind
}) {
  const list = read()
  const idx = list.findIndex((e) => e.questionId === entry.questionId)
  const now = new Date().toISOString()
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      wrongCount: list[idx].wrongCount + 1,
      lastWrongAt: now,
      unitLabel: entry.unitLabel,
      stemPreview: entry.stemPreview,
      unitId: entry.unitId,
      kind: entry.kind,
    }
  } else {
    list.push({
      questionId: entry.questionId,
      unitId: entry.unitId,
      unitLabel: entry.unitLabel,
      stemPreview: entry.stemPreview,
      wrongCount: 1,
      lastWrongAt: now,
      kind: entry.kind,
    })
  }
  write(list)
}

export function removeFromWrongBook(questionId: string) {
  write(read().filter((e) => e.questionId !== questionId))
}

export function clearWrongBook(kind?: WrongBookKind) {
  if (!kind) {
    localStorage.removeItem(KEY)
    return
  }
  write(read().filter((e) => e.kind !== kind))
}

export function replaceAllWrongQuestions(entries: WrongQuestionEntry[]) {
  write(entries.map(normalize))
}
