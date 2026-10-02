const KEY = 'geoquiz.sound.v1'

const base = `${import.meta.env.BASE_URL}sounds/`

const WRONG_OPTION_SRC = `${base}xuanxiangcuowu.wav`

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

/** 提交后答错 */
export function playWrongOption() {
  if (!isSoundEnabled()) return
  try {
    const audio = new Audio(WRONG_OPTION_SRC)
    audio.volume = 0.85
    void audio.play().catch(() => {})
  } catch {
    /* ignore */
  }
}
