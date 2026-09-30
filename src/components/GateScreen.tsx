import { useState } from 'react'
import type { FormEvent } from 'react'
import { isCloudEnabled, registerNickname } from '../lib/supabase'
import { pullAndMergeUserState, canSyncAcrossDevices } from '../lib/user-sync'
import { markAccessGranted, saveProfile } from '../lib/storage'
import type { LocalProfile } from '../types'

type Props = {
  onReady: (profile: LocalProfile) => void
}

export function GateScreen({ onReady }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const result = await registerNickname(passphrase, nickname)
      if (!result.ok) {
        setError(result.message)
        return
      }
      saveProfile(result.profile)
      markAccessGranted()

      if (canSyncAcrossDevices()) {
        setInfo(result.restored ? '正在恢复云端进度…' : '正在创建账号…')
        await pullAndMergeUserState(result.profile)
        await import('../lib/supabase').then((m) =>
          m.syncProgress(result.profile),
        )
        setInfo(
          result.restored
            ? '已恢复该昵称的刷题记录与错题本'
            : '新账号已创建，数据将自动云端备份',
        )
      } else if (result.restored) {
        setInfo('已识别本机昵称，恢复本地进度')
      }

      onReady(result.profile)
    } catch (err) {
      console.error(err)
      setError('进入失败，请刷新后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen gate">
      <header className="gate-brand">
        <img src="/app-icon.png" alt="" width={72} height={72} className="gate-icon" />
        <h1>高中地理刷题</h1>
        <p className="muted">人教版 · 私域练习 · 虚拟昵称</p>
      </header>

      <form className="card form-card" onSubmit={handleSubmit}>
        <label>
          访问口令
          <input
            type="password"
            autoComplete="off"
            placeholder="向老师索取"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            required
          />
        </label>
        <label>
          虚拟昵称
          <input
            type="text"
            autoComplete="nickname"
            placeholder="2～16 字，换机输入同一昵称可续刷"
            maxLength={16}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {info ? <p className="info">{info}</p> : null}
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? '验证中…' : '开始刷题'}
        </button>
      </form>

      {import.meta.env.DEV && !isCloudEnabled() ? (
        <p className="hint dev-hint">
          本地预览口令：<code>{import.meta.env.VITE_DEV_ACCESS_PASSPHRASE ?? '未加载'}</code>
          。未接 Supabase 时<strong>仅本机</strong>同昵称可续用；换手机需部署云端。
        </p>
      ) : (
        <p className="hint">
          已注册过的昵称 + 口令即可恢复进度。添加到主屏幕后可像 App 一样使用。
        </p>
      )}
    </div>
  )
}
