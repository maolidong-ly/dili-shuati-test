import { detectStorageTier, storageForTier } from './browser-storage'

const KEY = 'geoquiz.gate.creds.v1'

function store(): Storage | null {
  return storageForTier(detectStorageTier())
}

export type GateCreds = {
  passphrase: string
  nickname: string
}

export function loadGateCreds(): GateCreds {
  try {
    const s = store()
    if (!s) return { passphrase: '', nickname: '' }
    const raw = s.getItem(KEY)
    if (!raw) return { passphrase: '', nickname: '' }
    const parsed = JSON.parse(raw) as GateCreds
    return {
      passphrase: parsed.passphrase ?? '',
      nickname: parsed.nickname ?? '',
    }
  } catch {
    return { passphrase: '', nickname: '' }
  }
}

export function saveGateCreds(creds: GateCreds) {
  const s = store()
  if (!s) return
  s.setItem(
    KEY,
    JSON.stringify({
      passphrase: creds.passphrase,
      nickname: creds.nickname.trim(),
    }),
  )
}
