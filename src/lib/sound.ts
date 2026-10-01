const KEY = 'geoquiz.sound.v1'

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

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

/** 轻量 UI 点击音 */
export function playUiClick() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t)
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.06)
  gain.gain.setValueAtTime(0.08, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.09)
}

export function bindGlobalUiClickSound() {
  if (typeof document === 'undefined') return () => {}
  function onClick(e: MouseEvent) {
    const el = e.target as HTMLElement | null
    if (!el) return
    const interactive = el.closest('button, a, .option, .filter-chip, .q-picker-cell, .nav')
    if (interactive) playUiClick()
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
