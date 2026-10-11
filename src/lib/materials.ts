import { getSupabase, isCloudEnabled } from './supabase'

export type MaterialCategory =
  | 'exam_gaokao'
  | 'exam_mock'
  | 'map'
  | 'knowledge_list'

export type MaterialCategoryFilter = MaterialCategory | 'exam_all' | 'all'

export type TeacherMaterialRow = {
  id: string
  title: string
  category: MaterialCategory
  storage_path: string
  byte_size: number
  content_type: string | null
  created_at: string
}

export const MATERIAL_CATEGORY_LABEL: Record<MaterialCategory, string> = {
  exam_gaokao: '高考真题',
  exam_mock: '模拟卷',
  map: '地图',
  knowledge_list: '知识清单',
}

export const MATERIAL_GROUP_LABEL = {
  exam: '试卷',
  map: '地图',
  knowledge: '知识清单',
} as const

const BUCKET = 'teacher-materials'

/** Supabase 免费版项目文件存储约 1 GB，供后台占用提示 */
export const MATERIALS_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024

export function sumMaterialBytes(rows: Pick<TeacherMaterialRow, 'byte_size'>[]): number {
  return rows.reduce((sum, r) => sum + (r.byte_size > 0 ? r.byte_size : 0), 0)
}

export function materialPublicUrl(storagePath: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!base) return null
  const encoded = storagePath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')
  return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`
}

export function formatByteSize(n: number): string {
  if (!n || n < 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80)
}

/** Storage 对象键仅支持 ASCII；原文件名（含中文）只用于显示标题。 */
function storageObjectKey(id: string, originalName: string): string {
  const m = /\.([a-zA-Z0-9]{1,8})$/.exec(originalName.trim())
  const ext = m ? `.${m[1].toLowerCase()}` : ''
  return `${id}${ext}`
}

function mapMaterialsError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err)
  if (/invalidkey|invalid key/i.test(msg)) {
    return new Error('文件名含特殊字符，请重试或改用英文文件名')
  }
  if (/fetch|network|failed to fetch|load failed/i.test(msg)) {
    return new Error(
      '无法连接服务器。请换网络、关闭 VPN，或改用系统浏览器（不要只在微信里打开）',
    )
  }
  if (msg.includes('forbidden')) {
    return new Error('后台口令不正确，请返回重新登录')
  }
  return err instanceof Error ? err : new Error(msg || '操作失败')
}

export async function listMaterials(options?: {
  category?: MaterialCategory | null
  search?: string
}): Promise<TeacherMaterialRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('list_teacher_materials', {
    p_category: options?.category ?? null,
    p_search: options?.search?.trim() || null,
  })
  if (error) throw mapMaterialsError(new Error(error.message))
  return (data ?? []) as TeacherMaterialRow[]
}

export async function adminListMaterials(adminPass: string): Promise<TeacherMaterialRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  let data: unknown
  let error: { message: string } | null = null
  try {
    const res = await supabase.rpc('admin_list_materials', {
      p_admin_passphrase: adminPass,
    })
    data = res.data
    error = res.error
  } catch (e) {
    throw mapMaterialsError(e)
  }
  if (error) throw mapMaterialsError(new Error(error.message))
  return (data ?? []) as TeacherMaterialRow[]
}

export async function adminUploadMaterial(
  adminPass: string,
  file: File,
  title: string,
  category: MaterialCategory,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('cloud_not_configured')

  const id = crypto.randomUUID()
  const displayName = title.trim() || sanitizeFilename(file.name) || '未命名资料'
  const objectKey = storageObjectKey(id, file.name)
  const storagePath = `${category}/${id}/${objectKey}`

  let upErr: { message: string } | null = null
  try {
    const res = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })
    upErr = res.error
  } catch (e) {
    throw mapMaterialsError(e)
  }
  if (upErr) throw mapMaterialsError(new Error(upErr.message))

  const { error: regErr } = await supabase.rpc('admin_register_material', {
    p_admin_passphrase: adminPass,
    p_title: displayName,
    p_category: category,
    p_storage_path: storagePath,
    p_byte_size: file.size,
    p_content_type: file.type || null,
  })

  if (regErr) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw mapMaterialsError(new Error(regErr.message))
  }
}

export async function adminDeleteMaterial(
  adminPass: string,
  materialId: string,
): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('cloud_not_configured')

  const { data: path, error } = await supabase.rpc('admin_delete_material', {
    p_admin_passphrase: adminPass,
    p_material_id: materialId,
  })
  if (error) throw new Error(error.message)

  if (path && typeof path === 'string') {
    await supabase.storage.from(BUCKET).remove([path])
  }
}

export function materialsCloudAvailable(): boolean {
  return isCloudEnabled()
}
