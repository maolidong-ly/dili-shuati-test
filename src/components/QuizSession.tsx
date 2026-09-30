import { useEffect, useMemo, useState } from 'react'
import {
  collectQuestionsByIds,
  getBookForChapter,
  getQuizUnitLabel,
} from '../data/curriculum'
import { useQuizUnit } from '../hooks/useQuizUnit'
import { filterQuestions, starLabel } from '../lib/question-filter'
import { correctIndicesForDisplay, isAnswerCorrect } from '../lib/question-grade'
import { getEffectiveStars } from '../lib/question-meta'
import {
  finishCloudPracticeSession,
  recordCloudSessionAnswer,
  startCloudPracticeSession,
} from '../lib/practice-session'
import { getChapterProgress, progressTotals, recordAnswer } from '../lib/storage'
import {
  inferWrongBookKind,
  recordWrongAttempt,
  removeFromWrongBook,
} from '../lib/wrong-book'
import type { ChoiceQuestion, LocalProfile, QuizLaunchConfig } from '../types'

type Props = {
  launch: QuizLaunchConfig
  profile: LocalProfile
  onBack: () => void
  onProgress: () => void
}

type ActiveQuestion = {
  question: ChoiceQuestion
  unitId: string
  unitLabel: string
}

export function QuizSession({ launch, profile, onBack, onProgress }: Props) {
  const { unit, loading } = useQuizUnit(launch.unitId)
  const book =
    unit?.mode === 'chapter' ? getBookForChapter(unit.chapter.id) : undefined

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionEnded, setSessionEnded] = useState<{
    score: number
    answered: number
    correct: number
  } | null>(null)

  useEffect(() => {
    if (launch.crossUnit || !unit) return
    let cancelled = false
    void startCloudPracticeSession(profile, launch.unitId).then((id) => {
      if (!cancelled) setSessionId(id)
    })
    return () => {
      cancelled = true
    }
  }, [launch.crossUnit, launch.unitId, profile, unit])

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
  const [selectedSingle, setSelectedSingle] = useState<number | null>(null)
  const [selectedMulti, setSelectedMulti] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [sessionAnswered, setSessionAnswered] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)

  const chapterIdForCloud =
    unit?.mode === 'chapter' ? unit.chapter.id : ''

  if (!launch.crossUnit && loading) {
    return (
      <div className="screen">
        <p className="muted">正在加载题目…</p>
      </div>
    )
  }

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

  if (sessionEnded) {
    return (
      <div className="screen quiz">
        <article className="card empty-card">
          <h2>本次练习结束</h2>
          <p>
            当次得分：<strong>{sessionEnded.score}%</strong>（{sessionEnded.correct}/
            {sessionEnded.answered}）
          </p>
          <p className="muted small">当次分数不计入排行榜</p>
          <button type="button" className="btn primary" onClick={onBack}>
            返回
          </button>
        </article>
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
              ? '本题库还在录入中，请老师在后台录题。'
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
  const isMulti = (question.kind ?? 'single') === 'multiple'
  const correctIdx = correctIndicesForDisplay(question)

  function handleReveal() {
    if (revealed) return
    const selected: number | number[] | null = isMulti
      ? selectedMulti
      : selectedSingle
    if (selected === null || (isMulti && selectedMulti.length === 0)) return

    const correct = isAnswerCorrect(question, selected)
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

    setSessionAnswered((n) => n + 1)
    if (correct) setSessionCorrect((n) => n + 1)

    if (sessionId) {
      void recordCloudSessionAnswer(
        profile,
        sessionId,
        question.id,
        correct,
        chapterIdForCloud,
      )
    }

    setRevealed(true)
    onProgress()
  }

  async function handleFinish() {
    if (sessionId) {
      const result = await finishCloudPracticeSession(profile, sessionId)
      if (result) {
        setSessionEnded({
          score: Number(result.session_score),
          answered: result.answered,
          correct: result.correct,
        })
        return
      }
    }
    const answered = sessionAnswered
    const correct = sessionCorrect
    setSessionEnded({
      score: answered === 0 ? 0 : Math.round((correct / answered) * 100),
      answered,
      correct,
    })
  }

  function handleNext() {
    if (index < activeQuestions.length - 1) {
      setIndex(index + 1)
      setSelectedSingle(null)
      setSelectedMulti([])
      setRevealed(false)
    }
  }

  function handlePrev() {
    if (index > 0) {
      setIndex(index - 1)
      setSelectedSingle(null)
      setSelectedMulti([])
      setRevealed(false)
    }
  }

  function optionClass(i: number) {
    if (!revealed) {
      if (isMulti) return selectedMulti.includes(i) ? 'option selected' : 'option'
      return selectedSingle === i ? 'option selected' : 'option'
    }
    if (correctIdx.includes(i)) return 'option correct'
    const picked = isMulti ? selectedMulti.includes(i) : selectedSingle === i
    if (picked && !correctIdx.includes(i)) return 'option wrong'
    return 'option'
  }

  function onPickOption(i: number) {
    if (revealed) return
    if (isMulti) {
      setSelectedMulti((prev) =>
        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort(),
      )
    } else {
      setSelectedSingle(i)
    }
  }

  const atLast = index >= activeQuestions.length - 1
  const canSubmit = isMulti ? selectedMulti.length > 0 : selectedSingle !== null

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
        <p className="stem">
          {isMulti ? '【多选】' : ''}
          {question.stem}
        </p>
        <ul className="options">
          {question.options.map((text, i) => (
            <li key={`${question.id}-${i}`}>
              <button
                type="button"
                className={optionClass(i)}
                disabled={revealed}
                onClick={() => onPickOption(i)}
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
              disabled={!canSubmit}
              onClick={handleReveal}
            >
              提交答案
            </button>
          ) : atLast ? (
            <button type="button" className="btn primary" onClick={() => void handleFinish()}>
              结束练习
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={handleNext}>
              下一题
            </button>
          )}
        </div>
        {revealed && !atLast ? (
          <button
            type="button"
            className="btn ghost full finish-inline"
            onClick={() => void handleFinish()}
          >
            提前结束练习
          </button>
        ) : null}
      </article>
    </div>
  )
}
