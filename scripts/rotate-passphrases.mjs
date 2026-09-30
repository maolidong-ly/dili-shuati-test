import crypto from 'node:crypto'
import pg from 'pg'

const url = process.env.VITE_SUPABASE_URL
const password = process.env.SUPABASE_DB_PASSWORD
if (!url || !password) process.exit(1)

const ref = url.replace(/^https:\/\//, '').split('.')[0]
const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

function gen(prefix, len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  const bytes = crypto.randomBytes(len)
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length]
  return prefix + s
}

const adminPass = gen('Tch-')
const classPass = gen('Geo-')

await client.connect()
await client.query(
  `update public.app_secrets set value = $1 where key = 'admin_passphrase'`,
  [adminPass],
)
await client.query(
  `update public.app_secrets set value = $1 where key = 'access_passphrase'`,
  [classPass],
)
await client.end()

console.log(JSON.stringify({ adminPass, classPass }))
