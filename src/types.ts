export type StarLevel = 1 | 2 | 3 | 4 | 5

export const STAR_LEVELS: StarLevel[] = [1, 2, 3, 4, 5]

/** all = 不限星级；数组 = 只刷所选星级（未标注星级的题仅在「全部」中出现） */
export type StarFilter = 'all' | StarLevel[]

export type QuestionKind = 'single' | 'multiple' | 'judgment'

export type ChoiceQuestion = {
  id: string
  stem: string
  options: string[]
  /** 默认单选 */
  kind?: QuestionKind
  answerIndex?: 0 | 1 | 2 | 3
  /** 多选正确项下标 */
  answerIndices?: number[]
  explanation?: string
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

export type QuestionKindFilter = QuestionKind | 'all'

export type QuizLaunchConfig = {
  unitId: string
  starFilter: StarFilter
  /** 只练某一题型；默认 all */
  kindFilter?: QuestionKindFilter
  /** 仅刷错题库中、且属于本单元的题 */
  wrongOnly?: boolean
  /** 直接指定题目 id 列表（错题本「全部重练」） */
  questionIds?: string[]
  /** 错题跨章节/考点混合练习 */
  crossUnit?: boolean
  /** 从指定题目开始（题号选做） */
  startQuestionId?: string
  /** 跨单元错题：题目 id 与所属单元（用于云端拉题） */
  crossUnitSources?: Array<{
    questionId: string
    unitId: string
    unitLabel: string
  }>
}

export type LocalProfile = {
  userId: string
  nickname: string
  syncToken: string
  registeredAt: string
  /** P1 单设备会话 */
  deviceId?: string
  sessionToken?: string
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
  | 'pending_approval'
  | 'already_pending'
  | 'account_disabled'
  | 'nickname_not_found'
  | 'device_in_use'
  | 'unknown'

export type AdminProfileRow = {
  id: string
  nickname: string
  status: 'pending' | 'active' | 'disabled'
  created_at: string
}

/** 老师后台维护：题目 id → 星级（Supabase question_meta） */
export type QuestionMetaRow = {
  question_id: string
  stars: StarLevel
  updated_at?: string
}
