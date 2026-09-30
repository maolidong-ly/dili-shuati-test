import type { ChoiceQuestion } from '../../types'

export type TopicPoint = {
  id: string
  title: string
  questions: ChoiceQuestion[]
}

export type TopicCategory = {
  id: string
  title: string
  topics: TopicPoint[]
}

/** 按考点刷题：两级目录（人文地理二级暂空） */
export const topicCategories: TopicCategory[] = [
  {
    id: 'physical',
    title: '自然地理',
    topics: [
      { id: 'topic-physical-cosmos', title: '宇宙中的地球', questions: [] },
      { id: 'topic-physical-atmosphere', title: '大气圈', questions: [] },
      { id: 'topic-physical-hydrosphere', title: '水圈', questions: [] },
      { id: 'topic-physical-lithosphere', title: '岩石圈', questions: [] },
      { id: 'topic-physical-biosphere', title: '生物圈', questions: [] },
    ],
  },
  {
    id: 'human',
    title: '人文地理',
    topics: [],
  },
]

export function findTopicPoint(unitId: string): {
  category: TopicCategory
  topic: TopicPoint
} | undefined {
  for (const category of topicCategories) {
    const topic = category.topics.find((t) => t.id === unitId)
    if (topic) return { category, topic }
  }
  return undefined
}
