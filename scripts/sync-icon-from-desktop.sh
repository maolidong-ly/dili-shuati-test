#!/usr/bin/env bash
# 从桌面原图同步应用图标（勿用截图）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ICON_SRC:-$HOME/Desktop/资料库管理系统软件图标生成 (2).png}"
PUBLIC="$ROOT/public"

if [[ ! -f "$SRC" ]]; then
  echo "找不到桌面原图: $SRC"
  echo "可设置环境变量 ICON_SRC 指向你的 png"
  exit 1
fi

cp "$SRC" "$PUBLIC/app-icon-source.png"
sips -z 512 512 "$PUBLIC/app-icon-source.png" --out "$PUBLIC/pwa-512.png" >/dev/null
sips -z 192 192 "$PUBLIC/app-icon-source.png" --out "$PUBLIC/pwa-192.png" >/dev/null
sips -z 180 180 "$PUBLIC/app-icon-source.png" --out "$PUBLIC/apple-touch-icon.png" >/dev/null
cp "$PUBLIC/pwa-512.png" "$PUBLIC/app-icon.png"

echo "已同步: $SRC"
echo "生成: app-icon.png, pwa-192/512, apple-touch-icon.png"
