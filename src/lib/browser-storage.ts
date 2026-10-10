/** 检测 localStorage / sessionStorage 是否可用（隐私模式、微信内核等会禁用） */

export type StorageTier = 'local' | 'session' | 'none'

export function detectStorageTier(): StorageTier {
  try {
    const k = '__geoquiz_storage_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return 'local'
  } catch {
    try {
      const k = '__geoquiz_storage_probe__'
      sessionStorage.setItem(k, '1')
      sessionStorage.removeItem(k)
      return 'session'
    } catch {
      return 'none'
    }
  }
}

export function storageForTier(tier: StorageTier): Storage | null {
  if (tier === 'local') {
    try {
      return localStorage
    } catch {
      return null
    }
  }
  if (tier === 'session') {
    try {
      return sessionStorage
    } catch {
      return null
    }
  }
  return null
}

export function isWeChatInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent)
}
