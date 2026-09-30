import { useMemo, useState } from 'react'
import { collectQuestionsByIds, getBookForChapter, getQuizUnitLabel, resolveQuizUnit } from '../data/curriculum'
import { filterQuestions, starLabel } from '../lib/question-filter'
import { getEffectiveStars } from '../lib/question-meta'
import { getChapterProgress, progressTotals, recordAnswer } from '../lib/storage'
import {
  inferWrongBookKind,
  recordWrongAttempt,
  removeFromWrongBook,
} from '../lib/wrong-book'
import type { ChoiceQuestion, QuizLaunchConfig } from '../types'

type Props = {
  launch: QuizLaunchConfig
  onBack: () => void
  onProgress: () => void
}

type ActiveQuestion = {
  question: ChoiceQuestion
  unitId: string
  unitLabel: string
}

export function QuizSession({ launch, onBack, onProgress }: Props) {
  const unit = resolveQuizUnit(launch.unitId)
  const book =
    unit?.mode === 'chapter' ? getBookForChapter(unit.chapter.id) : undefined

  const activeQuestions: ActiveQuestion[] = useMemo(() => {
    if (launch.crossUnit && launch.questionIds?.length) {
      return collectQuestionsByIds(launch.questionIds).map((ref) => ({
        question: ref.question,
        unitId: ref.unitId,
        unitLabel: ref.unitLabel,
      }))
    }
    if (!unit) return []
    const filtered = filterQuestions(
      unit.questions,
      launch.starFilter,
      launch.questionIds,
    )
    const label = getQuizUnitLabel(unit)
    return filtered.map((question) => ({
      question,
      unitId: unit.id,
      unitLabel: label,
    }))
  }, [unit, launch])

  const storageKey = launch.crossUnit ? 'cross-unit' : (unit?.id ?? launch.unitId)
  const allowRetry = Boolean(
    launch.wrongOnly || launch.questionIds?.length || launch.crossUnit,
  )

  const initialProgress = useMemo(
    () => getChapterProgress(storageKey),
    [storageKey],
  )
  const [progress, setProgress] = useState(initialProgress)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  if (!launch.crossUnit && !unit) {
    return (
      <div className="screen">
        <p>目录项不存在</p>
        <button type="button" className="btn" onClick={onBack}>
          返回
        </button>
      </div>
    )
  }

  if (activeQuestions.length === 0) {
    return (
      <div className="screen quiz-empty">
        <header className="quiz-header">
          <button type="button" className="btn ghost" onClick={onBack}>
            ← 返回
          </button>
        </header>
        <article className="card empty-card">
          {unit && unit.mode === 'chapter' ? (
            <>
              <p className="empty-label">
                {book?.volumeLabel} · {unit.chapter.title}
              </p>
              <h2>{unit.section?.title ?? unit.title}</h2>
            </>
          ) : unit && unit.mode === 'topic' ? (
            <>
              <p className="empty-label">按考点 · {unit.categoryTitle}</p>
              <h2>{unit.topicTitle}</h2>
            </>
          ) : (
            <h2>错题练习</h2>
          )}
          <p className="muted">
            {unit && unit.questions.length === 0
              ? '本题库还在录入中。'
              : '当前筛选条件下没有题目，请返回调整星级或错题筛选。'}
          </p>
        </article>
      </div>
    )
  }

  const current = activeQuestions[index]
  const { question, unitId: answerUnitId, unitLabel } = current
  const totals = progressTotals(progress)
  const stars = getEffectiveStars(question)

  function handleReveal() {
    if (selected === null || revealed) return
    const correct = selected === question.answerIndex
    const progressKey = launch.crossUnit ? answerUnitId : storageKey
    const next = recordAnswer(progressKey, question.id, correct, { allowRetry })
    setProgress(next)

    if (!correct) {
      recordWrongAttempt({
        questionId: question.id,
        unitId: answerUnitId,
        unitLabel,
        kind: inferWrongBookKind(answerUnitId),
        stemPreview:
          question.stem.length > 48
            ? `${question.stem.slice(0, 48)}…`
            : question.stem,
      })
    } else {
      removeFromWrongBook(question.id)
    }

    setRevealed(true)
    onProgress()
  }

  function handleNext() {
    if (index < activeQuestions.length - 1) {
      setIndex(index + 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  function handlePrev() {
    if (index > 0) {
      setIndex(index - 1)
      setSelected(null)
      setRevealed(false)
    }
  }

  const optionClass = (i: number) => {
    if (!revealed) {
      return selected === i ? 'option selected' : 'option'
    }
    if (i === question.answerIndex) return 'option correct'
    if (selected === i && i !== question.answerIndex) return 'option wrong'
    return 'option'
  }

  return (
    <div className="screen quiz">
      <header className="quiz-header">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← 返回
        </button>
        <div className="quiz-meta">
          <span>{unitLabel}</span>
          <span>
            第 {index + 1}/{activeQuestions.length} 题 · 正确率{' '}
            {totals.answered === 0
              ? '—'
              : `${Math.round(totals.accuracy * 100)}%`}
          </span>
        </div>
      </header>

      <article className="card question-card">
        {stars ? (
          <p className="q-stars" aria-label={`${stars} 星`}>
            {starLabel(stars)}
          </p>
        ) : null}
        <p className="stem">{question.stem}</p>
        <ul className="options">
          {question.options.map((text, i) => (
            <li key={text}>
              <button
                type="button"
                className={optionClass(i)}
                disabled={revealed}
                onClick={() => setSelected(i)}
              >
                <span className="opt-label">{String.fromCharCode(65 + i)}</span>
                <span>{text}</span>
              </button>
            </li>
          ))}
        </ul>

        {revealed && question.explanation ? (
          <p className="explain">{question.explanation}</p>
        ) : null}

        <div className="quiz-actions">
          <button
            type="button"
            className="btn"
            onClick={handlePrev}
            disabled={index === 0}
          >
            上一题
          </button>
          {!revealed ? (
            <button
              type="button"
              className="btn primary"
              disabled={selected === null}
              onClick={handleReveal}
            >
              提交答案
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              onClick={handleNext}
              disabled={index >= activeQuestions.length - 1}
            >
              下一题
            </button>
          )}
        </div>
      </article>
    </div>
  )
}
