# Paike (排课)

Universal **SwiftUI + SwiftData** app for **macOS 14+** and **iPadOS 17+**. Mac App Store target: sandboxed, offline-first, legacy `fullBackup` import (stub).

## 最简单：本地测试（Mac）

1. 在 Finder 中进入本目录 `Paike/`（克隆仓库后：`dili-shuati-test/Paike`）。
2. **双击** [`打开排课测试.command`](./打开排课测试.command)（首次可能需在「系统设置 → 隐私与安全性」允许运行）。
3. 等待 Xcode 打开 → 顶部选 **Paike** → 目标 **My Mac** → **⌘R** 运行。

或在终端：

```bash
cd Paike
chmod +x 打开排课测试.command open-for-testing.sh   # 仅需一次
./open-for-testing.sh
```

## Requirements

- **Xcode 15+** on macOS
- [XcodeGen](https://github.com/yonaskolb/XcodeGen)（脚本会尝试 `brew install xcodegen`）

## Open the project（手动）

```bash
cd Paike
xcodegen generate
open Paike.xcodeproj
```

If you skip XcodeGen, create a new **Multiplatform App** in Xcode (Product Name: `Paike`, Bundle ID: `com.xidian.paike`, interfaces: SwiftUI, storage: SwiftData), then add all files under `Paike/` and `Resources/` to the target. Copy `Paike/Paike.entitlements` and enable **App Sandbox**.

Select the **Paike** scheme and run on **My Mac** or an **iPad** simulator.

## Layout

| Path | Purpose |
|------|---------|
| `Paike/Core/` | SwiftData models, schema version |
| `Paike/Conflict/` | `ConflictEngine` protocol + stub |
| `Paike/Scheduling/` | `SchedulingEngine` protocol + stub |
| `Paike/Import/` | `LegacyBackupImporting` + stub |
| `Paike/Features/` | Tab roots: 课表、资料、课消、统计、设置 |
| `Resources/Fixtures/` | Legacy backup JSON shape placeholder |

## Bundle ID

Suggested: **`com.xidian.paike`**

## Status

Scaffold only — auto-schedule and full import logic are **not** implemented yet.
