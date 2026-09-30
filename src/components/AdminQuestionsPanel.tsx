import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { listUnitOptions } from '../data/curriculum/unit-options'
import { fetchCloudQuestionsForUnit } from '../lib/questions-cloud'
import { getSupabase } from '../lib/supabase'
import type { QuestionKind } from '../types'

type Props = {
  adminPass: string
}

export function AdminQuestionsPanel({ adminPass }: Props) {
  const units = useMemo(() => listUnitOptions(), [])
  const [unitId, setUnitId] = useState(units[0]?.id ?? '')
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchCloudQuestionsForUnit>>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  async function reload() {
    if (!unitId) return
    setLoading(true)
    setError('')
    try {
      setItems(await fetchCloudQuestionsForUnit(unitId))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  function onKindChange(next: QuestionKind) {
    setKind(next)
    if (next === 'judgment') {
      setOpt0('正确')
      setOpt1('错误')
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
      options = [opt0.trim() || '正确', opt1.trim() || '错误']
    } else {
      options = [opt0, opt1, opt2, opt3].map((s) => s.trim())
      if (options.some((o) => !o)) {
        setError('请填写四个选项')
        return
      }
    }
    const qid = id.trim() || `${unitId}-q-${Date.now()}`
    const payload: Record<string, unknown> = {
      id: qid,
      unit_id: unitId,
      question_type: kind,
      stem: stem.trim(),
      options,
      explanation: explanation.trim(),
      sort_order: 0,
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
    setId('')
    setStem('')
    setExplanation('')
    await reload()
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
    else await reload()
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
        <h3>录入题目</h3>
        <label>
          题目 ID（可留空自动生成）
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
              选项 A
              <input value={opt0} onChange={(e) => setOpt0(e.target.value)} required />
            </label>
            <label>
              选项 B
              <input value={opt1} onChange={(e) => setOpt1(e.target.value)} required />
            </label>
            <label>
              正确答案
              <select value={singleAns} onChange={(e) => setSingleAns(Number(e.target.value))}>
                <option value={0}>A（{opt0 || '正确'}）</option>
                <option value={1}>B（{opt1 || '错误'}）</option>
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
          保存题目
        </button>
      </form>

      <ul className="admin-list">
        {items.map((q) => (
          <li key={q.id} className="admin-row card">
            <div>
              <strong>
                {q.kind === 'multiple'
                  ? '【多选】'
                  : q.kind === 'judgment'
                    ? '【判断】'
                    : '【单选】'}
              </strong>{' '}
              {q.stem.slice(0, 48)}
            </div>
            <button type="button" className="btn ghost small danger" onClick={() => void handleDelete(q.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 ? <p className="muted admin-empty">该单元暂无云端题目</p> : null}
    </div>
  )
}
