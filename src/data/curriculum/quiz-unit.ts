import type { CatalogSection, Chapter, ChoiceQuestion } from '../../types'
import { textbooks } from './pep2019'
import { findTopicPoint } from './topics'

export type QuizUnit =
  | {
      mode: 'chapter'
      id: string
      title: string
      questions: ChoiceQuestion[]
      chapter: Chapter
      section: CatalogSection | null
    }
  | {
      mode: 'topic'
      id: string
      title: string
      questions: ChoiceQuestion[]
      categoryTitle: string
      topicTitle: string
    }

export function getQuizUnitLabel(unit: QuizUnit): string {
  if (unit.mode === 'topic') {
    return `${unit.categoryTitle} · ${unit.topicTitle}`
  }
  if (unit.section) {
    return `${unit.chapter.title} · ${unit.section.title}`
  }
  return unit.chapter.title
}

export function countChapterQuestions(ch: Chapter): number {
  const inSections = ch.sections.reduce((n, s) => n + s.questions.length, 0)
  return inSections + ch.questions.length
}

export function chapterHasQuestions(ch: Chapter): boolean {
  return countChapterQuestions(ch) > 0
}

export function resolveQuizUnit(unitId: string): QuizUnit | undefined {
  const topicHit = findTopicPoint(unitId)
  if (topicHit) {
    const { category, topic } = topicHit
    return {
      mode: 'topic',
      id: topic.id,
      title: topic.title,
      questions: topic.questions,
      categoryTitle: category.title,
      topicTitle: topic.title,
    }
  }

  for (const book of textbooks) {
    for (const chapter of book.chapters) {
      const section = chapter.sections.find((s) => s.id === unitId)
      if (section) {
        return {
          mode: 'chapter',
          id: section.id,
          chapter,
          section,
          title: section.title,
          questions: section.questions,
        }
      }
      if (chapter.id === unitId) {
        const merged =
          chapter.questions.length > 0
            ? chapter.questions
            : chapter.sections.flatMap((s) => s.questions)
        return {
          mode: 'chapter',
          id: chapter.id,
          chapter,
          section: null,
          title: chapter.title,
          questions: merged,
        }
      }
    }
  }
  return undefined
}
