#!/bin/bash
# 在仓库根目录双击：拉取最新 Paike 分支 → 生成 Xcode 工程 → 打开 Xcode
set -e
cd "$(dirname "$0")"

echo "▶ 拉取 cursor/pk-12-conflict-engine …"
git fetch origin cursor/pk-12-conflict-engine 2>/dev/null || true
git checkout cursor/pk-12-conflict-engine 2>/dev/null || git checkout -b cursor/pk-12-conflict-engine origin/cursor/pk-12-conflict-engine

exec bash "./Paike/打开排课测试.command"
