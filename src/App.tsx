import { useCallback, useEffect, useState } from 'react'
import { PracticePanel } from './components/PracticePanel'
import { GateScreen } from './components/GateScreen'
import { InstallHint } from './components/InstallHint'
import { Leaderboard } from './components/Leaderboard'
import { WrongBookList } from './components/WrongBookList'
import { countWrongQuestions } from './lib/wrong-book'
import { QuizSession } from './components/QuizSession'
import { QuizSetup } from './components/QuizSetup'
import { clearSession, getProfile, hasAccessGranted } from './lib/storage'
import { refreshQuestionMetaFromCloud } from './lib/question-meta'
import { isCloudEnabled, syncProgress } from './lib/supabase'
import type { LocalProfile, QuizLaunchConfig } from './types'
import './App.css'

type View =
  | { kind: 'home' }
  | { kind: 'setup'; unitId: string }
  | { kind: 'quiz'; launch: QuizLaunchConfig }

type Tab = 'practice' | 'wrong' | 'rank'

function App() {
  const [profile, setProfile] = useState<LocalProfile | null>(() => {
    if (!hasAccessGranted()) return null
    return getProfile()
  })
  const [view, setView] = useState<View>({ kind: 'home' })
  const [tab, setTab] = useState<Tab>('practice')
  const [online, setOnline] = useState(navigator.onLine)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'ok' | 'fail'>(
    'idle',
  )

  const runSync = useCallback(async (p: LocalProfile) => {
    if (!isCloudEnabled() || !navigator.onLine) return
    setSyncState('syncing')
    const ok = await syncProgress(p)
    setSyncState(ok ? 'ok' : 'fail')
  }, [])

  useEffect(() => {
    function onOnline() {
      setOnline(true)
      const p = getProfile()
      if (p) void runSync(p)
      void refreshQuestionMetaFromCloud()
    }
    function onOffline() {
      setOnline(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [runSync])

  useEffect(() => {
    if (profile) {
      void runSync(profile)
      void refreshQuestionMetaFromCloud()
      void import('./lib/user-sync').then((m) => {
        if (m.canSyncAcrossDevices()) void m.pullAndMergeUserState(profile)
      })
    }
  }, [profile, runSync])

  function handleReady(p: LocalProfile) {
    setProfile(p)
    setView({ kind: 'home' })
  }

  async function handleLogout() {
    if (profile && isCloudEnabled() && navigator.onLine) {
      await syncProgress(profile)
    }
    clearSession()
    setProfile(null)
    setView({ kind: 'home' })
  }

  if (!profile) {
    return <GateScreen onReady={handleReady} />
  }

  const wrongCount = countWrongQuestions()

  return (
    <div className="app-shell">
      <InstallHint />

      <header className="top-bar">
        <div>
          <strong>{profile.nickname}</strong>
          <span className="status-dot" data-online={online} />
          <span className="muted small">
            {online ? (syncState === 'syncing' ? '同步中' : '在线') : '离线'}
          </span>
        </div>
        <button type="button" className="btn ghost small" onClick={handleLogout}>
          退出
        </button>
      </header>

      <main className="main">
        {view.kind === 'quiz' ? (
          <QuizSession
            launch={view.launch}
            onBack={() => setView({ kind: 'home' })}
            onProgress={() => void runSync(profile)}
          />
        ) : view.kind === 'setup' ? (
          <QuizSetup
            unitId={view.unitId}
            onBack={() => setView({ kind: 'home' })}
            onStart={(launch) => setView({ kind: 'quiz', launch })}
          />
        ) : tab === 'practice' ? (
          <PracticePanel
            onOpenSetup={(unitId) => setView({ kind: 'setup', unitId })}
          />
        ) : tab === 'wrong' ? (
          <WrongBookList
            onStart={(launch) => setView({ kind: 'quiz', launch })}
          />
        ) : (
          <Leaderboard />
        )}
      </main>

      {view.kind === 'home' ? (
        <nav className="bottom-nav three">
          <button
            type="button"
            className={tab === 'practice' ? 'nav active' : 'nav'}
            onClick={() => setTab('practice')}
          >
            刷题
          </button>
          <button
            type="button"
            className={tab === 'wrong' ? 'nav active' : 'nav'}
            onClick={() => setTab('wrong')}
          >
            错题本
            {wrongCount > 0 ? <span className="nav-badge">{wrongCount}</span> : null}
          </button>
          <button
            type="button"
            className={tab === 'rank' ? 'nav active' : 'nav'}
            onClick={() => setTab('rank')}
          >
            排行
          </button>
        </nav>
      ) : null}
    </div>
  )
}

export default App
