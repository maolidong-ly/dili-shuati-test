# Paike (排课)

Universal **SwiftUI + SwiftData** app for **macOS 14+** and **iPadOS 17+**. Mac App Store target: sandboxed, offline-first, legacy `fullBackup` import (stub).

## Requirements

- **Xcode 15+** on macOS
- Optional: [XcodeGen](https://github.com/yonaskolb/XcodeGen) 2.46+ (`brew install xcodegen`)

## Open the project

From this directory (`Paike/`):

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
