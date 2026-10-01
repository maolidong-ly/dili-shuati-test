import { useMemo, useState } from 'react'
import { findQuestionGlobal } from '../data/curriculum'
import { loadMergedQuestionsForUnit } from '../lib/load-unit-questions'
import { applyQuestionMeta } from '../lib/question-meta'
import {
  clearWrongBook,
  countWrongQuestions,
  listWrongQuestions,
} from '../lib/wrong-book'
import { QuestionReadonlyCard } from './QuestionReadonlyCard'
import type { ChoiceQuestion, QuizLaunchConfig, WrongBookKind } from '../types'

type Props = {
  onStart: (config: QuizLaunchConfig) => void
}

async function resolveQuestion(
  questionId: string,
  unitId: string,
): Promise<ChoiceQuestion | null> {
  const hit = findQuestionGlobal(questionId)
  if (hit) return hit.question
  try {
    const list = applyQuestionMeta(await loadMergedQuestionsForUnit(unitId))
    return list.find((q) => q.id === questionId) ?? null
  } catch {
    return null
  }
}

export function WrongBookList({ onStart }: Props) {
  const [kind, setKind] = useState<WrongBookKind>('chapter')
  const [tick, setTick] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadedQuestions, setLoadedQuestions] = useState<
    Record<string, ChoiceQuestion>
  >({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const chapterCount = useMemo(() => {
    void tick
    return countWrongQuestions('chapter')
  }, [tick])
  const topicCount = useMemo(() => {
    void tick
    return countWrongQuestions('topic')
  }, [tick])

  const entries = useMemo(() => {
    void tick
    return listWrongQuestions(kind)
  }, [kind, tick])

  const kindLabel = kind === 'chapter' ? '章节' : '考点'
  const totalWrong = chapterCount + topicCount

  const byUnit = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const e of entries) {
      const list = map.get(e.unitId) ?? []
      list.push(e)
      map.set(e.unitId, list)
    }
    return map
  }, [entries])

  async function toggleExpand(questionId: string, unitId: string) {
    if (expandedId === questionId) {
      setExpandedId(null)
      return
    }
    setExpandedId(questionId)
    if (loadedQuestions[questionId]) return
    setLoadingId(questionId)
    const q = await resolveQuestion(questionId, unitId)
    if (q) {
      setLoadedQuestions((prev) => ({ ...prev, [questionId]: q }))
    }
    setLoadingId(null)
  }

  return (
    <section className="wrong-book">
      <header className="wrong-book-hero card">
        <div>
          <h2>错题本</h2>
          <p className="muted small wrong-book-sub">
            章节与考点分开收录 · 答对后自动移出 · 展开可看解析
          </p>
        </div>
        {totalWrong > 0 ? (
          <p className="wrong-book-total" aria-label={`共 ${totalWrong} 道错题`}>
            <span className="wrong-book-total-num">{totalWrong}</span>
            <span className="muted small">题</span>
          </p>
        ) : null}
      </header>

      <div className="practice-mode wrong-book-tabs" role="tablist" aria-label="错题分类">
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'chapter'}
          className={kind === 'chapter' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => {
            setKind('chapter')
            setExpandedId(null)
          }}
        >
          章节
          {chapterCount > 0 ? <span className="tab-count">{chapterCount}</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'topic'}
          className={kind === 'topic' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => {
            setKind('topic')
            setExpandedId(null)
          }}
        >
          考点
          {topicCount > 0 ? <span className="tab-count">{topicCount}</span> : null}
        </button>
      </div>

      {entries.length === 0 ? (
        <article className="card empty-card wrong-empty">
          <p className="muted">
            {totalWrong === 0
              ? '还没有错题。刷题时答错的题目会出现在这里，方便复习与查看解析。'
              : `当前分类下暂无${kindLabel}错题，可切换到另一标签查看。`}
          </p>
        </article>
      ) : (
        <>
          <div className="wrong-summary card">
            <div className="wrong-summary-text">
              <strong>{kindLabel}错题</strong>
              <span className="muted small">
                {byUnit.size} 个单元 · {entries.length} 题
              </span>
            </div>
            <button
              type="button"
              className="btn primary wrong-summary-action"
              onClick={() =>
                onStart({
                  unitId: `cross-unit-wrong-${kind}`,
                  starFilter: 'all',
                  questionIds: entries.map((e) => e.questionId),
                  crossUnit: true,
                })
              }
            >
              全部重练
            </button>
          </div>

          <ul className="wrong-groups">
            {[...byUnit.entries()].map(([unitId, items]) => (
              <li key={unitId} className="wrong-group card">
                <div className="wrong-group-head">
                  <div className="wrong-group-title">
                    <span className="wrong-unit-label">{items[0]?.unitLabel ?? unitId}</span>
                    <span className="muted small">{items.length} 题</span>
                  </div>
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() =>
                      onStart({
                        unitId,
                        starFilter: 'all',
                        wrongOnly: true,
                        questionIds: items.map((i) => i.questionId),
                      })
                    }
                  >
                    本单元重练
                  </button>
                </div>
                <ul className="wrong-items">
                  {items.map((item, idx) => {
                    const open = expandedId === item.questionId
                    const q = loadedQuestions[item.questionId]
                    return (
                      <li key={item.questionId} className="wrong-item-wrap">
                        <button
                          type="button"
                          className={open ? 'wrong-item-toggle open' : 'wrong-item-toggle'}
                          aria-expanded={open}
                          onClick={() =>
                            void toggleExpand(item.questionId, item.unitId)
                          }
                        >
                          <span className="wrong-item-index">{idx + 1}</span>
                          <span className="wrong-item-body">
                            <span className="wrong-stem">{item.stemPreview}</span>
                            <span className="wrong-item-meta">
                              <span className="wrong-count-pill">错 {item.wrongCount} 次</span>
                              <span className="wrong-expand-hint">
                                {open ? '收起题目' : '展开 · 可查看解析'}
                              </span>
                            </span>
                          </span>
                          <span className="wrong-chevron" aria-hidden>
                            {open ? '▴' : '▾'}
                          </span>
                        </button>
                        {open ? (
                          <div className="wrong-item-panel">
                            {loadingId === item.questionId && !q ? (
                              <p className="muted small wrong-item-loading">加载题目…</p>
                            ) : q ? (
                              <QuestionReadonlyCard
                                question={q}
                                explainDisplay="toggle"
                                className="wrong-item-detail"
                              />
                            ) : (
                              <p className="muted small">题目暂无法加载</p>
                            )}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="link-btn block wrong-clear"
            onClick={() => {
              if (confirm(`确定清空全部${kindLabel}错题？`)) {
                clearWrongBook(kind)
                setExpandedId(null)
                setTick((t) => t + 1)
              }
            }}
          >
            清空当前{kindLabel}错题
          </button>
        </>
      )}
    </section>
  )
}
