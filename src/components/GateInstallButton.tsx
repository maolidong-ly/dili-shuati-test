import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function GateInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) setInstalled(true)

    function onBip(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (installed) return null

  async function handleClick() {
    if (deferred) {
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null)
      return
    }
    setShowHelp(true)
  }

  return (
    <>
      <button type="button" className="gate-tab gate-install-tab" onClick={() => void handleClick()}>
        添加桌面
      </button>
      {showHelp ? (
        <div className="gate-install-modal" role="dialog" aria-modal="true">
          <div className="gate-install-card card">
            <h3>添加到主屏幕</h3>
            <p className="muted">
              <strong>iPhone / iPad：</strong> Safari 打开本页 → 点底部分享 →「添加到主屏幕」。
            </p>
            <p className="muted">
              <strong>Android：</strong> Chrome 菜单 →「安装应用」或「添加到主屏幕」；若浏览器弹出安装提示，请点允许。
            </p>
            <p className="muted">
              <strong>微信内：</strong> 点右上角「…」→ 在浏览器中打开，再按上面步骤操作。
            </p>
            <button type="button" className="btn primary full" onClick={() => setShowHelp(false)}>
              知道了
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
