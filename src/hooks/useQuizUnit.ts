import { useEffect, useState } from 'react'
import { resolveQuizUnit, type QuizUnit } from '../data/curriculum'
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
      setUnit(local)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      const cloud = await fetchCloudQuestionsForUnit(unitId)
      if (cancelled || !local) return
      const merged = mergeQuestionLists(local.questions, cloud)
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
