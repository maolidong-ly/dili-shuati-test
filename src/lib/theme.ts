export type AppThemeId = 'indigo' | 'forest' | 'rose' | 'sand' | 'slate'

export type AppTheme = {
  id: AppThemeId
  label: string
  emoji: string
}

export const APP_THEMES: AppTheme[] = [
  { id: 'indigo', label: '默认蓝', emoji: '💙' },
  { id: 'forest', label: '护眼绿', emoji: '💚' },
  { id: 'rose', label: '柔和粉', emoji: '🌸' },
  { id: 'sand', label: '暖沙色', emoji: '🌅' },
  { id: 'slate', label: '深灰蓝', emoji: '🌙' },
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
