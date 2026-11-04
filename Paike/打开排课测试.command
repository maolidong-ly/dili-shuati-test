#!/bin/bash
# 双击本文件（或在终端运行）→ 生成 Xcode 工程并打开，便于测试。
set -e
cd "$(dirname "$0")"

echo "▶ Paike 排课 — 准备 Xcode 工程…"

if ! xcode-select -p &>/dev/null; then
  echo "请先安装 Xcode（App Store），并运行一次 Xcode 完成组件安装。"
  read -r -p "按回车关闭…"
  exit 1
fi

if ! command -v xcodegen &>/dev/null; then
  echo "未检测到 XcodeGen。"
  if command -v brew &>/dev/null; then
    echo "正在通过 Homebrew 安装 xcodegen…"
    brew install xcodegen
  else
    echo "请安装 Homebrew 后执行: brew install xcodegen"
    echo "或从 https://github.com/yonaskolb/XcodeGen/releases 下载。"
    read -r -p "按回车关闭…"
    exit 1
  fi
fi

xcodegen generate
echo "▶ 正在打开 Paike.xcodeproj …"
open Paike.xcodeproj

echo ""
echo "✓ 已在 Xcode 中打开。请选择 Scheme「Paike」→ 目标「My Mac」→ 按 ⌘R 运行。"
read -r -p "按回车关闭本窗口…"
