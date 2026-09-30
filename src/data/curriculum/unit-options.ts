import { textbooks } from './pep2019'
import { topicCategories } from './topics'

export type UnitOption = { id: string; label: string }

export function listUnitOptions(): UnitOption[] {
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
  for (const cat of topicCategories) {
    for (const topic of cat.topics) {
      out.push({ id: topic.id, label: `${cat.title} · ${topic.title}` })
    }
  }
  return out
}
