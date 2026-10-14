import type { ReactNode } from 'react'
import { splitRichContent } from '../lib/question-rich-text'
import { QuestionRichText } from './QuestionRichText'

type Props = {
  content: string
  /** 题干 / 选项 / 解析 */
  variant?: 'stem' | 'option' | 'explain'
  prefix?: ReactNode
  className?: string
}

export function RichFieldLayout({
  content,
  variant = 'stem',
  prefix,
  className = '',
}: Props) {
  const { text, images } = splitRichContent(content)
  const imageClass =
    variant === 'option'
      ? 'question-rich-images-center question-rich-images-option'
      : 'question-rich-images-center'

  return (
    <div className={`rich-field-layout rich-field-${variant} ${className}`.trim()}>
      {(prefix || text) ? (
        <div className="rich-field-text">
          {prefix}
          {text ? <QuestionRichText text={text} block /> : null}
        </div>
      ) : null}
      {images.length > 0 ? (
        <div className={imageClass}>
          {images.map((img, i) => (
            <img
              key={`${img.url}-${i}`}
              className="question-rich-img-centered"
              src={img.url}
              alt={img.alt}
              loading="lazy"
              decoding="async"
              crossOrigin="anonymous"
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
