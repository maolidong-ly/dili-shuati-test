import { useEffect, useRef, useState } from 'react'
import { APP_FONTS, applyFont, getStoredFont, setStoredFont, type AppFontId } from '../lib/font'
import { bindGlobalUiClickSound, isSoundEnabled, setSoundEnabled } from '../lib/sound'
import {
  APP_THEMES,
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  type AppThemeId,
} from '../lib/theme'

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [themeId, setThemeId] = useState<AppThemeId>(() => getStoredTheme())
  const [fontId, setFontId] = useState<AppFontId>(() => getStoredFont())
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  useEffect(() => {
    applyFont(fontId)
  }, [fontId])

  useEffect(() => {
    return bindGlobalUiClickSound()
  }, [])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setAppearanceOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
  }

  return (
    <div className="theme-switcher feature-menu" ref={rootRef}>
      <button
        type="button"
        className="btn ghost small theme-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="功能"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙️ 功能
      </button>
      {open ? (
        <div className="theme-menu theme-panel feature-panel" role="dialog" aria-label="功能设置">
          <button
            type="button"
            className="feature-row"
            aria-expanded={appearanceOpen}
            onClick={() => setAppearanceOpen((o) => !o)}
          >
            <span>🎨 外观</span>
            <span className="muted small">{appearanceOpen ? '▼' : '▶'}</span>
          </button>
          {appearanceOpen ? (
            <div className="feature-appearance">
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
                      className={
                        fontId === f.id ? 'theme-font-btn active' : 'theme-font-btn'
                      }
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

          <div className="feature-row feature-row--sound">
            <span>🔊 点击音效</span>
            <button
              type="button"
              className={soundOn ? 'toggle-pill on' : 'toggle-pill'}
              aria-pressed={soundOn}
              onClick={toggleSound}
            >
              {soundOn ? '开' : '关'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
