import { useState } from 'react'
import { ChapterList } from './ChapterList'
import { TopicList } from './TopicList'

export type PracticeMode = 'chapter' | 'topic'

type Props = {
  onOpenSetup: (unitId: string) => void
}

export function PracticePanel({ onOpenSetup }: Props) {
  const [mode, setMode] = useState<PracticeMode>('chapter')

  return (
    <div className="practice-panel">
      <div className="practice-mode" role="tablist" aria-label="刷题模式">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'chapter'}
          className={mode === 'chapter' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('chapter')}
        >
          按章节刷题
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'topic'}
          className={mode === 'topic' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('topic')}
        >
          按考点刷题
        </button>
      </div>

      {mode === 'chapter' ? (
        <ChapterList onSelectUnit={onOpenSetup} />
      ) : (
        <TopicList onSelectUnit={onOpenSetup} />
      )}
    </div>
  )
}
