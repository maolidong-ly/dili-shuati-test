import { useEffect, useMemo, useState } from 'react'
import { allChapters, getBookForChapter } from '../data/curriculum'
import {
  adminGetStudentChapterAttempts,
  adminGetStudentReport,
  type AdminQuestionAttemptRow,
  type AdminStudentReport,
} from '../lib/admin-api'
import { KIND_LABELS } from '../lib/question-display'
import { labelForUnitId } from '../lib/unit-label'
import type { QuestionKind } from '../types'

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
  const [showInProgress, setShowInProgress] = useState(false)

  const chapterOptions = useMemo(
    () =>
      allChapters.map((ch) => {
        const book = getBookForChapter(ch.id)
        return {
          id: ch.id,
          label: book ? `${book.volumeLabel} · ${ch.title}` : ch.title,
        }
      }),
    [],
  )
  const [chapterId, setChapterId] = useState(chapterOptions[0]?.id ?? '')
  const [attempts, setAttempts] = useState<AdminQuestionAttemptRow[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)

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

  useEffect(() => {
    if (!chapterId) return
    let cancelled = false
    setAttemptsLoading(true)
    adminGetStudentChapterAttempts(adminPass, profileId, chapterId)
      .then((rows) => {
        if (!cancelled) setAttempts(rows)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载练习明细失败')
        }
      })
      .finally(() => {
        if (!cancelled) setAttemptsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminPass, profileId, chapterId])

  const attemptsByUnit = useMemo(() => {
    const map = new Map<string, AdminQuestionAttemptRow[]>()
    for (const row of attempts) {
      const list = map.get(row.unit_id) ?? []
      list.push(row)
      map.set(row.unit_id, list)
    }
    return map
  }, [attempts])

  const progressEntries = report
    ? Object.entries(report.progress).filter(([, p]) => p.answeredIds.length > 0)
    : []

  const { finishedSessions, inProgressSessions } = useMemo(() => {
    if (!report) return { finishedSessions: [], inProgressSessions: [] }
    const finished = report.recent_sessions.filter((s) => s.ended_at)
    const open = report.recent_sessions.filter((s) => !s.ended_at)
    return { finishedSessions: finished, inProgressSessions: open }
  }, [report])

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
            <p className="muted small admin-report-hint">
              按「题」去重：每道题只要曾经做对过一次，就算进总正确率。
            </p>
            <p>
              已做过 {report.question_stats.attempted} 题 · 至少点对{' '}
              {report.question_stats.ever_correct} 题 · 总正确率{' '}
              <strong>{report.question_stats.accuracy}%</strong>
            </p>
            {report.saved_updated_at ? (
              <p className="muted small">
                错题本/进度同步：{new Date(report.saved_updated_at).toLocaleString()}
              </p>
            ) : null}
          </section>

          <section className="card admin-report-block">
            <h4>章榜得分</h4>
            <p className="muted small admin-report-hint">
              只有该章每一道题都至少做过 1 次，才会生成章得分并上榜；只练某一节不会出现这里。
            </p>
            {report.chapter_scores.length === 0 ? (
              <p className="muted">暂无（尚未完成整章）</p>
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
            <h4>已结束的练习</h4>
            <p className="muted small admin-report-hint">
              学生点了「结束练习」后的当次得分，不进章榜。数字为：得分（做对/已做）。
            </p>
            {finishedSessions.length === 0 ? (
              <p className="muted">暂无</p>
            ) : (
              <ul className="admin-report-list">
                {finishedSessions.map((s) => (
                  <li key={s.id}>
                    当次 {s.session_score ?? '—'} 分（{s.correct_count}/{s.answered_count}）
                    <br />
                    <span className="muted small">{labelForUnitId(s.unit_id)}</span>
                  </li>
                ))}
              </ul>
            )}
            {inProgressSessions.length > 0 ? (
              <div className="admin-report-inprogress">
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setShowInProgress((v) => !v)}
                >
                  {showInProgress ? '隐藏' : '显示'}未结束的记录（{inProgressSessions.length}）
                </button>
                {showInProgress ? (
                  <ul className="admin-report-list muted">
                    {inProgressSessions.map((s) => (
                      <li key={s.id}>
                        进行中 · {labelForUnitId(s.unit_id)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
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
            <h4>按章 · 每题练习次数</h4>
            <p className="muted small admin-report-hint">
              统计学生每次在练习中「提交答案」的次数（含重复练习同一题）。仅含云端题库中的题。
            </p>
            <label className="admin-chapter-pick">
              选择章节
              <select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
                {chapterOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {attemptsLoading ? <p className="muted">加载练习明细…</p> : null}
            {!attemptsLoading && attempts.length === 0 ? (
              <p className="muted">该章暂无云端题目或尚无练习记录</p>
            ) : null}
            {!attemptsLoading && attempts.length > 0 ? (
              <div className="admin-attempts-groups">
                {[...attemptsByUnit.entries()].map(([unitId, rows]) => (
                  <div key={unitId} className="admin-attempts-unit">
                    <h5>{labelForUnitId(unitId)}</h5>
                    <table className="admin-attempts-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>题型</th>
                          <th>题干</th>
                          <th>练习次数</th>
                          <th>曾对</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => {
                          const kind = row.question_type as QuestionKind
                          const kindLabel =
                            KIND_LABELS[kind] ??
                            (kind === 'multiple'
                              ? '多选'
                              : kind === 'judgment'
                                ? '判断'
                                : '单选')
                          return (
                            <tr key={row.question_id}>
                              <td>{i + 1}</td>
                              <td>{kindLabel}</td>
                              <td className="attempt-stem">
                                {row.stem.length > 40
                                  ? `${row.stem.slice(0, 40)}…`
                                  : row.stem}
                              </td>
                              <td>{row.attempt_count}</td>
                              <td>{row.ever_correct ? '是' : '否'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="card admin-report-block">
            <h4>各单元刷题进度</h4>
            {progressEntries.length === 0 ? (
              <p className="muted">暂无</p>
            ) : (
              <ul className="admin-report-list">
                {progressEntries.map(([unitId, p]) => (
                  <li key={unitId}>
                    {labelForUnitId(unitId)}：已做 {p.answeredIds.length}，对{' '}
                    {p.correctIds.length}
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
