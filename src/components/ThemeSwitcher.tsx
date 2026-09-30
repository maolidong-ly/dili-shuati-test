import { useEffect, useRef, useState } from 'react'
import { APP_FONTS, applyFont, getStoredFont, setStoredFont, type AppFontId } from '../lib/font'
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
  const [fontId, setFontId] = useState<AppFontId>(() => getStoredFont())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  useEffect(() => {
    applyFont(fontId)
  }, [fontId])

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
        aria-haspopup="dialog"
        title="外观"
        onClick={() => setOpen((o) => !o)}
      >
        {current.emoji} 外观
      </button>
      {open ? (
        <div className="theme-menu theme-panel" role="dialog" aria-label="外观设置">
          <p className="theme-panel-title">配色</p>
          <ul className="theme-swatches">
            {APP_THEMES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={
                    t.id === themeId ? 'theme-swatch active' : 'theme-swatch'
                  }
                  data-theme-preview={t.id}
                  onClick={() => {
                    setThemeId(t.id)
                    setStoredTheme(t.id)
                  }}
                >
                  <span className="theme-swatch-emoji">{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="theme-panel-title">字体</p>
          <ul className="theme-font-list">
            {APP_FONTS.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={fontId === f.id ? 'theme-font-btn active' : 'theme-font-btn'}
                  onClick={() => {
                    setFontId(f.id)
                    setStoredFont(f.id)
                  }}
                >
                  {f.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
