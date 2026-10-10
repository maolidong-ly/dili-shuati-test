import { detectStorageTier, storageForTier } from './browser-storage'

const KEY = 'geoquiz.device.v1'

export function getDeviceId(): string {
  try {
    const storage = storageForTier(detectStorageTier())
    if (!storage) {
      return `ephemeral-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
    let id = storage.getItem(KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      storage.setItem(KEY, id)
    }
    return id
  } catch {
    return `ephemeral-${Date.now()}`
  }
}
