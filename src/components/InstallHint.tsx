import { useEffect, useState } from 'react'

export function InstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIos) setShow(true)
  }, [])

  if (!show) return null

  return (
    <aside className="install-hint">
      iPhone：Safari 中点 <strong>分享</strong> → <strong>添加到主屏幕</strong>，
      即可像 App 一样打开。
      <button type="button" className="link-btn" onClick={() => setShow(false)}>
        知道了
      </button>
    </aside>
  )
}
