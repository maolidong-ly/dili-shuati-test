export type StarLevel = 1 | 2 | 3 | 4 | 5

export const STAR_LEVELS: StarLevel[] = [1, 2, 3, 4, 5]

/** all = 不限星级；数组 = 只刷所选星级（未标注星级的题仅在「全部」中出现） */
export type StarFilter = 'all' | StarLevel[]

export type ChoiceQuestion = {
  id: string
  stem: string
  options: [string, string, string, string]
  answerIndex: 0 | 1 | 2 | 3
  explanation?: string
  /** 题库内默认星级（可选）；云端 question_meta 可覆盖 */
  stars?: StarLevel
}

export type CatalogSection = {
  id: string
  title: string
  kind: 'lesson' | 'inquiry'
  questions: ChoiceQuestion[]
}

export type Chapter = {
  id: string
  bookId: string
  index: number
  title: string
  sections: CatalogSection[]
  questions: ChoiceQuestion[]
}

export type Textbook = {
  id: string
  category: 'required' | 'elective'
  volumeLabel: string
  subtitle: string
  chapters: Chapter[]
}

export type ChapterProgress = {
  answeredIds: string[]
  correctIds: string[]
}

export type WrongBookKind = 'chapter' | 'topic'

export type WrongQuestionEntry = {
  questionId: string
  unitId: string
  unitLabel: string
  stemPreview: string
  wrongCount: number
  lastWrongAt: string
  /** 章节刷题 vs 考点刷题 */
  kind: WrongBookKind
}

export type QuizLaunchConfig = {
  unitId: string
  starFilter: StarFilter
  /** 仅刷错题库中、且属于本单元的题 */
  wrongOnly?: boolean
  /** 直接指定题目 id 列表（错题本「全部重练」） */
  questionIds?: string[]
  /** 错题跨章节/考点混合练习 */
  crossUnit?: boolean
}

export type LocalProfile = {
  userId: string
  nickname: string
  syncToken: string
  registeredAt: string
}

export type LeaderboardRow = {
  nickname: string
  chapterId: string
  answered: number
  correct: number
  accuracy: number
}

export type RegisterResult =
  | { ok: true; profile: LocalProfile; restored: boolean }
  | { ok: false; code: RegisterErrorCode; message: string }

export type RegisterErrorCode =
  | 'invalid_passphrase'
  | 'invalid_nickname'
  | 'nickname_taken'
  | 'quota_full'
  | 'offline'
  | 'cloud_not_configured'
  | 'unknown'

/** 老师后台维护：题目 id → 星级（Supabase question_meta） */
export type QuestionMetaRow = {
  question_id: string
  stars: StarLevel
  updated_at?: string
}
