import { useMemo, useState } from 'react'
import { useQuizUnit } from '../hooks/useQuizUnit'
import { countByStar, filterQuestions, starLabel } from '../lib/question-filter'
import { listWrongByUnit } from '../lib/wrong-book'
import type { QuizLaunchConfig, StarFilter, StarLevel } from '../types'
import { STAR_LEVELS } from '../types'

type Props = {
  unitId: string
  onStart: (config: QuizLaunchConfig) => void
  onBack: () => void
}

export function QuizSetup({ unitId, onStart, onBack }: Props) {
  const { unit, loading } = useQuizUnit(unitId)
  const [selectedStars, setSelectedStars] = useState<StarLevel[]>([])
  const [wrongOnly, setWrongOnly] = useState(false)

  const allQuestions = unit?.questions ?? []
  const wrongInUnit = useMemo(
    () => listWrongByUnit(unitId).map((w) => w.questionId),
    [unitId],
  )

  const starFilter: StarFilter =
    selectedStars.length === 0 ? 'all' : [...selectedStars].sort()

  const preview = useMemo(() => {
    const ids = wrongOnly ? wrongInUnit : undefined
    return filterQuestions(allQuestions, starFilter, ids)
  }, [allQuestions, starFilter, wrongOnly, wrongInUnit])

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

  function handleStart() {
    onStart({
      unitId,
      starFilter,
      wrongOnly: wrongOnly && wrongInUnit.length > 0,
      questionIds: wrongOnly ? wrongInUnit : undefined,
    })
  }

  const title =
    unit.mode === 'chapter'
      ? unit.section?.title ?? unit.title
      : unit.topicTitle

  return (
    <div className="screen setup">
      <header className="quiz-header">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← 返回
        </button>
        <div className="quiz-meta">
          <span>{title}</span>
          <span className="muted">选择题练习设置</span>
        </div>
      </header>

      <article className="card setup-card">
        <h3>星级筛选</h3>
        <p className="muted setup-hint">
          题目录入后，由老师在后台标注 1～5 星；未标星的题只在「不限星级」时出现。
        </p>
        <div className="star-chips">
          <button
            type="button"
            className={selectedStars.length === 0 ? 'star-chip active' : 'star-chip'}
            onClick={() => setSelectedStars([])}
          >
            不限星级
          </button>
          {STAR_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={
                selectedStars.includes(level) ? 'star-chip active' : 'star-chip'
              }
              onClick={() => toggleStar(level)}
            >
              {starLabel(level)}
              <span className="chip-count">{starCounts[level]}</span>
            </button>
          ))}
        </div>

        <label className="wrong-toggle">
          <input
            type="checkbox"
            checked={wrongOnly}
            onChange={(e) => setWrongOnly(e.target.checked)}
            disabled={wrongInUnit.length === 0}
          />
          只刷本题库错题（{wrongInUnit.length} 题）
        </label>

        <p className="setup-summary">
          将练习 <strong>{preview.length}</strong> 题
          {allQuestions.length === 0 ? '（题目尚未录入）' : null}
        </p>

        <button
          type="button"
          className="btn primary full"
          onClick={handleStart}
          disabled={allQuestions.length > 0 && preview.length === 0}
        >
          开始刷题
        </button>
      </article>
    </div>
  )
}
