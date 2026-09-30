import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { listUnitOptions } from '../data/curriculum/unit-options'
import { loadMergedQuestionsForUnit } from '../lib/load-unit-questions'
import {
  groupQuestionsByKind,
  KIND_LABELS,
  nextQuestionIdForKind,
  questionKind,
  sortOrderForKind,
} from '../lib/question-display'
import { getSupabase } from '../lib/supabase'
import type { ChoiceQuestion, QuestionKind } from '../types'

type Props = {
  adminPass: string
}

function QuestionListBlock({
  kind,
  questions,
  onEdit,
  onDelete,
}: {
  kind: QuestionKind
  questions: ChoiceQuestion[]
  onEdit: (q: ChoiceQuestion) => void
  onDelete: (id: string) => void
}) {
  if (questions.length === 0) return null
  return (
    <div className="admin-q-kind-block">
      <h4>
        {KIND_LABELS[kind]}（{questions.length}）
      </h4>
      <ul className="admin-list">
        {questions.map((q, qi) => (
          <li key={q.id} className="admin-row card">
            <div>
              <strong>
                {qi + 1}. {q.stem.slice(0, 56)}
                {q.stem.length > 56 ? '…' : ''}
              </strong>
              <p className="muted small admin-q-id">{q.id}</p>
            </div>
            <div className="admin-row-actions">
              <button
                type="button"
                className="btn ghost small"
                onClick={() => onEdit(q)}
              >
                修改
              </button>
              <button
                type="button"
                className="btn ghost small danger"
                onClick={() => void onDelete(q.id)}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminQuestionsPanel({ adminPass }: Props) {
  const units = useMemo(() => listUnitOptions(), [])
  const [unitId, setUnitId] = useState(units[0]?.id ?? '')
  const [items, setItems] = useState<ChoiceQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listOpen, setListOpen] = useState(true)

  const [id, setId] = useState('')
  const [kind, setKind] = useState<QuestionKind>('single')
  const [stem, setStem] = useState('')
  const [opt0, setOpt0] = useState('')
  const [opt1, setOpt1] = useState('')
  const [opt2, setOpt2] = useState('')
  const [opt3, setOpt3] = useState('')
  const [singleAns, setSingleAns] = useState(0)
  const [multiAns, setMultiAns] = useState<number[]>([])
  const [explanation, setExplanation] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const grouped = useMemo(() => groupQuestionsByKind(items), [items])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  async function reload() {
    if (!unitId) return
    setLoading(true)
    setError('')
    try {
      setItems(await loadMergedQuestionsForUnit(unitId))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setEditingId(null)
    setId('')
    setStem('')
    setExplanation('')
    setOpt0('')
    setOpt1('')
    setOpt2('')
    setOpt3('')
    setSingleAns(0)
    setMultiAns([])
    setKind('single')
  }

  function loadForEdit(q: ChoiceQuestion) {
    const k = questionKind(q)
    setEditingId(q.id)
    setId(q.id)
    setKind(k)
    setStem(q.stem)
    setExplanation(q.explanation ?? '')
    const opts = q.options ?? []
    setOpt0(opts[0] ?? '')
    setOpt1(opts[1] ?? '')
    setOpt2(opts[2] ?? '')
    setOpt3(opts[3] ?? '')
    if (k === 'multiple') {
      setMultiAns(q.answerIndices ?? [])
      setSingleAns(0)
    } else {
      setSingleAns(q.answerIndex ?? 0)
      setMultiAns([])
    }
    if (k === 'judgment') {
      setOpt0(opts[0] || '对')
      setOpt1(opts[1] || '错')
    }
    setListOpen(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onKindChange(next: QuestionKind) {
    setKind(next)
    if (next === 'judgment') {
      setOpt0('对')
      setOpt1('错')
      setOpt2('')
      setOpt3('')
      setSingleAns(0)
      setMultiAns([])
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const supabase = getSupabase()
    if (!supabase) return
    let options: string[]
    if (kind === 'judgment') {
      options = [opt0.trim() || '对', opt1.trim() || '错']
    } else {
      options = [opt0, opt1, opt2, opt3].map((s) => s.trim())
      if (options.some((o) => !o)) {
        setError('请填写四个选项')
        return
      }
    }
    const trimmedId = id.trim()
    const qid =
      trimmedId || editingId || nextQuestionIdForKind(unitId, kind, items)
    const sameKind = items.filter((q) => questionKind(q) === kind)
    const kindIndex =
      trimmedId && items.some((q) => q.id === qid)
        ? sameKind.findIndex((q) => q.id === qid) + 1 || sameKind.length + 1
        : sameKind.length + 1

    const payload: Record<string, unknown> = {
      id: qid,
      unit_id: unitId,
      question_type: kind,
      stem: stem.trim(),
      options,
      explanation: explanation.trim(),
      sort_order: sortOrderForKind(kind, kindIndex),
    }
    if (kind === 'single' || kind === 'judgment') {
      payload.correct_single = singleAns
    } else {
      if (multiAns.length < 2) {
        setError('多选题至少选 2 个正确答案')
        return
      }
      payload.correct_multiple = multiAns
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.rpc('admin_upsert_question', {
      p_admin_passphrase: adminPass,
      p_payload: payload,
    })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    resetForm()
    setItems(await loadMergedQuestionsForUnit(unitId))
    setLoading(false)
    setListOpen(true)
  }

  async function handleDelete(questionId: string) {
    const supabase = getSupabase()
    if (!supabase || !confirm('删除该题？')) return
    setLoading(true)
    const { error: err } = await supabase.rpc('admin_delete_question', {
      p_admin_passphrase: adminPass,
      p_question_id: questionId,
    })
    if (err) setError(err.message)
    else setItems(await loadMergedQuestionsForUnit(unitId))
    setLoading(false)
  }

  function toggleMulti(i: number) {
    setMultiAns((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort(),
    )
  }

  return (
    <div className="admin-questions">
      <div className="admin-toolbar">
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn ghost small" disabled={loading} onClick={() => void reload()}>
          刷新题目
        </button>
      </div>

      <form className="card form-card admin-q-form" onSubmit={handleSave}>
        <h3>{editingId ? '修改题目' : '录入题目'}</h3>
        {editingId ? (
          <p className="muted small">
            正在编辑 <code>{editingId}</code>
            <button type="button" className="btn ghost small inline-cancel" onClick={resetForm}>
              取消编辑
            </button>
          </p>
        ) : null}
        <label>
          题目 ID（可留空，按题型自动生成如 …-single-01）
          <input value={id} onChange={(e) => setId(e.target.value)} />
        </label>
        <label>
          题型
          <select value={kind} onChange={(e) => onKindChange(e.target.value as QuestionKind)}>
            <option value="single">单选题</option>
            <option value="multiple">多选题</option>
            <option value="judgment">判断题</option>
          </select>
        </label>
        <label>
          题干
          <textarea value={stem} onChange={(e) => setStem(e.target.value)} required rows={3} />
        </label>
        {kind === 'judgment' ? (
          <>
            <label>
              选项「对」
              <input value={opt0} onChange={(e) => setOpt0(e.target.value)} required />
            </label>
            <label>
              选项「错」
              <input value={opt1} onChange={(e) => setOpt1(e.target.value)} required />
            </label>
            <label>
              正确答案
              <select value={singleAns} onChange={(e) => setSingleAns(Number(e.target.value))}>
                <option value={0}>{opt0 || '对'}</option>
                <option value={1}>{opt1 || '错'}</option>
              </select>
            </label>
          </>
        ) : (
          <>
            {(
              [
                [opt0, setOpt0],
                [opt1, setOpt1],
                [opt2, setOpt2],
                [opt3, setOpt3],
              ] as const
            ).map(([value, setter], i) => (
              <label key={i}>
                选项 {String.fromCharCode(65 + i)}
                <input
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  required
                />
              </label>
            ))}
            {kind === 'single' ? (
              <label>
                正确答案
                <select value={singleAns} onChange={(e) => setSingleAns(Number(e.target.value))}>
                  {[0, 1, 2, 3].map((i) => (
                    <option key={i} value={i}>
                      {String.fromCharCode(65 + i)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div>
                <span>正确答案（多选）</span>
                <div className="admin-multi-pick">
                  {[0, 1, 2, 3].map((i) => (
                    <label key={i} className="check-inline">
                      <input
                        type="checkbox"
                        checked={multiAns.includes(i)}
                        onChange={() => toggleMulti(i)}
                      />
                      {String.fromCharCode(65 + i)}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <label>
          解析（可选）
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={loading}>
          {editingId ? '保存修改' : '保存题目'}
        </button>
      </form>

      <div className="admin-q-list-wrap">
        <button
          type="button"
          className="btn ghost small admin-q-list-toggle"
          onClick={() => setListOpen((o) => !o)}
        >
          {listOpen ? '▼ 收起本题库题目' : '▶ 展开本题库题目'}（共 {items.length} 题，云端+静态）
        </button>
        {listOpen ? (
          <>
            {items.length === 0 ? (
              <p className="muted admin-empty">该单元暂无题目</p>
            ) : (
              <>
                <QuestionListBlock
                  kind="single"
                  questions={grouped.single}
                  onEdit={loadForEdit}
                  onDelete={handleDelete}
                />
                <QuestionListBlock
                  kind="multiple"
                  questions={grouped.multiple}
                  onEdit={loadForEdit}
                  onDelete={handleDelete}
                />
                <QuestionListBlock
                  kind="judgment"
                  questions={grouped.judgment}
                  onEdit={loadForEdit}
                  onDelete={handleDelete}
                />
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
