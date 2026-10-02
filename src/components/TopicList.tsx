import { useState } from 'react'
import { topicCategories } from '../data/curriculum/topics'
import { getChapterProgress, progressTotals } from '../lib/storage'
import { labelForUnitId } from '../lib/unit-label'
import { UnitExportButtons } from './UnitExportButtons'

type Props = {
  onSelectUnit: (unitId: string) => void
}

export function TopicList({ onSelectUnit }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    physical: true,
  })

  function toggleCategory(categoryId: string) {
    setExpanded((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  return (
    <section className="topic-catalog">
      <div className="catalog-hero compact">
        <div>
          <h2>考点目录</h2>
          <p className="muted">按知识板块刷题 · 题目后续录入</p>
        </div>
      </div>

      <ul className="topic-categories">
        {topicCategories.map((cat) => {
          const isOpen = expanded[cat.id] ?? false
          const hasTopics = cat.topics.length > 0
          return (
            <li key={cat.id} className="topic-category-block">
              <button
                type="button"
                className="topic-category-head"
                aria-expanded={isOpen}
                onClick={() => toggleCategory(cat.id)}
              >
                <span className="topic-l1">{cat.title}</span>
                {hasTopics ? (
                  <span className="topic-count">{cat.topics.length} 个考点</span>
                ) : (
                  <span className="tag pending">目录筹备中</span>
                )}
                <span className={`chevron ${isOpen ? 'open' : ''}`} aria-hidden>
                  ▾
                </span>
              </button>

              {isOpen && hasTopics ? (
                <ul className="topic-points">
                  {cat.topics.map((t) => {
                    const total = t.questions.length
                    const prog = progressTotals(getChapterProgress(t.id))
                    return (
                      <li key={t.id} className="section-row-wrap">
                        <button
                          type="button"
                          className="topic-point-row"
                          onClick={() => onSelectUnit(t.id)}
                        >
                          <span>{t.title}</span>
                          <span className="section-meta">
                            {total > 0
                              ? `${prog.answered}/${total} 题`
                              : '待录入'}
                          </span>
                        </button>
                        {total > 0 ? (
                          <UnitExportButtons
                            unitId={t.id}
                            unitTitle={labelForUnitId(t.id)}
                            questions={t.questions}
                            includeAnswers={false}
                            compact
                          />
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              {isOpen && !hasTopics ? (
                <p className="topic-empty muted">人文地理二级考点稍后开放。</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
