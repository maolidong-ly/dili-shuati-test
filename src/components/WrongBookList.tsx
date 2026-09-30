import { useMemo, useState } from 'react'
import {
  clearWrongBook,
  countWrongQuestions,
  listWrongQuestions,
} from '../lib/wrong-book'
import type { QuizLaunchConfig, WrongBookKind } from '../types'

type Props = {
  onStart: (config: QuizLaunchConfig) => void
}

export function WrongBookList({ onStart }: Props) {
  const [kind, setKind] = useState<WrongBookKind>('chapter')
  const [tick, setTick] = useState(0)

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

  const byUnit = new Map<string, typeof entries>()
  for (const e of entries) {
    const list = byUnit.get(e.unitId) ?? []
    list.push(e)
    byUnit.set(e.unitId, list)
  }

  return (
    <section className="wrong-book">
      <div className="wrong-head">
        <h2>错题本</h2>
      </div>

      <div className="practice-mode" role="tablist" aria-label="错题分类">
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'chapter'}
          className={kind === 'chapter' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setKind('chapter')}
        >
          章节错题{chapterCount > 0 ? ` (${chapterCount})` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'topic'}
          className={kind === 'topic' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setKind('topic')}
        >
          考点错题{topicCount > 0 ? ` (${topicCount})` : ''}
        </button>
      </div>

      {entries.length === 0 ? (
        <article className="card empty-card">
          <p className="muted">
            {chapterCount === 0 && topicCount === 0
              ? '还没有错题。按章节或按考点刷题时，答错的题会分别收录在这里。'
              : `暂无${kindLabel}错题。在「刷题」里用对应模式练习，答错后会出现在这里。`}
          </p>
        </article>
      ) : (
        <>
          <p className="muted setup-hint">
            {kindLabel}错题 · 共 {entries.length} 题 · 答对后自动移出
          </p>

          <button
            type="button"
            className="btn primary full"
            onClick={() =>
              onStart({
                unitId: `cross-unit-wrong-${kind}`,
                starFilter: 'all',
                questionIds: entries.map((e) => e.questionId),
                crossUnit: true,
              })
            }
          >
            重练全部{kindLabel}错题
          </button>

          <ul className="wrong-groups">
            {[...byUnit.entries()].map(([unitId, items]) => (
              <li key={unitId} className="wrong-group card">
                <div className="wrong-group-head">
                  <strong>{items[0]?.unitLabel ?? unitId}</strong>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() =>
                      onStart({
                        unitId,
                        starFilter: 'all',
                        wrongOnly: true,
                        questionIds: items.map((i) => i.questionId),
                      })
                    }
                  >
                    重练
                  </button>
                </div>
                <ul className="wrong-items">
                  {items.map((item) => (
                    <li key={item.questionId}>
                      <span className="wrong-stem">{item.stemPreview}</span>
                      <span className="muted small">错 {item.wrongCount} 次</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="link-btn block"
            onClick={() => {
              if (confirm(`确定清空全部${kindLabel}错题？`)) {
                clearWrongBook(kind)
                setTick((t) => t + 1)
              }
            }}
          >
            清空{kindLabel}错题
          </button>
        </>
      )}
    </section>
  )
}
