import type { Chapter, Textbook } from '../../types'
import { xx1Ch03S01Questions } from './banks/xx1-ch03-s01-common-weather'
import { textbooks } from './pep2019'

const section = textbooks
  .flatMap((b) => b.chapters)
  .find((c) => c.id === 'xx1-ch03')
  ?.sections.find((s) => s.id === 'xx1-ch03-s01')
if (section) section.questions = xx1Ch03S01Questions

export { textbooks }

export const allChapters: Chapter[] = textbooks.flatMap((b) => b.chapters)

export function getTextbook(id: string): Textbook | undefined {
  return textbooks.find((b) => b.id === id)
}

export function getChapter(id: string): Chapter | undefined {
  return allChapters.find((c) => c.id === id)
}

export function getBookForChapter(chapterId: string): Textbook | undefined {
  return textbooks.find((b) => b.chapters.some((c) => c.id === chapterId))
}

export {
  chapterHasQuestions,
  countChapterQuestions,
  resolveQuizUnit,
} from './quiz-unit'
export type { QuizUnit } from './quiz-unit'
export { topicCategories, findTopicPoint } from './topics'
export type { TopicCategory, TopicPoint } from './topics'
export { collectQuestionsByIds, findQuestionGlobal } from './all-questions'
export { getQuizUnitLabel } from './quiz-unit'
