export type AppFontId = 'system' | 'serif' | 'round' | 'large'

export type AppFont = {
  id: AppFontId
  label: string
}

export const APP_FONTS: AppFont[] = [
  { id: 'system', label: '系统默认' },
  { id: 'serif', label: '书宋体' },
  { id: 'round', label: '圆润体' },
  { id: 'large', label: '大字版' },
]

const STORAGE_KEY = 'geoquiz.font.v1'

export function getStoredFont(): AppFontId {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (APP_FONTS.some((f) => f.id === raw)) return raw as AppFontId
  return 'system'
}

export function setStoredFont(id: AppFontId) {
  localStorage.setItem(STORAGE_KEY, id)
  applyFont(id)
}

export function applyFont(id: AppFontId) {
  document.documentElement.dataset.font = id
}
