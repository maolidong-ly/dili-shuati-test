import type { Chapter, Textbook } from '../../types'
import { textbooks } from './pep2019'

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
