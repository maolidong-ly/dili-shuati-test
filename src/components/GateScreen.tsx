import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { GateInstallButton } from './GateInstallButton'
import { loadGateCreds, saveGateCreds } from '../lib/gate-creds'
import {
  applyForNickname,
  enterWithDevice,
  isCloudEnabled,
} from '../lib/supabase'
import { pullAndMergeUserState, canSyncAcrossDevices } from '../lib/user-sync'
import { isWeChatInAppBrowser } from '../lib/browser-storage'
import {
  checkCloudReachability,
  cloudReachabilityHint,
  type CloudReachability,
} from '../lib/cloud-ping'
import {
  getProfile,
  isLoginStorageReady,
  markAccessGranted,
  resetLocalQuizState,
  saveProfile,
} from '../lib/storage'
import { clearLocalAttempts } from '../lib/question-attempts'
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
  const [cloudStatus, setCloudStatus] = useState<CloudReachability | 'checking'>(
    cloud ? 'checking' : 'not_configured',
  )

  useEffect(() => {
    if (!cloud) return
    let cancelled = false
    void checkCloudReachability().then((s) => {
      if (!cancelled) setCloudStatus(s)
    })
    return () => {
      cancelled = true
    }
  }, [cloud])

  function normalizeNicknameInput(raw: string): string {
    return raw.trim().replace(/\u3000/g, ' ').replace(/\s+/g, '')
  }

  async function finishLogin(profile: LocalProfile, restored: boolean) {
    const prev = getProfile()
    const userChanged = !prev || prev.userId !== profile.userId
    if (userChanged) {
      resetLocalQuizState()
      clearWrongBook()
      clearLocalAttempts()
    }

    saveProfile(profile)
    markAccessGranted()
    saveGateCreds({ passphrase, nickname })

    if (canSyncAcrossDevices()) {
      setInfo(restored ? '正在恢复云端进度…' : '正在同步…')
      try {
        await pullAndMergeUserState(profile, 'replace')
        await import('../lib/supabase').then((m) => m.syncProgress(profile))
        setInfo(restored ? '已恢复刷题记录与错题本' : '已同步云端')
      } catch {
        setInfo('已登录；进度同步稍后再试（不影响刷题）')
      }
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
      if (!isLoginStorageReady()) {
        setError(
          '浏览器无法保存登录信息。请关闭无痕/隐私模式，或点右上角「⋯」用 Safari/Chrome 打开。',
        )
        return
      }
      const nick = normalizeNicknameInput(nickname)
      if (nick.length < 2 || nick.length > 16) {
        setError('昵称需 2～16 个字符（不含空格）')
        return
      }

      if (mode === 'apply') {
        const result = await applyForNickname(passphrase, nick)
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

      const result = await enterWithDevice(passphrase, nick)
      if (!result.ok) {
        setError(result.message)
        return
      }
      await finishLogin(result.profile, result.restored)
    } catch (err) {
      console.error(err)
      if (err instanceof Error && err.message === 'storage_unavailable') {
        setError(
          '无法保存登录状态。请关闭隐私模式，或换用系统浏览器打开本页。',
        )
      } else {
        setError('操作失败，请刷新后重试')
      }
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

      {cloud && cloudStatus !== 'checking' ? (
        <p
          className={
            cloudStatus === 'ok'
              ? 'gate-cloud-status ok'
              : 'gate-cloud-status warn'
          }
        >
          {cloudReachabilityHint(cloudStatus)}
        </p>
      ) : null}
      {isWeChatInAppBrowser() ? (
        <p className="gate-wechat-hint">
          检测到微信内打开：若无法登录，请点右上角 <strong>⋯</strong> →{' '}
          <strong>在浏览器中打开</strong>。
        </p>
      ) : null}

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
        {cloud && cloudStatus === 'unreachable' ? (
          <button
            type="button"
            className="btn ghost small"
            disabled={loading}
            onClick={() => {
              setCloudStatus('checking')
              void checkCloudReachability().then(setCloudStatus)
            }}
          >
            重新检测连接
          </button>
        ) : null}
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
