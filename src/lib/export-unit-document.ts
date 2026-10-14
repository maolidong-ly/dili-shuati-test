import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
  AlignmentType,
} from 'docx'
import html2pdf from 'html2pdf.js'
import type { ChoiceQuestion, QuestionKind } from '../types'
import {
  formatStemWithIndex,
  groupQuestionsByKind,
  KIND_LABELS,
  questionKind,
} from './question-display'
import { loadExportImage } from './export-image'
import { correctIndicesForDisplay } from './question-grade'
import { richTextPlain, splitRichContent, type RichImageRef } from './question-rich-text'

export type ExportUnitOptions = {
  unitTitle: string
  questions: ChoiceQuestion[]
  /** 教师端：含答案与解析；学生端：仅题目 */
  includeAnswers: boolean
  subtitle?: string
}

const KIND_ORDER: QuestionKind[] = ['single', 'multiple', 'judgment']
const KIND_ZH = ['一', '二', '三']

function safeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 72)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function formatAnswerText(q: ChoiceQuestion): string {
  const idx = correctIndicesForDisplay(q)
  if (idx.length === 0) return '—'
  const isJudgment = questionKind(q) === 'judgment'
  const opts = isJudgment ? q.options.slice(0, 2) : q.options
  if (questionKind(q) === 'multiple') {
    return idx
      .map((i) => {
        const letter = String.fromCharCode(65 + i)
        const text = richTextPlain(opts[i] ?? '')
        return text ? `${letter}. ${text}` : letter
      })
      .join('；')
  }
  const i = idx[0]
  const letter = String.fromCharCode(65 + i)
  const text = richTextPlain(opts[i] ?? '')
  return text ? `${letter}. ${text}` : letter
}

async function appendDocxCenteredImages(
  children: Paragraph[],
  images: RichImageRef[],
): Promise<void> {
  for (const img of images) {
    const loaded = await loadExportImage(img.url)
    if (loaded) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 140 },
          children: [
            new ImageRun({
              data: loaded.bytes,
              type: loaded.type,
              transformation: {
                width: loaded.widthPx,
                height: loaded.heightPx,
              },
            }),
          ],
        }),
      )
    } else {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `[图片未能加载：${img.alt}]`,
              font: '宋体',
              size: 20,
              color: '888888',
            }),
          ],
        }),
      )
    }
  }
}

function defaultSubtitle(): string {
  return `高中地理知识点刷记 · 导出日期 ${new Date().toLocaleDateString('zh-CN')}`
}

function buildAnswerBlocks(
  questions: ChoiceQuestion[],
): { index: number; kind: QuestionKind; q: ChoiceQuestion; kindIndex: number }[] {
  const grouped = groupQuestionsByKind(questions)
  const out: { index: number; kind: QuestionKind; q: ChoiceQuestion; kindIndex: number }[] =
    []
  let n = 0
  for (const kind of KIND_ORDER) {
    grouped[kind].forEach((q, i) => {
      n += 1
      out.push({ index: n, kind, q, kindIndex: i + 1 })
    })
  }
  return out
}

export async function downloadUnitDocx(opts: ExportUnitOptions): Promise<void> {
  if (opts.questions.length === 0) throw new Error('暂无题目')

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: opts.unitTitle,
          font: '黑体',
          size: 44,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: opts.subtitle ?? defaultSubtitle(),
          font: '宋体',
          size: 22,
          color: '666666',
        }),
      ],
    }),
  ]

  const grouped = groupQuestionsByKind(opts.questions)
  for (let ki = 0; ki < KIND_ORDER.length; ki++) {
    const kind = KIND_ORDER[ki]!
    const list = grouped[kind]
    if (list.length === 0) continue
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 200 },
        children: [
          new TextRun({
            text: `${KIND_ZH[ki]}、${KIND_LABELS[kind]}（共 ${list.length} 题）`,
            font: '黑体',
            size: 32,
            bold: true,
          }),
        ],
      }),
    )
    for (let i = 0; i < list.length; i++) {
      const q = list[i]!
      const { text: stemText, images: stemImages } = splitRichContent(q.stem)
      const stemLine = formatStemWithIndex(
        i + 1,
        stemText || (stemImages.length > 0 ? '（见下图）' : ''),
      )
      children.push(
        new Paragraph({
          spacing: { before: 200, after: stemImages.length ? 80 : 120 },
          children: [new TextRun({ text: stemLine, font: '宋体', size: 28 })],
        }),
      )
      await appendDocxCenteredImages(children, stemImages)
      const isJudgment = questionKind(q) === 'judgment'
      const options = isJudgment ? q.options.slice(0, 2) : q.options
      for (let oi = 0; oi < options.length; oi++) {
        const raw = options[oi] ?? ''
        const { text: optText, images: optImages } = splitRichContent(raw)
        children.push(
          new Paragraph({
            indent: { left: 480 },
            spacing: { after: optImages.length ? 60 : 80 },
            children: [
              new TextRun({
                text: `${String.fromCharCode(65 + oi)}. ${optText || (optImages.length ? '（见下图）' : '')}`,
                font: '宋体',
                size: 24,
              }),
            ],
          }),
        )
        await appendDocxCenteredImages(children, optImages)
      }
    }
  }

  if (opts.includeAnswers) {
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    )
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: '参考答案与解析',
            font: '黑体',
            size: 32,
            bold: true,
          }),
        ],
      }),
    )
    for (const { index, q, kindIndex, kind } of buildAnswerBlocks(opts.questions)) {
      const label = `${KIND_LABELS[kind]} ${kindIndex}`
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({ text: `${index}. [${label}] `, font: '宋体', size: 24, bold: true }),
            new TextRun({
              text: `答案：${formatAnswerText(q)}`,
              font: '宋体',
              size: 24,
            }),
          ],
        }),
      )
      if (q.explanation?.trim()) {
        const { text: expText, images: expImages } = splitRichContent(q.explanation)
        children.push(
          new Paragraph({
            indent: { left: 480 },
            spacing: { after: expImages.length ? 60 : 120 },
            children: [
              new TextRun({
                text: `解析：${expText || (expImages.length ? '（见下图）' : '')}`,
                font: '宋体',
                size: 22,
                color: '444444',
              }),
            ],
          }),
        )
        await appendDocxCenteredImages(children, expImages)
      }
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${safeFilename(opts.unitTitle)}.docx`)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildExportHtml(opts: ExportUnitOptions): string {
  const grouped = groupQuestionsByKind(opts.questions)
  let body = ''

  KIND_ORDER.forEach((kind, ki) => {
    const list = grouped[kind]
    if (list.length === 0) return
    body += `<h2 class="kind">${KIND_ZH[ki]}、${escapeHtml(KIND_LABELS[kind])}（共 ${list.length} 题）</h2>`
    list.forEach((q, i) => {
      const { text: stemText, images: stemImages } = splitRichContent(q.stem)
      const stemLine = formatStemWithIndex(
        i + 1,
        stemText || (stemImages.length > 0 ? '（见下图）' : ''),
      )
      body += `<div class="stem-block"><p class="stem-text">${escapeHtml(stemLine)}</p>`
      if (stemImages.length > 0) {
        body += `<div class="export-images-center">`
        for (const img of stemImages) {
          body += `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt)}" crossorigin="anonymous" />`
        }
        body += `</div>`
      }
      body += `</div><ul class="opts">`
      const isJudgment = questionKind(q) === 'judgment'
      const options = isJudgment ? q.options.slice(0, 2) : q.options
      options.forEach((raw, oi) => {
        const { text: optText, images: optImages } = splitRichContent(raw)
        body += `<li><div class="opt-line">${String.fromCharCode(65 + oi)}. ${escapeHtml(optText || (optImages.length ? '（见下图）' : ''))}</div>`
        if (optImages.length > 0) {
          body += `<div class="export-images-center export-images-option">`
          for (const img of optImages) {
            body += `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt)}" crossorigin="anonymous" />`
          }
          body += `</div>`
        }
        body += `</li>`
      })
      body += `</ul>`
    })
  })

  let answers = ''
  if (opts.includeAnswers) {
    answers += `<div class="page-break"></div><h2 class="kind">参考答案与解析</h2>`
    for (const { index, q, kindIndex, kind } of buildAnswerBlocks(opts.questions)) {
      answers += `<p class="ans-line"><strong>${index}. [${KIND_LABELS[kind]} ${kindIndex}]</strong> 答案：${escapeHtml(formatAnswerText(q))}</p>`
      if (q.explanation?.trim()) {
        const { text: expText, images: expImages } = splitRichContent(q.explanation)
        answers += `<div class="explain-block-export"><p class="explain-line">解析：${escapeHtml(expText || (expImages.length ? '（见下图）' : ''))}</p>`
        if (expImages.length > 0) {
          answers += `<div class="export-images-center">`
          for (const img of expImages) {
            answers += `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt)}" crossorigin="anonymous" />`
          }
          answers += `</div>`
        }
        answers += `</div>`
      }
    }
  }

  return `
<div class="export-doc">
  <h1 class="title">${escapeHtml(opts.unitTitle)}</h1>
  <p class="subtitle">${escapeHtml(opts.subtitle ?? defaultSubtitle())}</p>
  ${body}
  ${answers}
</div>`
}

const EXPORT_CSS = `
.export-doc { font-family: "PingFang SC", "Microsoft YaHei", "SimSun", sans-serif; color: #1e293b; line-height: 1.55; padding: 8px; }
.export-doc .title { text-align: center; font-size: 22px; font-weight: 800; margin: 0 0 8px; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
.export-doc .subtitle { text-align: center; font-size: 12px; color: #64748b; margin: 0 0 24px; }
.export-doc .kind { font-size: 16px; font-weight: 800; margin: 20px 0 12px; padding-bottom: 4px; border-bottom: 2px solid #e2e8f0; }
.export-doc .stem-block { margin: 14px 0 6px; }
.export-doc .stem-text { font-size: 14px; margin: 0 0 6px; font-weight: 600; }
.export-doc .export-images-center { text-align: center; margin: 8px 0 12px; }
.export-doc .export-images-center img { display: inline-block; max-width: 92%; max-height: 280px; width: auto; height: auto; margin: 4px auto; border: 1px solid #e2e8f0; border-radius: 6px; }
.export-doc .export-images-option { margin-top: 4px; margin-bottom: 2px; }
.export-doc .export-images-option img { max-height: 200px; }
.export-doc .opts { margin: 0 0 12px; padding-left: 1.5em; font-size: 13px; list-style: none; }
.export-doc .opts li { margin: 8px 0; }
.export-doc .opt-line { margin-bottom: 2px; }
.export-doc .ans-line { font-size: 13px; margin: 10px 0 4px; }
.export-doc .explain-block-export { margin: 0 0 12px 1em; }
.export-doc .explain-line { font-size: 12px; color: #475569; margin: 0 0 6px; }
.export-doc .page-break { page-break-before: always; break-before: page; height: 1px; margin-top: 24px; }
`

async function waitForExportImages(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll('img')]
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        }),
    ),
  )
}

export async function downloadUnitPdf(opts: ExportUnitOptions): Promise<void> {
  if (opts.questions.length === 0) throw new Error('暂无题目')

  const wrapper = document.createElement('div')
  wrapper.style.cssText =
    'position:fixed;left:-10000px;top:0;width:210mm;background:#fff;padding:16px;'
  const style = document.createElement('style')
  style.textContent = EXPORT_CSS
  wrapper.appendChild(style)
  wrapper.insertAdjacentHTML('beforeend', buildExportHtml(opts))
  document.body.appendChild(wrapper)
  await waitForExportImages(wrapper)

  try {
    await html2pdf()
      .set({
        margin: [10, 10, 12, 10],
        filename: `${safeFilename(opts.unitTitle)}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], before: '.page-break' },
      } as Record<string, unknown>)
      .from(wrapper.querySelector('.export-doc') as HTMLElement)
      .save()
  } finally {
    wrapper.remove()
  }
}
