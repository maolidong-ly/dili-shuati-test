import type { CatalogSection, Chapter, Textbook } from '../../types'

function sectionId(chapterId: string, index: number) {
  return `${chapterId}-s${String(index + 1).padStart(2, '0')}`
}

function parseSection(chapterId: string, index: number, title: string): CatalogSection {
  const kind: CatalogSection['kind'] =
    title.startsWith('问题研究') || title.startsWith('问题探究') ? 'inquiry' : 'lesson'
  return { id: sectionId(chapterId, index), title, kind, questions: [] }
}

export function defineBook(
  id: string,
  category: Textbook['category'],
  volumeLabel: string,
  subtitle: string,
  chapterDefs: Array<{ title: string; sections: string[] }>,
): Textbook {
  const chapters: Chapter[] = chapterDefs.map((def, i) => {
    const index = i + 1
    const chapterId = `${id}-ch${String(index).padStart(2, '0')}`
    return {
      id: chapterId,
      bookId: id,
      index,
      title: def.title,
      sections: def.sections.map((s, si) => parseSection(chapterId, si, s)),
      questions: [],
    }
  })
  return { id, category, volumeLabel, subtitle, chapters }
}
