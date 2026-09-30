#!/usr/bin/env bash
# 在本机执行：读取 .env 中的 Supabase / GitHub 配置，建表并触发 GitHub Pages 发布。
# 用法：在项目根目录编辑 .env 后运行：  bash scripts/setup-supabase-and-deploy.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "缺少 .env，请先复制 .env.example 并填写。"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${VITE_SUPABASE_URL:?请在 .env 设置 VITE_SUPABASE_URL}"
: "${VITE_SUPABASE_ANON_KEY:?请在 .env 设置 VITE_SUPABASE_ANON_KEY}"
: "${SUPABASE_DB_PASSWORD:?请在 .env 设置 SUPABASE_DB_PASSWORD（创建项目时设的数据库密码）}"

# 从 URL 提取 project ref： https://xxx.supabase.co -> xxx
REF="${VITE_SUPABASE_URL#https://}"
REF="${REF%%.supabase.co*}"
REF="${REF%%/*}"

DB_URL="postgresql://postgres.${REF}:${SUPABASE_DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

if ! command -v psql >/dev/null 2>&1; then
  echo "未找到 psql。请安装： brew install libpq && brew link --force libpq"
  exit 1
fi

echo "→ 执行 schema.sql …"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
echo "→ 执行 cross-device-sync.sql …"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/cross-device-sync.sql

if [[ -n "${ACCESS_PASSPHRASE:-}" ]]; then
  echo "→ 更新班级口令 …"
  esc="${ACCESS_PASSPHRASE//\'/\'\'}"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -c \
    "update public.app_secrets set value = '${esc}' where key = 'access_passphrase';"
else
  echo "提示：未设置 ACCESS_PASSPHRASE，请稍后在 Supabase SQL Editor 里 update app_secrets。"
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "→ 写入 GitHub Actions secrets …"
  gh secret set VITE_SUPABASE_URL -b"$VITE_SUPABASE_URL" --repo maolidong-ly/dili-shuati-test
  gh secret set VITE_SUPABASE_ANON_KEY -b"$VITE_SUPABASE_ANON_KEY" --repo maolidong-ly/dili-shuati-test
  echo "→ 触发 Deploy GitHub Pages …"
  gh workflow run "Deploy GitHub Pages" --ref main --repo maolidong-ly/dili-shuati-test
  echo "完成。约 2 分钟后打开 https://maolidong-ly.github.io/dili-shuati-test/"
else
  echo "未登录 gh。请手动："
  echo "  1) GitHub → Settings → Secrets → 添加上述两个 VITE_*"
  echo "  2) Actions → Deploy GitHub Pages → Run workflow"
fi
