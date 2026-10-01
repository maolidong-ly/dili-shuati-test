import { useMemo, useState } from 'react'
import {
  groupQuestionsByKind,
  KIND_LABELS,
} from '../lib/question-display'
import type { ChoiceQuestion, QuestionKind } from '../types'

type Props = {
  questions: ChoiceQuestion[]
  attemptCounts: Record<string, number>
  onPick: (questionId: string) => void
}

function KindGrid({
  kind,
  questions,
  attemptCounts,
  onPick,
}: {
  kind: QuestionKind
  questions: ChoiceQuestion[]
  attemptCounts: Record<string, number>
  onPick: (questionId: string) => void
}) {
  if (questions.length === 0) return null
  return (
    <div className="q-picker-kind">
      <p className="q-picker-kind-title">
        {KIND_LABELS[kind]}（{questions.length}）
      </p>
      <div className="q-picker-grid" role="list">
        {questions.map((q, i) => {
          const attempts = attemptCounts[q.id] ?? 0
          return (
            <button
              key={q.id}
              type="button"
              className="q-picker-cell"
              role="listitem"
              title={attempts > 0 ? `已练 ${attempts} 次` : '尚未练习'}
              onClick={() => onPick(q.id)}
            >
              <span className="q-picker-num">{i + 1}</span>
              {attempts > 0 ? (
                <span className="q-picker-badge">
                  {attempts > 99 ? '99+' : attempts}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function QuestionPickerGrid({ questions, attemptCounts, onPick }: Props) {
  const grouped = useMemo(() => groupQuestionsByKind(questions), [questions])
  const [pickerOpen, setPickerOpen] = useState(false)

  if (questions.length === 0) return null

  return (
    <div className="setup-section q-picker-section">
      <button
        type="button"
        className="q-picker-toggle"
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((o) => !o)}
      >
        {pickerOpen ? '▼' : '▶'} 题号选做（点题号从该题往后刷）
      </button>
      {pickerOpen ? (
        <>
          <p className="setup-hint muted small">
            角标为已练次数；未练过的题也可直接点选开始。
          </p>
          <KindGrid
            kind="single"
            questions={grouped.single}
            attemptCounts={attemptCounts}
            onPick={onPick}
          />
          <KindGrid
            kind="multiple"
            questions={grouped.multiple}
            attemptCounts={attemptCounts}
            onPick={onPick}
          />
          <KindGrid
            kind="judgment"
            questions={grouped.judgment}
            attemptCounts={attemptCounts}
            onPick={onPick}
          />
        </>
      ) : null}
    </div>
  )
}
