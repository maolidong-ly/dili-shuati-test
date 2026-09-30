import { useCallback, useEffect, useState } from 'react'
import { resolveQuizUnit, type QuizUnit } from '../data/curriculum'
import { loadMergedQuestionsForUnit } from '../lib/load-unit-questions'
import { isCloudEnabled } from '../lib/supabase'

export function useQuizUnit(unitId: string) {
  const base = resolveQuizUnit(unitId)
  const [unit, setUnit] = useState<QuizUnit | undefined>(base)
  const [loading, setLoading] = useState(isCloudEnabled())
  const [refreshSeq, setRefreshSeq] = useState(0)

  const refetch = useCallback(() => {
    setRefreshSeq((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    const local = resolveQuizUnit(unitId)
    if (!local) {
      setUnit(undefined)
      setLoading(false)
      return
    }
    if (!isCloudEnabled()) {
      void loadMergedQuestionsForUnit(unitId).then((questions) => {
        if (!cancelled) {
          setUnit({ ...local, questions } as QuizUnit)
          setLoading(false)
        }
      })
      return
    }

    async function load() {
      setLoading(true)
      const questions = await loadMergedQuestionsForUnit(unitId)
      if (cancelled || !local) return
      setUnit({ ...local, questions } as QuizUnit)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [unitId, refreshSeq])

  useEffect(() => {
    if (!isCloudEnabled()) return
    const onVis = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refetch])

  return { unit, loading, refetch }
}
