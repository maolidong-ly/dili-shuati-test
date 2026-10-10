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
  if (error) throw new Error(error.message)
  return (data ?? []) as TeacherMaterialRow[]
}

export async function adminListMaterials(adminPass: string): Promise<TeacherMaterialRow[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_list_materials', {
    p_admin_passphrase: adminPass,
  })
  if (error) throw new Error(error.message)
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
  const safeName = sanitizeFilename(file.name)
  const storagePath = `${category}/${id}/${safeName}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })
  if (upErr) throw new Error(upErr.message)

  const { error: regErr } = await supabase.rpc('admin_register_material', {
    p_admin_passphrase: adminPass,
    p_title: title.trim() || safeName,
    p_category: category,
    p_storage_path: storagePath,
    p_byte_size: file.size,
    p_content_type: file.type || null,
  })

  if (regErr) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw new Error(regErr.message)
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
