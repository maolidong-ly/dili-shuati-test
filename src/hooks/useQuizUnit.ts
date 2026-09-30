import { useEffect, useState } from 'react'
import { resolveQuizUnit, type QuizUnit } from '../data/curriculum'
import { sortQuestionsById } from '../lib/question-display'
import { fetchCloudQuestionsForUnit, mergeQuestionLists } from '../lib/questions-cloud'
import { isCloudEnabled } from '../lib/supabase'

export function useQuizUnit(unitId: string) {
  const base = resolveQuizUnit(unitId)
  const [unit, setUnit] = useState<QuizUnit | undefined>(base)
  const [loading, setLoading] = useState(isCloudEnabled())

  useEffect(() => {
    let cancelled = false
    const local = resolveQuizUnit(unitId)
    if (!local) {
      setUnit(undefined)
      setLoading(false)
      return
    }
    if (!isCloudEnabled()) {
      const questions = [...local.questions]
      sortQuestionsById(questions)
      setUnit({ ...local, questions } as QuizUnit)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      const cloud = await fetchCloudQuestionsForUnit(unitId)
      if (cancelled || !local) return
      const merged = mergeQuestionLists(local.questions, cloud)
      sortQuestionsById(merged)
      setUnit({ ...local, questions: merged } as QuizUnit)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [unitId])

  return { unit, loading }
}
