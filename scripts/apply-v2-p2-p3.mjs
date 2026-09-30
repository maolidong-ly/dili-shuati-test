import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const url = process.env.VITE_SUPABASE_URL
const password = process.env.SUPABASE_DB_PASSWORD
if (!url || !password) process.exit(1)

const ref = url.replace(/^https:\/\//, '').split('.')[0]
const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
for (const file of [
  'supabase/v2-p2-questions.sql',
  'supabase/v2-p3-scoring.sql',
  'supabase/v2-p4-admin-student-report.sql',
]) {
  console.log('running', file)
  await client.query(fs.readFileSync(path.join(root, file), 'utf8'))
}
console.log('done')
await client.end()
