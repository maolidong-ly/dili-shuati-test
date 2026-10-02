import { useState } from 'react'
import { loadMergedQuestionsForUnit } from '../lib/load-unit-questions'
import { applyQuestionMeta } from '../lib/question-meta'
import type { ChoiceQuestion } from '../types'

type Props = {
  unitId: string
  unitTitle: string
  /** 已有题目可传入，避免重复请求 */
  questions?: ChoiceQuestion[]
  includeAnswers: boolean
  compact?: boolean
}

export function UnitExportButtons({
  unitId,
  unitTitle,
  questions: preset,
  includeAnswers,
  compact,
}: Props) {
  const [busy, setBusy] = useState<'docx' | 'pdf' | null>(null)

  async function resolveQuestions(): Promise<ChoiceQuestion[]> {
    if (preset && preset.length > 0) return preset
    return applyQuestionMeta(await loadMergedQuestionsForUnit(unitId))
  }

  async function run(format: 'docx' | 'pdf') {
    setBusy(format)
    try {
      const questions = await resolveQuestions()
      if (questions.length === 0) {
        window.alert('本节暂无题目可导出')
        return
      }
      const opts = { unitTitle, questions, includeAnswers }
      const exp = await import('../lib/export-unit-document')
      if (format === 'docx') await exp.downloadUnitDocx(opts)
      else await exp.downloadUnitPdf(opts)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '导出失败，请稍后重试')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className={compact ? 'unit-export unit-export--compact' : 'unit-export'}
      role="group"
      aria-label="导出题目"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="btn ghost small unit-export-btn"
        disabled={busy !== null}
        title="导出 Word（WPS / Office 可编辑）"
        onClick={() => void run('docx')}
      >
        {busy === 'docx' ? '…' : 'Word'}
      </button>
      <button
        type="button"
        className="btn ghost small unit-export-btn"
        disabled={busy !== null}
        title="导出 PDF"
        onClick={() => void run('pdf')}
      >
        {busy === 'pdf' ? '…' : 'PDF'}
      </button>
    </div>
  )
}
