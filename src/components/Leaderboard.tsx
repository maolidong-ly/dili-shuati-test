import { useEffect, useMemo, useState } from 'react'
import { allChapters, textbooks } from '../data/curriculum'
import {
  fetchChapterScoreboard,
  fetchGlobalAccuracyBoard,
  isCloudEnabled,
} from '../lib/supabase'
import type { ChapterScoreRow, GlobalAccuracyRow } from '../lib/supabase'

type Tab = 'chapter' | 'global'

export function Leaderboard() {
  const [bookId, setBookId] = useState(textbooks[0]?.id ?? 'bx1')
  const chaptersInBook = useMemo(
    () => textbooks.find((b) => b.id === bookId)?.chapters ?? [],
    [bookId],
  )
  const [chapterId, setChapterId] = useState(chaptersInBook[0]?.id ?? '')
  const [tab, setTab] = useState<Tab>('chapter')
  const [chapterRows, setChapterRows] = useState<ChapterScoreRow[]>([])
  const [globalRows, setGlobalRows] = useState<GlobalAccuracyRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (chaptersInBook.length && !chaptersInBook.some((c) => c.id === chapterId)) {
      setChapterId(chaptersInBook[0].id)
    }
  }, [chaptersInBook, chapterId])

  useEffect(() => {
    if (!isCloudEnabled()) return
    let cancelled = false
    async function load() {
      setLoading(true)
      if (tab === 'chapter' && chapterId) {
        const data = await fetchChapterScoreboard(chapterId)
        if (!cancelled) setChapterRows(data)
      } else if (tab === 'global') {
        const data = await fetchGlobalAccuracyBoard()
        if (!cancelled) setGlobalRows(data)
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [chapterId, tab])

  const chapterTitle =
    allChapters.find((c) => c.id === chapterId)?.title ?? ''

  return (
    <section className="leaderboard">
      <h2>班级排行榜</h2>
      {!isCloudEnabled() ? (
        <p className="muted banner">
          未连接云数据库时无法显示排行榜。
        </p>
      ) : null}

      <div className="seg-tabs">
        <button
          type="button"
          className={tab === 'chapter' ? 'seg active' : 'seg'}
          onClick={() => setTab('chapter')}
        >
          章总分榜
        </button>
        <button
          type="button"
          className={tab === 'global' ? 'seg active' : 'seg'}
          onClick={() => setTab('global')}
        >
          总正确率
        </button>
      </div>

      {tab === 'chapter' ? (
        <div className="toolbar">
          <label className="field">
            册别
            <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
              {textbooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.volumeLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            章节
            <select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
              {chaptersInBook.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {loading ? <p className="muted">加载中…</p> : null}

      {tab === 'chapter' ? (
        <>
          <p className="muted small">
            {chapterTitle} · 完成章内全部题目后计入（可对题数/章总题数）
          </p>
          <ol className="rank-list">
            {chapterRows.map((row, i) => (
              <li key={`${row.nickname}-${i}`}>
                <span className="rank">{i + 1}</span>
                <span className="name">{row.nickname}</span>
                <span className="stat">{row.score} 分</span>
              </li>
            ))}
          </ol>
          {chapterRows.length === 0 && !loading ? (
            <p className="muted">暂无上榜记录</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="muted small">按做过的题去重，同一题多次做只算一题</p>
          <ol className="rank-list">
            {globalRows.map((row, i) => (
              <li key={`${row.nickname}-${i}`}>
                <span className="rank">{i + 1}</span>
                <span className="name">{row.nickname}</span>
                <span className="stat">
                  {row.accuracy}%（{row.correct}/{row.attempted}）
                </span>
              </li>
            ))}
          </ol>
          {globalRows.length === 0 && !loading ? (
            <p className="muted">暂无数据</p>
          ) : null}
        </>
      )}
    </section>
  )
}
