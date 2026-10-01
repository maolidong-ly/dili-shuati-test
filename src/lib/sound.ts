const KEY = 'geoquiz.sound.v1'

const base = `${import.meta.env.BASE_URL}sounds/`

const SOUND = {
  click: `${base}dianjiynxiao.mp3`,
  loginSuccess: `${base}dengluchenggong.mp3`,
  wrongOption: `${base}xuanxiangcuowu.wav`,
} as const

export function isSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? '1' : '0')
}

function playFile(src: string) {
  if (!isSoundEnabled()) return
  try {
    const audio = new Audio(src)
    audio.volume = 0.85
    void audio.play().catch(() => {})
  } catch {
    /* ignore */
  }
}

/** 按钮 / 导航等点击 */
export function playUiClick() {
  playFile(SOUND.click)
}

/** 登录成功 */
export function playLoginSuccess() {
  playFile(SOUND.loginSuccess)
}

/** 提交后答错 */
export function playWrongOption() {
  playFile(SOUND.wrongOption)
}

export function bindGlobalUiClickSound() {
  if (typeof document === 'undefined') return () => {}
  function onClick(e: MouseEvent) {
    const el = e.target as HTMLElement | null
    if (!el) return
    if (el.closest('[data-silent-click]')) return
    const interactive = el.closest(
      'button, a, .option, .filter-chip, .q-picker-cell, .nav, .section-row, .chapter-toggle',
    )
    if (interactive) playUiClick()
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
