import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const url = process.env.VITE_SUPABASE_URL
const password = process.env.SUPABASE_DB_PASSWORD
if (!url || !password) {
  console.error('Need VITE_SUPABASE_URL and SUPABASE_DB_PASSWORD in .env')
  process.exit(1)
}

const ref = url.replace(/^https:\/\//, '').split('.')[0]
const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
const sql = fs.readFileSync(path.join(root, 'supabase/seed-100-nicknames.sql'), 'utf8')
await client.query(sql)
const { rows } = await client.query('select count(*)::int as n from public.profiles')
console.log('profiles in database:', rows[0].n)
await client.end()
