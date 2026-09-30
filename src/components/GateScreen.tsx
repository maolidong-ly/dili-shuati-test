import { useState } from 'react'
import type { FormEvent } from 'react'
import { GateInstallButton } from './GateInstallButton'
import { loadGateCreds, saveGateCreds } from '../lib/gate-creds'
import {
  applyForNickname,
  enterWithDevice,
  isCloudEnabled,
} from '../lib/supabase'
import { pullAndMergeUserState, canSyncAcrossDevices } from '../lib/user-sync'
import {
  getProfile,
  markAccessGranted,
  resetLocalQuizState,
  saveProfile,
} from '../lib/storage'
import { clearWrongBook } from '../lib/wrong-book'
import type { LocalProfile } from '../types'

type Props = {
  onReady: (profile: LocalProfile) => void
}

type GateMode = 'login' | 'apply'

export function GateScreen({ onReady }: Props) {
  const cloud = isCloudEnabled()
  const [mode, setMode] = useState<GateMode>(cloud ? 'login' : 'login')
  const saved = loadGateCreds()
  const [passphrase, setPassphrase] = useState(saved.passphrase)
  const [nickname, setNickname] = useState(saved.nickname)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function finishLogin(profile: LocalProfile, restored: boolean) {
    const prev = getProfile()
    const userChanged = !prev || prev.userId !== profile.userId
    if (userChanged) {
      resetLocalQuizState()
      clearWrongBook()
    }

    saveProfile(profile)
    markAccessGranted()
    saveGateCreds({ passphrase, nickname })

    if (canSyncAcrossDevices()) {
      setInfo(restored ? '正在恢复云端进度…' : '正在同步…')
      await pullAndMergeUserState(profile, userChanged ? 'replace' : 'merge')
      await import('../lib/supabase').then((m) => m.syncProgress(profile))
      setInfo(restored ? '已恢复刷题记录与错题本' : '已同步云端')
    } else if (restored && !userChanged) {
      setInfo('已识别本机昵称，恢复本地进度')
    }

    onReady(profile)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'apply') {
        const result = await applyForNickname(passphrase, nickname)
        if (!result.ok) {
          if (result.code === 'pending_approval') {
            setInfo(result.message)
            return
          }
          setError(result.message)
          return
        }
        await finishLogin(result.profile, result.restored)
        return
      }

      const result = await enterWithDevice(passphrase, nickname)
      if (!result.ok) {
        setError(result.message)
        return
      }
      await finishLogin(result.profile, result.restored)
    } catch (err) {
      console.error(err)
      setError('操作失败，请刷新后重试')
    } finally {
      setLoading(false)
    }
  }

  const iconSrc = `${import.meta.env.BASE_URL}app-icon.png`

  return (
    <div className="screen gate">
      <header className="gate-brand">
        <img src={iconSrc} alt="" width={72} height={72} className="gate-icon" />
        <h1>高中地理知识点刷记</h1>
        <p className="gate-tagline">夯实基础 · 厚积薄发</p>
      </header>

      {cloud ? (
        <div className="gate-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'gate-tab active' : 'gate-tab'}
            onClick={() => {
              setMode('login')
              setError('')
              setInfo('')
            }}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === 'apply' ? 'gate-tab active' : 'gate-tab'}
            onClick={() => {
              setMode('apply')
              setError('')
              setInfo('')
            }}
          >
            申请账号
          </button>
          <GateInstallButton />
        </div>
      ) : (
        <div className="gate-tabs">
          <GateInstallButton />
        </div>
      )}

      <form className="card form-card" onSubmit={handleSubmit}>
        <label>
          访问口令
          <input
            type="password"
            autoComplete="off"
            placeholder="向老师索取"
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value)
              saveGateCreds({ passphrase: e.target.value, nickname })
            }}
            required
          />
        </label>
        <label>
          虚拟昵称
          <input
            type="text"
            autoComplete="nickname"
            placeholder={
              mode === 'apply'
                ? '2～16 字，提交后等老师审核'
                : '2～16 字，仅已通过的账号可登录'
            }
            maxLength={16}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              saveGateCreds({ passphrase, nickname: e.target.value })
            }}
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {info ? <p className="info">{info}</p> : null}
        <button type="submit" className="btn primary" disabled={loading}>
          {loading
            ? '处理中…'
            : mode === 'apply'
              ? '提交申请'
              : '开始刷题'}
        </button>
      </form>

      {import.meta.env.DEV && !cloud ? (
        <p className="hint dev-hint">
          本地预览口令：<code>{import.meta.env.VITE_DEV_ACCESS_PASSPHRASE ?? '未加载'}</code>
        </p>
      ) : (
        <p className="hint">
          {cloud
            ? '新同学请先申请账号；通过后在本机登录。同一账号仅一台设备在线。'
            : '已注册昵称 + 口令即可使用。'}
        </p>
      )}
    </div>
  )
}
