import { textbooks } from './pep2019'
import { topicCategories } from './topics'

export type UnitOption = { id: string; label: string }

/** 教材章、节（录题挂在小节；章 ID 可用于章级题） */
export function listChapterUnitOptions(): UnitOption[] {
  const out: UnitOption[] = []
  for (const book of textbooks) {
    for (const ch of book.chapters) {
      out.push({ id: ch.id, label: `${book.volumeLabel} · ${ch.title}` })
      for (const sec of ch.sections) {
        out.push({
          id: sec.id,
          label: `${book.volumeLabel} · ${ch.title} · ${sec.title}`,
        })
      }
    }
  }
  return out
}

/** 考点刷题单元 */
export function listTopicUnitOptions(): UnitOption[] {
  const out: UnitOption[] = []
  for (const cat of topicCategories) {
    for (const topic of cat.topics) {
      out.push({ id: topic.id, label: `${cat.title} · ${topic.title}` })
    }
  }
  return out
}

export function listUnitOptions(): UnitOption[] {
  return [...listChapterUnitOptions(), ...listTopicUnitOptions()]
}
