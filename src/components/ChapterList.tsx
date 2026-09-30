import { useEffect, useMemo, useState } from 'react'
import { textbooks } from '../data/curriculum'
import {
  getMergedQuestionsCached,
  invalidateCatalogQuestionCache,
} from '../lib/catalog-question-cache'
import { getAggregatedChapterProgress } from '../lib/progress-aggregate'
import { getChapterProgress } from '../lib/storage'
import type { ChoiceQuestion } from '../types'

type Props = {
  onSelectUnit: (unitId: string) => void
  refreshKey: number
}

const BOOK_TAB: Record<string, string> = {
  bx1: '必1',
  bx2: '必2',
  xx1: '选1',
  xx2: '选2',
  xx3: '选3',
}

export function ChapterList({ onSelectUnit, refreshKey }: Props) {
  const [bookId, setBookId] = useState(textbooks[0]?.id ?? 'bx1')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [unitQuestions, setUnitQuestions] = useState<Map<string, ChoiceQuestion[]>>(
    () => new Map(),
  )
  const [countsLoading, setCountsLoading] = useState(false)
  const book = textbooks.find((b) => b.id === bookId) ?? textbooks[0]

  useEffect(() => {
    if (!book) return
    let cancelled = false
    invalidateCatalogQuestionCache()
    setCountsLoading(true)
    async function load() {
      const map = new Map<string, ChoiceQuestion[]>()
      const unitIds = book.chapters.flatMap((ch) => {
        const ids = ch.sections.map((s) => s.id)
        if (ch.questions.length > 0) ids.push(ch.id)
        return ids
      })
      await Promise.all(
        unitIds.map(async (id) => {
          map.set(id, await getMergedQuestionsCached(id))
        }),
      )
      if (!cancelled) {
        setUnitQuestions(map)
        setCountsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [book, refreshKey])

  const chapterQuestionIds = useMemo(() => {
    const out = new Map<string, Set<string>>()
    if (!book) return out
    for (const ch of book.chapters) {
      const ids = new Set<string>()
      for (const s of ch.sections) {
        for (const q of unitQuestions.get(s.id) ?? s.questions) {
          ids.add(q.id)
        }
      }
      if (ch.questions.length > 0) {
        for (const q of unitQuestions.get(ch.id) ?? ch.questions) {
          ids.add(q.id)
        }
      }
      out.set(ch.id, ids)
    }
    return out
  }, [book, unitQuestions])

  if (!book) return null

  function toggleChapter(chapterId: string) {
    setExpanded((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }))
  }

  function sectionTotal(sectionId: string, staticLen: number): number {
    const qs = unitQuestions.get(sectionId)
    return qs ? qs.length : staticLen
  }

  function chapterTotal(ch: (typeof book.chapters)[0]): number {
    const idSet = chapterQuestionIds.get(ch.id)
    if (idSet) return idSet.size
    return ch.sections.reduce((n, s) => n + sectionTotal(s.id, s.questions.length), 0)
  }

  return (
    <section className="catalog">
      <div className="catalog-hero">
        <img
          src={`${import.meta.env.BASE_URL}pwa-192.png`}
          alt=""
          className="catalog-logo"
          width={48}
          height={48}
        />
        <div>
          <h2>教材目录</h2>
          <p className="muted">
            点章节展开 · 点节次刷题
            {countsLoading ? ' · 同步题量…' : null}
          </p>
        </div>
      </div>

      <div className="book-tabs" role="tablist" aria-label="选择册别">
        {textbooks.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={b.id === bookId}
            className={b.id === bookId ? 'book-tab active' : 'book-tab'}
            onClick={() => setBookId(b.id)}
          >
            {BOOK_TAB[b.id] ?? b.volumeLabel}
          </button>
        ))}
      </div>

      <header className={`book-head ${book.category === 'elective' ? 'elective' : ''}`}>
        <span className={`book-badge ${book.category}`}>
          {book.category === 'required' ? '必修' : '选择性必修'}
        </span>
        <h3>{book.volumeLabel}</h3>
        <p className="muted">{book.subtitle}</p>
      </header>

      <ul className="chapter-cards">
        {book.chapters.map((ch) => {
          const totalQ = chapterTotal(ch)
          const ready = totalQ > 0
          const validIds = chapterQuestionIds.get(ch.id)
          const { answered, correct } = getAggregatedChapterProgress(ch, validIds)
          const isOpen = expanded[ch.id] ?? false
          const chapterTitle =
            ch.title.replace(/^第[一二三四五六七八九十百零\d]+章\s*/, '') || ch.title

          return (
            <li key={ch.id} className="chapter-block">
              <button
                type="button"
                className="chapter-card chapter-toggle"
                aria-expanded={isOpen}
                onClick={() => toggleChapter(ch.id)}
              >
                <div className="chapter-card-top">
                  <span className="chapter-no">第 {ch.index} 章</span>
                  {!ready ? <span className="tag pending">题目筹备中</span> : null}
                  {ready ? <span className="tag live">{totalQ} 题</span> : null}
                  <span className={`chevron ${isOpen ? 'open' : ''}`} aria-hidden>
                    ▾
                  </span>
                </div>
                <h4>{chapterTitle}</h4>
                {ready ? (
                  <p className="chapter-stats">
                    已练 {answered}/{totalQ} · 正确 {correct}
                  </p>
                ) : (
                  <p className="chapter-stats muted">展开可查看各节目录</p>
                )}
              </button>

              {isOpen ? (
                <ul className="section-list">
                  {ch.sections.map((s) => {
                    const secTotal = sectionTotal(s.id, s.questions.length)
                    const secIds = new Set(
                      (unitQuestions.get(s.id) ?? s.questions).map((q) => q.id),
                    )
                    const raw = getChapterProgress(s.id)
                    const answeredSec = raw.answeredIds.filter((id) => secIds.has(id)).length
                    const secProgress = {
                      answered: answeredSec,
                      correct: raw.correctIds.filter((id) => secIds.has(id)).length,
                    }
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="section-row"
                          data-kind={s.kind}
                          onClick={() => onSelectUnit(s.id)}
                        >
                          <span className="section-title">{s.title}</span>
                          <span className="section-meta">
                            {secTotal > 0
                              ? `${secProgress.answered}/${secTotal} 题 · 对 ${secProgress.correct}`
                              : '待录入'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
