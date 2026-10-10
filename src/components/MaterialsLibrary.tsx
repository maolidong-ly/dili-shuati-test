import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatByteSize,
  listMaterials,
  materialPublicUrl,
  MATERIAL_CATEGORY_LABEL,
  materialsCloudAvailable,
  type MaterialCategory,
  type TeacherMaterialRow,
} from '../lib/materials'

type ExamSub = 'all' | 'exam_gaokao' | 'exam_mock'

export function MaterialsLibrary() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [group, setGroup] = useState<'exam' | 'map' | 'knowledge'>('exam')
  const [examSub, setExamSub] = useState<ExamSub>('all')
  const [rows, setRows] = useState<TeacherMaterialRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const rpcCategory = useMemo((): MaterialCategory | null => {
    if (debouncedSearch) return null
    if (group === 'map') return 'map'
    if (group === 'knowledge') return 'knowledge_list'
    if (examSub === 'exam_gaokao') return 'exam_gaokao'
    if (examSub === 'exam_mock') return 'exam_mock'
    return null
  }, [group, examSub, debouncedSearch])

  const load = useCallback(async () => {
    if (!materialsCloudAvailable()) return
    setLoading(true)
    setError('')
    try {
      let list = await listMaterials({
        category: rpcCategory,
        search: debouncedSearch || undefined,
      })
      if (!debouncedSearch && group === 'exam' && examSub === 'all') {
        list = list.filter(
          (r) => r.category === 'exam_gaokao' || r.category === 'exam_mock',
        )
      }
      setRows(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [rpcCategory, debouncedSearch, group, examSub])

  useEffect(() => {
    void load()
  }, [load])

  if (!materialsCloudAvailable()) {
    return (
      <section className="materials-library">
        <article className="card empty-card">
          <p className="muted">资料库需要连接云端，当前环境未配置。</p>
        </article>
      </section>
    )
  }

  return (
    <section className="materials-library">
      <header className="materials-hero card">
        <h2>学习资料</h2>
        <p className="muted small">老师上传的试卷、地图与知识清单，可按分类浏览或搜索名称下载。</p>
        <label className="materials-search">
          <span className="sr-only">搜索资料名称</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索资料名称…"
            enterKeyHint="search"
          />
        </label>
      </header>

      <div className="practice-mode materials-tabs" role="tablist" aria-label="资料大类">
        <button
          type="button"
          role="tab"
          aria-selected={group === 'exam'}
          className={group === 'exam' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => {
            setGroup('exam')
            setSearch('')
          }}
        >
          试卷
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={group === 'map'}
          className={group === 'map' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => {
            setGroup('map')
            setSearch('')
          }}
        >
          地图
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={group === 'knowledge'}
          className={group === 'knowledge' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => {
            setGroup('knowledge')
            setSearch('')
          }}
        >
          知识清单
        </button>
      </div>

      {group === 'exam' && !debouncedSearch ? (
        <div className="materials-subtabs">
          <button
            type="button"
            className={examSub === 'all' ? 'filter-chip filter-chip--active' : 'filter-chip'}
            onClick={() => setExamSub('all')}
          >
            全部试卷
          </button>
          <button
            type="button"
            className={
              examSub === 'exam_gaokao' ? 'filter-chip filter-chip--active' : 'filter-chip'
            }
            onClick={() => setExamSub('exam_gaokao')}
          >
            {MATERIAL_CATEGORY_LABEL.exam_gaokao}
          </button>
          <button
            type="button"
            className={
              examSub === 'exam_mock' ? 'filter-chip filter-chip--active' : 'filter-chip'
            }
            onClick={() => setExamSub('exam_mock')}
          >
            {MATERIAL_CATEGORY_LABEL.exam_mock}
          </button>
        </div>
      ) : null}

      {error ? <p className="error materials-error">{error}</p> : null}
      {loading ? <p className="muted materials-loading">加载中…</p> : null}

      {!loading && rows.length === 0 ? (
        <article className="card empty-card">
          <p className="muted">
            {debouncedSearch
              ? '没有匹配的资料，请换个关键词试试。'
              : '该分类下暂无资料，请稍后再看或联系老师上传。'}
          </p>
        </article>
      ) : null}

      <ul className="material-list">
        {rows.map((row) => {
          const url = materialPublicUrl(row.storage_path)
          return (
            <li key={row.id} className="material-item card">
              <div className="material-item-body">
                <strong>{row.title}</strong>
                <p className="muted small">
                  {MATERIAL_CATEGORY_LABEL[row.category]} · {formatByteSize(row.byte_size)}
                </p>
              </div>
              {url ? (
                <a
                  className="btn primary small material-download"
                  href={url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  下载
                </a>
              ) : (
                <span className="muted small">链接不可用</span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
