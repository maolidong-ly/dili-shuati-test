import { useEffect, useState } from 'react'
import { allChapters } from '../data/curriculum'
import { adminGetStudentReport, type AdminStudentReport } from '../lib/admin-api'

type Props = {
  adminPass: string
  profileId: string
  nickname: string
  onBack: () => void
}

export function AdminStudentReport({ adminPass, profileId, nickname, onBack }: Props) {
  const [report, setReport] = useState<AdminStudentReport | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminGetStudentReport(adminPass, profileId)
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminPass, profileId])

  const progressEntries = report
    ? Object.entries(report.progress).filter(
        ([, p]) => p.answeredIds.length > 0,
      )
    : []

  return (
    <div className="admin-student-report">
      <header className="admin-report-head">
        <button type="button" className="btn ghost small" onClick={onBack}>
          ← 返回列表
        </button>
        <h3>{nickname}</h3>
      </header>

      {loading ? <p className="muted">加载中…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {report ? (
        <>
          <section className="card admin-report-block">
            <h4>总览</h4>
            <p>
              去重做题：{report.question_stats.attempted} 题 · 至少点对{' '}
              {report.question_stats.ever_correct} 题 · 总正确率{' '}
              <strong>{report.question_stats.accuracy}%</strong>
            </p>
            {report.saved_updated_at ? (
              <p className="muted small">
                云端同步：{new Date(report.saved_updated_at).toLocaleString()}
              </p>
            ) : null}
          </section>

          <section className="card admin-report-block">
            <h4>章总分（已上榜）</h4>
            {report.chapter_scores.length === 0 ? (
              <p className="muted">暂无</p>
            ) : (
              <ul className="admin-report-list">
                {report.chapter_scores.map((s) => (
                  <li key={s.chapter_id}>
                    {allChapters.find((c) => c.id === s.chapter_id)?.title ??
                      s.chapter_id}
                    ：{s.score} 分
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card admin-report-block">
            <h4>最近练习（当次分，不进榜）</h4>
            {report.recent_sessions.length === 0 ? (
              <p className="muted">暂无</p>
            ) : (
              <ul className="admin-report-list">
                {report.recent_sessions.map((s) => (
                  <li key={s.id}>
                    {s.ended_at
                      ? `当次 ${s.session_score ?? '—'} 分（${s.correct_count}/${s.answered_count}）`
                      : '进行中的练习'}
                    {s.unit_id ? ` · ${s.unit_id}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card admin-report-block">
            <h4>错题本（{report.wrong_book.length}）</h4>
            {report.wrong_book.length === 0 ? (
              <p className="muted">暂无</p>
            ) : (
              <ul className="admin-report-list wrong-preview">
                {report.wrong_book.slice(0, 30).map((w) => (
                  <li key={w.questionId}>
                    {w.stemPreview}（错 {w.wrongCount} 次）
                  </li>
                ))}
              </ul>
            )}
            {report.wrong_book.length > 30 ? (
              <p className="muted small">仅显示前 30 条</p>
            ) : null}
          </section>

          <section className="card admin-report-block">
            <h4>本地进度单元（{progressEntries.length}）</h4>
            {progressEntries.length === 0 ? (
              <p className="muted">暂无</p>
            ) : (
              <ul className="admin-report-list">
                {progressEntries.map(([unitId, p]) => (
                  <li key={unitId}>
                    {unitId}：已做 {p.answeredIds.length}，对 {p.correctIds.length}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
