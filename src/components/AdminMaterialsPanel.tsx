import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  adminDeleteMaterial,
  adminListMaterials,
  adminUploadMaterial,
  formatByteSize,
  MATERIAL_CATEGORY_LABEL,
  type MaterialCategory,
  type TeacherMaterialRow,
} from '../lib/materials'

type Props = {
  adminPass: string
}

export function AdminMaterialsPanel({ adminPass }: Props) {
  const [rows, setRows] = useState<TeacherMaterialRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<MaterialCategory>('exam_gaokao')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await adminListMaterials(adminPass))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [adminPass])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('请选择文件')
      return
    }
    setUploading(true)
    setError('')
    try {
      await adminUploadMaterial(
        adminPass,
        file,
        title.trim() || file.name,
        category,
      )
      setTitle('')
      setFile(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(row: TeacherMaterialRow) {
    if (!confirm(`确定删除「${row.title}」？`)) return
    setLoading(true)
    try {
      await adminDeleteMaterial(adminPass, row.id)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-materials">
      <form className="card form-card admin-material-form" onSubmit={handleUpload}>
        <h3>上传资料</h3>
        <p className="muted small setup-hint">
          支持 PDF、Word、图片等常见格式，单文件建议不超过 50MB。上传后学生端可按分类或搜索下载。
        </p>
        <label>
          显示名称
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：2024年全国甲卷地理真题"
            maxLength={120}
          />
        </label>
        <label>
          分类
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MaterialCategory)}
          >
            <optgroup label="试卷">
              <option value="exam_gaokao">{MATERIAL_CATEGORY_LABEL.exam_gaokao}</option>
              <option value="exam_mock">{MATERIAL_CATEGORY_LABEL.exam_mock}</option>
            </optgroup>
            <option value="map">{MATERIAL_CATEGORY_LABEL.map}</option>
            <option value="knowledge_list">{MATERIAL_CATEGORY_LABEL.knowledge_list}</option>
          </select>
        </label>
        <label>
          选择文件
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required={!file}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={uploading || !file}>
          {uploading ? '上传中…' : '上传'}
        </button>
      </form>

      <div className="admin-toolbar">
        <strong>已上传（{rows.length}）</strong>
        <button
          type="button"
          className="btn ghost small"
          disabled={loading}
          onClick={() => void reload()}
        >
          刷新
        </button>
      </div>

      <ul className="admin-list material-admin-list">
        {rows.map((row) => (
          <li key={row.id} className="admin-row card">
            <div>
              <strong>{row.title}</strong>
              <p className="muted small">
                {MATERIAL_CATEGORY_LABEL[row.category]} · {formatByteSize(row.byte_size)} ·{' '}
                {new Date(row.created_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
            <div className="admin-row-actions">
              <button
                type="button"
                className="btn ghost small danger"
                disabled={loading}
                onClick={() => void handleDelete(row)}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && !loading ? (
        <p className="muted admin-empty">暂无资料</p>
      ) : null}
    </div>
  )
}
