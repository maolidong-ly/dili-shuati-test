import type { RegisterErrorCode } from '../types'

const MESSAGES: Record<RegisterErrorCode, string> = {
  invalid_passphrase: '访问口令不正确',
  invalid_nickname: '昵称需 2～16 个字符，勿含空格首尾',
  nickname_taken: '该昵称已被使用，请换一个',
  quota_full: '注册人数已达上限（100 人），请联系老师',
  offline: '当前离线，请联网后重试',
  cloud_not_configured: '未配置云数据库',
  pending_approval: '账号待老师审核，通过后再登录',
  already_pending: '该昵称已在审核中，请等待或换一个',
  account_disabled: '账号已被禁用，请联系老师',
  nickname_not_found: '昵称不存在，请先申请注册',
  device_in_use: '已在其它设备使用，请先在那台设备退出或联系老师',
  unknown: '操作失败，请稍后重试',
}

export function mapRpcError(message: string): RegisterErrorCode {
  if (message.includes('invalid_passphrase')) return 'invalid_passphrase'
  if (message.includes('invalid_nickname')) return 'invalid_nickname'
  if (message.includes('nickname_taken')) return 'nickname_taken'
  if (message.includes('quota_full')) return 'quota_full'
  if (message.includes('pending_approval')) return 'pending_approval'
  if (message.includes('already_pending')) return 'already_pending'
  if (message.includes('account_disabled')) return 'account_disabled'
  if (message.includes('nickname_not_found')) return 'nickname_not_found'
  if (message.includes('device_in_use')) return 'device_in_use'
  if (message.includes('invalid_device')) return 'unknown'
  return 'unknown'
}

export function messageForCode(code: RegisterErrorCode): string {
  return MESSAGES[code]
}
