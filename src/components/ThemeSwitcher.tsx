import { useEffect, useRef, useState } from 'react'
import {
  APP_THEMES,
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  type AppThemeId,
} from '../lib/theme'

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [themeId, setThemeId] = useState<AppThemeId>(() => getStoredTheme())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const current = APP_THEMES.find((t) => t.id === themeId) ?? APP_THEMES[0]

  return (
    <div className="theme-switcher" ref={rootRef}>
      <button
        type="button"
        className="btn ghost small theme-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        title="换肤"
        onClick={() => setOpen((o) => !o)}
      >
        {current.emoji} 皮肤
      </button>
      {open ? (
        <ul className="theme-menu" role="listbox" aria-label="选择皮肤">
          {APP_THEMES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="option"
                aria-selected={t.id === themeId}
                className={t.id === themeId ? 'theme-option active' : 'theme-option'}
                onClick={() => {
                  setThemeId(t.id)
                  setStoredTheme(t.id)
                  setOpen(false)
                }}
              >
                <span>{t.emoji}</span> {t.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
