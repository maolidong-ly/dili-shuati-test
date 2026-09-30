import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const url = process.env.VITE_SUPABASE_URL
const password = process.env.SUPABASE_DB_PASSWORD
if (!url || !password) {
  console.error('Need VITE_SUPABASE_URL and SUPABASE_DB_PASSWORD')
  process.exit(1)
}

const ref = url.replace(/^https:\/\//, '').split('.')[0]
const hosts = [
  {
    label: 'pooler-session',
    connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  },
  {
    label: 'direct',
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
  },
]

async function connect() {
  for (const h of hosts) {
    const client = new pg.Client({
      connectionString: h.connectionString,
      ssl: { rejectUnauthorized: false },
    })
    try {
      await client.connect()
      console.log('connected via', h.label)
      return client
    } catch (e) {
      console.error(h.label, e.message)
      await client.end().catch(() => {})
    }
  }
  process.exit(1)
}

const client = await connect()

for (const file of ['supabase/schema.sql', 'supabase/cross-device-sync.sql']) {
  const sql = fs.readFileSync(path.join(root, file), 'utf8')
  console.log('running', file)
  await client.query(sql)
}

const pass = process.env.ACCESS_PASSPHRASE
if (pass) {
  await client.query(
    `update public.app_secrets set value = $1 where key = 'access_passphrase'`,
    [pass],
  )
  console.log('updated access_passphrase')
}

await client.end()
console.log('done')
