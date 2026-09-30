import { useEffect, useMemo, useState } from 'react'
import { allChapters, textbooks } from '../data/curriculum'
import { fetchLeaderboard, isCloudEnabled } from '../lib/supabase'
import type { LeaderboardRow } from '../types'

type Tab = 'count' | 'accuracy'

export function Leaderboard() {
  const [bookId, setBookId] = useState(textbooks[0]?.id ?? 'bx1')
  const chaptersInBook = useMemo(
    () => textbooks.find((b) => b.id === bookId)?.chapters ?? [],
    [bookId],
  )
  const [chapterId, setChapterId] = useState(chaptersInBook[0]?.id ?? '')
  const [tab, setTab] = useState<Tab>('count')
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (chaptersInBook.length && !chaptersInBook.some((c) => c.id === chapterId)) {
      setChapterId(chaptersInBook[0].id)
    }
  }, [chaptersInBook, chapterId])

  useEffect(() => {
    if (!chapterId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const data = await fetchLeaderboard(chapterId)
      if (!cancelled) {
        setRows(data)
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [chapterId])

  const sorted = [...rows].sort((a, b) => {
    if (tab === 'count') return b.answered - a.answered
    if (a.answered < 3 && b.answered < 3) return 0
    if (a.answered < 3) return 1
    if (b.answered < 3) return -1
    return b.accuracy - a.accuracy
  })

  const chapterTitle =
    allChapters.find((c) => c.id === chapterId)?.title ?? ''

  return (
    <section className="leaderboard">
      <h2>班级排行榜</h2>
      {!isCloudEnabled() ? (
        <p className="muted banner">
          未连接云数据库时仅本机练习，配置 Supabase 后可显示班级排行。
        </p>
      ) : null}

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
        <div className="tabs">
          <button
            type="button"
            className={tab === 'count' ? 'tab active' : 'tab'}
            onClick={() => setTab('count')}
          >
            刷题数
          </button>
          <button
            type="button"
            className={tab === 'accuracy' ? 'tab active' : 'tab'}
            onClick={() => setTab('accuracy')}
          >
            正确率
          </button>
        </div>
      </div>

      <p className="rank-context muted">{chapterTitle}</p>
      {loading ? <p className="muted">加载中…</p> : null}

      <ol className="rank-list">
        {sorted.length === 0 && !loading ? (
          <li className="muted">暂无数据，联网同步后会出现排行</li>
        ) : null}
        {sorted.slice(0, 50).map((row, i) => (
          <li key={`${row.nickname}-${row.chapterId}`} className="rank-row">
            <span className="rank-no">{i + 1}</span>
            <span className="rank-name">{row.nickname}</span>
            <span className="rank-stat">
              {tab === 'count'
                ? `${row.answered} 题`
                : row.answered < 3
                  ? '至少 3 题'
                  : `${Math.round(row.accuracy * 100)}% (${row.correct}/${row.answered})`}
            </span>
          </li>
        ))}
      </ol>
      <p className="hint">正确率榜需本章至少完成 3 题。仅展示昵称，无真实身份信息。</p>
    </section>
  )
}
