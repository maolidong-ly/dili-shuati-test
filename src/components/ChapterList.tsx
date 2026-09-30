import { useState } from 'react'
import {
  chapterHasQuestions,
  countChapterQuestions,
  textbooks,
} from '../data/curriculum'
import { getAggregatedChapterProgress } from '../lib/progress-aggregate'
import { getChapterProgress, progressTotals } from '../lib/storage'

type Props = {
  onSelectUnit: (unitId: string) => void
}

const BOOK_TAB: Record<string, string> = {
  bx1: '必1',
  bx2: '必2',
  xx1: '选1',
  xx2: '选2',
  xx3: '选3',
}

export function ChapterList({ onSelectUnit }: Props) {
  const [bookId, setBookId] = useState(textbooks[0]?.id ?? 'bx1')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const book = textbooks.find((b) => b.id === bookId) ?? textbooks[0]

  if (!book) return null

  function toggleChapter(chapterId: string) {
    setExpanded((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }))
  }

  return (
    <section className="catalog">
      <div className="catalog-hero">
        <img src="/app-icon.png" alt="" className="catalog-logo" width={48} height={48} />
        <div>
          <h2>教材目录</h2>
          <p className="muted">点章节展开 · 点节次刷题（题目录入后）</p>
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
          const totalQ = countChapterQuestions(ch)
          const ready = chapterHasQuestions(ch)
          const { answered, correct } = getAggregatedChapterProgress(ch)
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
                    const secTotal = s.questions.length
                    const secProgress = progressTotals(getChapterProgress(s.id))
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
                              ? `${secProgress.answered}/${secTotal} 题`
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
