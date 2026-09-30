const KEY = 'geoquiz.gate.creds.v1'

export type GateCreds = {
  passphrase: string
  nickname: string
}

export function loadGateCreds(): GateCreds {
  try {
    const raw = localStorage.getItem(KEY)
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
  localStorage.setItem(
    KEY,
    JSON.stringify({
      passphrase: creds.passphrase,
      nickname: creds.nickname.trim(),
    }),
  )
}
