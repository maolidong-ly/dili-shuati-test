import pg from 'pg'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.VITE_SUPABASE_URL
const password = process.env.SUPABASE_DB_PASSWORD
if (!url || !password) {
  console.error('Need VITE_SUPABASE_URL and SUPABASE_DB_PASSWORD in env')
  process.exit(1)
}

const UNIT_ID = 'xx1-ch03-s01'

const rows = [
  {
    id: 'xx1-ch03-s01-q01',
    stem: '高中阶段需要把握的三大类常见的天气系统是（    ）',
    options: [
      '锋面系统、气压（气流）系统、锋面气旋',
      '冷锋系统、暖锋系统、准静止锋系统',
      '气旋系统、反气旋系统、高低压系统',
      '锋面雨带、伏旱、台风',
    ],
    correct_single: 0,
  },
  {
    id: 'xx1-ch03-s01-q02',
    stem: '冷锋和暖锋降水的位置分别是（    ）',
    options: ['锋前、锋后', '锋后、锋前', '锋后、锋后', '锋前、锋前'],
    correct_single: 1,
  },
  {
    id: 'xx1-ch03-s01-q03',
    stem: '冷锋和暖锋降水的位置分别是（    ）',
    options: ['锋前、锋后', '锋后、锋前', '锋后、锋后', '锋前、锋前'],
    correct_single: 1,
  },
  {
    id: 'xx1-ch03-s01-q04',
    stem: '锋面的定义是（    ）',
    options: [
      '冷锋和暖锋的交界面',
      '冷锋、暖锋、准静止锋的前缘地带',
      '冷锋、暖锋、准静止锋的表面',
      '冷暖空气的交界面',
    ],
    correct_single: 3,
  },
  {
    id: 'xx1-ch03-s01-q05',
    stem: '锋面的定义是（    ）',
    options: [
      '冷锋和暖锋的交界面',
      '冷锋、暖锋、准静止锋的前缘地带',
      '冷锋、暖锋、准静止锋的表面',
      '冷暖空气的交界面',
    ],
    correct_single: 3,
  },
  {
    id: 'xx1-ch03-s01-q06',
    stem: '以下哪一个最不可能是冷锋现象（    ）',
    options: [
      '过境时气温骤降、风力加大',
      '过境后天气转晴、气温降低',
      '连续性降水、气温缓慢下降',
      '出现雨雪、大风等剧烈天气',
    ],
    correct_single: 2,
    explanation:
      '原题选项疑似粘贴错误，已按教材改为常见考法：连续性降水、气温缓慢下降更典型于暖锋。',
  },
]

const ref = url.replace(/^https:\/\//, '').split('.')[0]
const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
for (let i = 0; i < rows.length; i++) {
  const r = rows[i]
  await client.query(
    `insert into public.questions (
      id, unit_id, question_type, stem, options,
      correct_single, correct_multiple, explanation, sort_order, updated_at
    ) values ($1, $2, 'single', $3, $4::jsonb, $5, null, $6, $7, now())
    on conflict (id) do update set
      unit_id = excluded.unit_id,
      stem = excluded.stem,
      options = excluded.options,
      correct_single = excluded.correct_single,
      explanation = excluded.explanation,
      sort_order = excluded.sort_order,
      updated_at = now()`,
    [r.id, UNIT_ID, r.stem, JSON.stringify(r.options), r.correct_single, r.explanation ?? null, i + 1],
  )
  console.log('upserted', r.id)
}
await client.query(`select public._bump_chapter_for_unit($1)`, [UNIT_ID])
console.log('done', rows.length, 'questions for', UNIT_ID)
await client.end()
