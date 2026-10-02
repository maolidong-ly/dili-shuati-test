import { useEffect, useMemo, useState } from 'react'
import {
  getBookForChapter,
  getQuizUnitLabel,
} from '../data/curriculum'
import { loadCrossUnitQuestions } from '../lib/load-cross-unit-questions'
import { useQuizUnit } from '../hooks/useQuizUnit'
import { filterQuestions, starLabel } from '../lib/question-filter'
import { correctIndicesForDisplay, isAnswerCorrect } from '../lib/question-grade'
import {
  formatStemWithIndex,
  indexWithinKind,
  KIND_LABELS,
  questionKind,
  sortQuestionsByKind,
} from '../lib/question-display'
import { getEffectiveStars } from '../lib/question-meta'
import {
  finishCloudPracticeSession,
  recordCloudSessionAnswer,
  startCloudPracticeSession,
} from '../lib/practice-session'
import { incrementLocalAttempt } from '../lib/question-attempts'
import { playWrongOption } from '../lib/sound'
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
  const [crossQuestions, setCrossQuestions] = useState<ActiveQuestion[]>([])
  const [crossLoading, setCrossLoading] = useState(false)

  useEffect(() => {
    if (!launch.crossUnit || !launch.questionIds?.length) {
      setCrossQuestions([])
      setCrossLoading(false)
      return
    }
    let cancelled = false
    setCrossLoading(true)
    const sources =
      launch.crossUnitSources ??
      launch.questionIds.map((questionId) => ({
        questionId,
        unitId: '',
        unitLabel: '错题',
      }))
    void loadCrossUnitQuestions(sources).then((loaded) => {
      if (cancelled) return
      let list = loaded
      if (launch.startQuestionId) {
        const i = list.findIndex((x) => x.question.id === launch.startQuestionId)
        if (i >= 0) list = list.slice(i)
      }
      setCrossQuestions(
        list.map(({ question, unitId, unitLabel }) => ({
          question,
          unitId,
          unitLabel,
        })),
      )
      setCrossLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [launch.crossUnit, launch.questionIds, launch.crossUnitSources, launch.startQuestionId])

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
      return crossQuestions
    }
    if (!unit) return []
    let filtered = sortQuestionsByKind(
      filterQuestions(
        unit.questions,
        launch.starFilter,
        launch.questionIds,
        launch.kindFilter ?? 'all',
      ),
    )
    if (launch.startQuestionId) {
      const start = filtered.findIndex((q) => q.id === launch.startQuestionId)
      if (start >= 0) filtered = filtered.slice(start)
    }
    const label = getQuizUnitLabel(unit)
    return filtered.map((question) => ({
      question,
      unitId: unit.id,
      unitLabel: label,
    }))
  }, [unit, launch, crossQuestions])

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
  const [flashOptions, setFlashOptions] = useState<Set<number>>(() => new Set())
  const [sessionAnswered, setSessionAnswered] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)

  useEffect(() => {
    setIndex(0)
    setSelectedSingle(null)
    setSelectedMulti([])
    setRevealed(false)
  }, [launch.unitId, launch.startQuestionId, launch.kindFilter, launch.starFilter])

  const chapterIdForCloud =
    unit?.mode === 'chapter' ? unit.chapter.id : ''

  if ((launch.crossUnit && crossLoading) || (!launch.crossUnit && loading)) {
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
            {launch.crossUnit
              ? '错题未能加载，请检查网络后返回重试。'
              : unit && unit.questions.length === 0
                ? '本题库还在录入中，请老师在后台录题。'
                : '当前筛选条件下没有题目，请返回调整题型或错题筛选。'}
          </p>
        </article>
      </div>
    )
  }

  const current = activeQuestions[index]
  const { question, unitId: answerUnitId, unitLabel } = current
  const totals = progressTotals(progress)
  const stars = getEffectiveStars(question)
  const qKind = questionKind(question)
  const kindIndex = indexWithinKind(
    activeQuestions.map((a) => a.question),
    question.id,
  )
  const isMulti = qKind === 'multiple'
  const isJudgment = qKind === 'judgment'
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
      playWrongOption()
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

    incrementLocalAttempt(question.id)
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
      setFlashOptions(new Set())
    }
  }

  function handlePrev() {
    if (index > 0) {
      setIndex(index - 1)
      setSelectedSingle(null)
      setSelectedMulti([])
      setRevealed(false)
      setFlashOptions(new Set())
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

  function flashOption(i: number) {
    setFlashOptions((prev) => new Set(prev).add(i))
    window.setTimeout(() => {
      setFlashOptions((prev) => {
        const next = new Set(prev)
        next.delete(i)
        return next
      })
    }, 480)
  }

  function onPickOption(i: number) {
    if (revealed) return
    flashOption(i)
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

  function judgmentButtonLabel(index: number, text: string): string {
    const t = text.trim()
    if (t === '正确' || t === '对') return '对'
    if (t === '错误' || t === '错') return '错'
    return t || (index === 0 ? '对' : '错')
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
            {KIND_LABELS[qKind]} 第 {kindIndex} 题 · 本次 {index + 1}/{activeQuestions.length}{' '}
            · 正确率{' '}
            {totals.answered === 0
              ? '—'
              : `${Math.round(totals.accuracy * 100)}%`}
          </span>
        </div>
      </header>

      <article className="card question-card">
        {unit?.mode === 'topic' && stars ? (
          <p className="q-stars" aria-label={`${stars} 星`}>
            {starLabel(stars)}
          </p>
        ) : null}
        <p className="stem">
          {isMulti ? '【多选】' : isJudgment ? '【判断】' : ''}
          {formatStemWithIndex(kindIndex, question.stem)}
        </p>
        <ul className={`options${isJudgment ? ' options-judgment' : ''}`}>
          {(isJudgment ? question.options.slice(0, 2) : question.options).map((text, i) => (
            <li key={`${question.id}-${i}`}>
              <button
                type="button"
                className={`${optionClass(i)}${flashOptions.has(i) ? ' option-flash' : ''}${isJudgment ? ' judgment-option' : ''}`}
                disabled={revealed}
                onClick={() => onPickOption(i)}
              >
                {isJudgment ? (
                  <span className="judgment-label">{judgmentButtonLabel(i, text)}</span>
                ) : (
                  <>
                    <span className="opt-label">{String.fromCharCode(65 + i)}</span>
                    <span>{text}</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>

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
