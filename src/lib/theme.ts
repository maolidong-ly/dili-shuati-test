export type AppThemeId = 'indigo' | 'forest' | 'rose' | 'sand' | 'midnight' | 'slate'

export type AppTheme = {
  id: AppThemeId
  label: string
  emoji: string
}

export const APP_THEMES: AppTheme[] = [
  { id: 'indigo', label: '学院蓝', emoji: '💙' },
  { id: 'forest', label: '护眼绿', emoji: '💚' },
  { id: 'rose', label: '樱花粉', emoji: '🌸' },
  { id: 'sand', label: '暖杏色', emoji: '🌅' },
  { id: 'midnight', label: '夜间黑', emoji: '🌙' },
  { id: 'slate', label: '雾灰', emoji: '🌫️' },
]

const STORAGE_KEY = 'geoquiz.theme.v1'

export function getStoredTheme(): AppThemeId {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (APP_THEMES.some((t) => t.id === raw)) return raw as AppThemeId
  return 'indigo'
}

export function setStoredTheme(id: AppThemeId) {
  localStorage.setItem(STORAGE_KEY, id)
  applyTheme(id)
}

export function applyTheme(id: AppThemeId) {
  document.documentElement.dataset.theme = id
}
