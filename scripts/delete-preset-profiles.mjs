import pg from 'pg'

const url = process.env.VITE_SUPABASE_URL
const password = process.env.SUPABASE_DB_PASSWORD
if (!url || !password) process.exit(1)

const ref = url.replace(/^https:\/\//, '').split('.')[0]
const client = new pg.Client({
  connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

await client.connect()

const before = await client.query(
  'select nickname, status from public.profiles order by created_at',
)
console.log('删除前账号数:', before.rowCount)
console.log(before.rows.map((r) => `${r.nickname}(${r.status})`).join(', '))

const r1 = await client.query(
  `delete from public.profiles where nickname ~ '^学生[0-9]{3}$'`,
)
const r2 = await client.query(
  `delete from public.profiles where nickname in ('test01', 'test1')`,
)

console.log('已删 学生001-100 类:', r1.rowCount)
console.log('已删测试号:', r2.rowCount)

const after = await client.query(
  'select nickname, status from public.profiles order by created_at',
)
console.log('删除后账号数:', after.rowCount)
console.log(after.rows)

await client.end()
