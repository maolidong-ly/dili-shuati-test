import { getSupabase, isCloudEnabled } from './supabase'

export type CloudReachability =
  | 'ok'
  | 'not_configured'
  | 'offline'
  | 'unreachable'

/** 检测学生设备能否连上 Supabase（与登录/申请同一网络路径） */
export async function checkCloudReachability(): Promise<CloudReachability> {
  if (!isCloudEnabled()) return 'not_configured'
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline'

  const supabase = getSupabase()
  if (!supabase) return 'unreachable'
  try {
    await supabase.rpc('apply_for_nickname', {
      p_passphrase: '__connectivity_probe__',
      p_nickname: '__probe__',
      p_account_password: 'probe',
    })
    // 能收到 RPC 响应（含 invalid_passphrase）即表示网络可达
    return 'ok'
  } catch {
    return 'unreachable'
  }
}

export function cloudReachabilityHint(status: CloudReachability): string {
  switch (status) {
    case 'ok':
      return '云端连接正常，可以登录或申请账号。'
    case 'not_configured':
      return '站点未配置云数据库，请联系老师。'
    case 'offline':
      return '当前设备显示离线，请打开 Wi‑Fi 或移动数据后再试。'
    case 'unreachable':
      return '无法连接学习服务器。常见原因：学校 Wi‑Fi 屏蔽、需用手机流量；或在微信里打开请点右上角「⋯」→ 在浏览器中打开。'
  }
}
