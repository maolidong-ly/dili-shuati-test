/** 题干前是否已有「1.」「1、」等序号 */
export function stemHasLeadingIndex(stem: string): boolean {
  return /^\d+\s*[.．、]\s*/.test(stem.trim())
}

/** 刷题页展示：无序号时在题干前加「n. 」 */
export function formatStemWithIndex(indexOneBased: number, stem: string): string {
  const s = stem.trim()
  if (stemHasLeadingIndex(s)) return stem
  return `${indexOneBased}. ${stem}`
}

/** 按题目 id 中的 q 序号排序（如 xx1-ch03-s01-q03） */
export function sortQuestionsById(questions: { id: string }[]): void {
  questions.sort((a, b) => {
    const ka = idSortKey(a.id)
    const kb = idSortKey(b.id)
    if (ka !== kb) return ka - kb
    return a.id.localeCompare(b.id, 'zh-CN')
  })
}

function idSortKey(id: string): number {
  const m = id.match(/-q-?(\d+)(?:$|[^0-9])/) ?? id.match(/-q(\d+)$/)
  return m ? Number.parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}
