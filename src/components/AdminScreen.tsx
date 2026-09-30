import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  adminDeleteProfile,
  adminListProfiles,
  adminSetStatus,
} from '../lib/admin-api'
import { isCloudEnabled } from '../lib/supabase'
import type { AdminProfileRow } from '../types'
import { AdminQuestionsPanel } from './AdminQuestionsPanel'
import { AdminStudentReport } from './AdminStudentReport'

const ADMIN_KEY = 'geoquiz.admin-pass.v1'

type Props = {
  onClose: () => void
}

export function AdminScreen({ onClose }: Props) {
  const [adminPass, setAdminPass] = useState(() => sessionStorage.getItem(ADMIN_KEY) ?? '')
  const [loggedIn, setLoggedIn] = useState(false)
  const [rows, setRows] = useState<AdminProfileRow[]>([])
  const [section, setSection] = useState<'accounts' | 'questions'>('accounts')
  const [questionCatalog, setQuestionCatalog] = useState<'chapter' | 'topic'>('chapter')
  const [viewStudent, setViewStudent] = useState<AdminProfileRow | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'disabled'>('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (pass: string) => {
    setLoading(true)
    setError('')
    try {
      const list = await adminListProfiles(pass)
      setRows(list)
      setLoggedIn(true)
      sessionStorage.setItem(ADMIN_KEY, pass)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
      setLoggedIn(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (adminPass && isCloudEnabled()) void load(adminPass)
  }, [adminPass, load])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    await load(adminPass)
  }

  async function setStatus(id: string, status: 'pending' | 'active' | 'disabled') {
    if (!adminPass) return
    setLoading(true)
    try {
      await adminSetStatus(adminPass, id, status)
      await load(adminPass)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string, nickname: string) {
    if (!adminPass) return
    if (!confirm(`确定删除「${nickname}」？进度与错题将全部清除。`)) return
    setLoading(true)
    try {
      await adminDeleteProfile(adminPass, id)
      await load(adminPass)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    } finally {
      setLoading(false)
    }
  }

  const shown = rows.filter((r) => filter === 'all' || r.status === filter)

  if (!isCloudEnabled()) {
    return (
      <div className="screen gate">
        <p className="error">未配置 Supabase，无法使用老师后台。</p>
        <button type="button" className="btn ghost" onClick={onClose}>
          返回
        </button>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div className="screen gate">
        <header className="gate-brand">
          <h1>老师后台</h1>
          <p className="muted">账号审核与管理（P1）</p>
        </header>
        <form className="card form-card" onSubmit={handleLogin}>
          <label>
            后台口令
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              required
            />
          </label>
          {error ? <p className="error">{error.includes('forbidden') ? '后台口令不正确' : error}</p> : null}
          <button type="submit" className="btn primary" disabled={loading}>
            进入
          </button>
        </form>
        <button type="button" className="btn ghost small" onClick={onClose}>
          返回学生端
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell admin-shell">
      <header className="top-bar">
        <strong>老师后台</strong>
        <button type="button" className="btn ghost small" onClick={onClose}>
          返回
        </button>
      </header>

      <div className="gate-tabs admin-section-tabs">
        <button
          type="button"
          className={section === 'accounts' ? 'gate-tab active' : 'gate-tab'}
          onClick={() => setSection('accounts')}
        >
          账号
        </button>
        <button
          type="button"
          className={section === 'questions' ? 'gate-tab active' : 'gate-tab'}
          onClick={() => setSection('questions')}
        >
          录题
        </button>
      </div>

      {viewStudent ? (
        <AdminStudentReport
          adminPass={adminPass}
          profileId={viewStudent.id}
          nickname={viewStudent.nickname}
          onBack={() => setViewStudent(null)}
        />
      ) : section === 'questions' ? (
        <>
          <div className="gate-tabs admin-sub-tabs">
            <button
              type="button"
              className={questionCatalog === 'chapter' ? 'gate-tab active' : 'gate-tab'}
              onClick={() => setQuestionCatalog('chapter')}
            >
              章节录题
            </button>
            <button
              type="button"
              className={questionCatalog === 'topic' ? 'gate-tab active' : 'gate-tab'}
              onClick={() => setQuestionCatalog('topic')}
            >
              考点录题
            </button>
          </div>
          <AdminQuestionsPanel adminPass={adminPass} catalogKind={questionCatalog} />
        </>
      ) : (
        <>
      <div className="admin-toolbar">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
        >
          <option value="all">全部</option>
          <option value="pending">待审核</option>
          <option value="active">已通过</option>
          <option value="disabled">已禁用</option>
        </select>
        <button
          type="button"
          className="btn ghost small"
          disabled={loading}
          onClick={() => void load(adminPass)}
        >
          刷新
        </button>
      </div>

      {error ? <p className="error admin-error">{error}</p> : null}

      <ul className="admin-list">
        {shown.map((row) => (
          <li key={row.id} className="admin-row card">
            <div>
              <strong>{row.nickname}</strong>
              <span className={`admin-badge status-${row.status}`}>{row.status}</span>
            </div>
            <div className="admin-actions">
              <button
                type="button"
                className="btn ghost small"
                disabled={loading}
                onClick={() => setViewStudent(row)}
              >
                查看
              </button>
              {row.status === 'pending' ? (
                <button
                  type="button"
                  className="btn primary small"
                  disabled={loading}
                  onClick={() => void setStatus(row.id, 'active')}
                >
                  通过
                </button>
              ) : null}
              {row.status === 'active' ? (
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={loading}
                  onClick={() => void setStatus(row.id, 'disabled')}
                >
                  禁用
                </button>
              ) : null}
              {row.status === 'disabled' ? (
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={loading}
                  onClick={() => void setStatus(row.id, 'active')}
                >
                  启用
                </button>
              ) : null}
              <button
                type="button"
                className="btn ghost small danger"
                disabled={loading}
                onClick={() => void remove(row.id, row.nickname)}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {shown.length === 0 ? <p className="muted admin-empty">暂无记录</p> : null}
        </>
      )}
    </div>
  )
}
