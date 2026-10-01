import { useState } from 'react'
import {
  formatStemWithIndex,
  indexWithinKind,
  KIND_LABELS,
  questionKind,
  sortQuestionsByKind,
} from '../lib/question-display'
import { correctIndicesForDisplay } from '../lib/question-grade'
import { getEffectiveStars } from '../lib/question-meta'
import { starLabel } from '../lib/question-filter'
import type { ChoiceQuestion } from '../types'

type Props = {
  question: ChoiceQuestion
  /** 同单元题目列表，用于题型内序号 */
  allInUnit?: ChoiceQuestion[]
  showAnswer?: boolean
  /** 错题本：折叠解析；后台查看：直接展示 */
  explainDisplay?: 'off' | 'toggle' | 'open'
  className?: string
}

export function QuestionReadonlyCard({
  question,
  allInUnit,
  showAnswer = true,
  explainDisplay = 'off',
  className = '',
}: Props) {
  const [explainOpen, setExplainOpen] = useState(explainDisplay === 'open')
  const pool = allInUnit?.length ? sortQuestionsByKind(allInUnit) : [question]
  const qKind = questionKind(question)
  const kindIndex = indexWithinKind(pool, question.id)
  const stars = getEffectiveStars(question)
  const correctIdx = correctIndicesForDisplay(question)
  const isJudgment = qKind === 'judgment'
  const opts = isJudgment ? question.options.slice(0, 2) : question.options

  return (
    <article className={`question-readonly card ${className}`.trim()}>
      <p className="muted small">
        {KIND_LABELS[qKind]}
        {stars ? ` · ${starLabel(stars)}` : ''}
      </p>
      <p className="stem">{formatStemWithIndex(kindIndex, question.stem)}</p>
      <ul className={`options readonly${isJudgment ? ' options-judgment' : ''}`}>
        {opts.map((text, i) => {
          const isCorrect = showAnswer && correctIdx.includes(i)
          return (
            <li key={i}>
              <div
                className={
                  isCorrect ? 'option readonly correct' : 'option readonly'
                }
              >
                {isJudgment ? (
                  <span>{text}</span>
                ) : (
                  <>
                    <span className="opt-label">{String.fromCharCode(65 + i)}</span>
                    <span>{text}</span>
                    {isCorrect ? <span className="opt-tag">正解</span> : null}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {question.explanation && explainDisplay !== 'off' ? (
        <div className="explain-block">
          {explainDisplay === 'toggle' ? (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => setExplainOpen((o) => !o)}
            >
              {explainOpen ? '收起解析' : '查看解析'}
            </button>
          ) : null}
          {(explainDisplay === 'open' || explainOpen) ? (
            <p className="explain">{question.explanation}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
