import { useEffect, useMemo, useState } from 'react'
import { QuestionPickerGrid } from './QuestionPickerGrid'
import { useQuizUnit } from '../hooks/useQuizUnit'
import { groupQuestionsByKind, KIND_LABELS } from '../lib/question-display'
import { countByStar, filterQuestions, starLabel } from '../lib/question-filter'
import {
  fetchUnitAttemptCounts,
  getAttemptCountForQuestions,
} from '../lib/question-attempts'
import { getProfile } from '../lib/storage'
import { listWrongByUnit } from '../lib/wrong-book'
import type {
  QuestionKind,
  QuestionKindFilter,
  QuizLaunchConfig,
  StarFilter,
  StarLevel,
} from '../types'
import { STAR_LEVELS } from '../types'

type Props = {
  unitId: string
  onStart: (config: QuizLaunchConfig) => void
  onBack: () => void
}

const KIND_FILTERS: QuestionKindFilter[] = ['all', 'single', 'multiple', 'judgment']

export function QuizSetup({ unitId, onStart, onBack }: Props) {
  const { unit, loading, refetch } = useQuizUnit(unitId)
  const [selectedStars, setSelectedStars] = useState<StarLevel[]>([])
  const [kindFilter, setKindFilter] = useState<QuestionKindFilter>('all')
  const [wrongOnly, setWrongOnly] = useState(false)
  const [cloudAttempts, setCloudAttempts] = useState<Record<string, number>>({})

  const isTopicUnit = unit?.mode === 'topic'

  useEffect(() => {
    const profile = getProfile()
    if (!profile || !unitId) return
    void fetchUnitAttemptCounts(profile, unitId).then(setCloudAttempts)
  }, [unitId])

  const allQuestions = unit?.questions ?? []
  const wrongInUnit = useMemo(
    () => listWrongByUnit(unitId).map((w) => w.questionId),
    [unitId],
  )

  const starFilter: StarFilter =
    isTopicUnit && selectedStars.length > 0 ? [...selectedStars].sort() : 'all'

  const kindCounts = useMemo(() => {
    const g = groupQuestionsByKind(allQuestions)
    return {
      all: allQuestions.length,
      single: g.single.length,
      multiple: g.multiple.length,
      judgment: g.judgment.length,
    }
  }, [allQuestions])

  const preview = useMemo(() => {
    const ids = wrongOnly ? wrongInUnit : undefined
    return filterQuestions(allQuestions, starFilter, ids, kindFilter)
  }, [allQuestions, starFilter, wrongOnly, wrongInUnit, kindFilter])

  const attemptCounts = useMemo(
    () =>
      getAttemptCountForQuestions(
        preview.map((q) => q.id),
        cloudAttempts,
      ),
    [preview, cloudAttempts],
  )

  const starCounts = useMemo(() => countByStar(allQuestions), [allQuestions])

  if (loading) {
    return (
      <div className="screen">
        <p className="muted">正在加载题库…</p>
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="screen">
        <p>目录项不存在</p>
        <button type="button" className="btn" onClick={onBack}>
          返回
        </button>
      </div>
    )
  }

  function toggleStar(level: StarLevel) {
    setSelectedStars((prev) =>
      prev.includes(level) ? prev.filter((s) => s !== level) : [...prev, level],
    )
  }

  function handleStart(startQuestionId?: string) {
    onStart({
      unitId,
      starFilter,
      kindFilter,
      wrongOnly: wrongOnly && wrongInUnit.length > 0,
      questionIds: wrongOnly ? wrongInUnit : undefined,
      startQuestionId,
    })
  }

  const title =
    unit.mode === 'chapter'
      ? unit.section?.title ?? unit.title
      : unit.topicTitle

  function kindFilterLabel(k: QuestionKindFilter): string {
    if (k === 'all') return '全部'
    return KIND_LABELS[k].replace('题', '')
  }

  return (
    <div className="screen setup">
      <header className="quiz-header">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← 返回
        </button>
        <div className="quiz-meta">
          <span className="quiz-meta-title">{title}</span>
          <span className="muted">练习设置</span>
        </div>
      </header>

      <article className="card setup-card">
        <div className="setup-section">
          <div className="setup-section-head">
            <h3 className="setup-section-title">题型</h3>
            <button type="button" className="btn ghost small" onClick={() => refetch()}>
              刷新题库
            </button>
          </div>
          <div className="filter-grid filter-grid--2">
            {KIND_FILTERS.map((k) => (
              <button
                key={k}
                type="button"
                className={
                  kindFilter === k ? 'filter-chip filter-chip--active' : 'filter-chip'
                }
                onClick={() => setKindFilter(k)}
              >
                <span className="filter-chip-label">{kindFilterLabel(k)}</span>
                <span className="filter-chip-count">{kindCounts[k]} 题</span>
              </button>
            ))}
          </div>
        </div>

        {isTopicUnit ? (
          <div className="setup-section">
            <h3 className="setup-section-title">难度星级</h3>
            <p className="setup-hint">仅考点题标注星级；可多选。</p>
            <div className="filter-grid filter-grid--stars">
              <button
                type="button"
                className={
                  selectedStars.length === 0
                    ? 'filter-chip filter-chip--star filter-chip--active'
                    : 'filter-chip filter-chip--star'
                }
                onClick={() => setSelectedStars([])}
              >
                <span className="filter-chip-label">不限</span>
                <span className="filter-chip-count">{allQuestions.length} 题</span>
              </button>
              {STAR_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={
                    selectedStars.includes(level)
                      ? 'filter-chip filter-chip--star filter-chip--active'
                      : 'filter-chip filter-chip--star'
                  }
                  onClick={() => toggleStar(level)}
                >
                  <span className="filter-chip-label filter-chip-stars">
                    {starLabel(level)}
                  </span>
                  <span className="filter-chip-count">{starCounts[level]} 题</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="setup-section setup-section--compact">
          <label className="wrong-toggle">
            <input
              type="checkbox"
              checked={wrongOnly}
              onChange={(e) => setWrongOnly(e.target.checked)}
              disabled={wrongInUnit.length === 0}
            />
            只刷错题（{wrongInUnit.length}）
          </label>
        </div>

        <QuestionPickerGrid
          questions={preview}
          attemptCounts={attemptCounts}
          onPick={(questionId) => handleStart(questionId)}
        />

        <p className="setup-summary">
          本次共 <strong>{preview.length}</strong> 题
          {kindFilter !== 'all' ? ` · ${KIND_LABELS[kindFilter as QuestionKind]}` : ''}
          {allQuestions.length === 0 ? ' · 尚未录入' : ''}
        </p>

        <button
          type="button"
          className="btn primary full setup-start"
          onClick={() => handleStart()}
          disabled={allQuestions.length > 0 && preview.length === 0}
        >
          从第一题开始
        </button>
      </article>
    </div>
  )
}
