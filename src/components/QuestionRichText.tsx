import { parseQuestionRichText } from '../lib/question-rich-text'

type Props = {
  text: string
  className?: string
  block?: boolean
}

export function QuestionRichText({ text, className = '', block = false }: Props) {
  const segments = parseQuestionRichText(text)
  const Tag = block ? 'div' : 'span'

  return (
    <Tag className={`question-rich${block ? ' question-rich-block' : ''} ${className}`.trim()}>
      {segments.map((seg, i) => {
        if (seg.kind === 'image') {
          return (
            <img
              key={`img-${i}`}
              className="question-rich-img"
              src={seg.url}
              alt={seg.alt}
              loading="lazy"
              decoding="async"
            />
          )
        }
        const lines = seg.value.split('\n')
        return (
          <span key={`t-${i}`} className="question-rich-text">
            {lines.map((line, li) => (
              <span key={li}>
                {li > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </span>
        )
      })}
    </Tag>
  )
}
