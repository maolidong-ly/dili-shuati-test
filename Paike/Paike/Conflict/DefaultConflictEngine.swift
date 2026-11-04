import Foundation

struct DefaultConflictEngine: ConflictEngine {
    func check(request: ConflictCheckRequest) async throws -> ConflictCheckResult {
        let activeTables = tablesForCheck(request: request)
        let placed = occupiedPlacements(from: activeTables)
        var issues: [ConflictIssue] = []

        issues.append(contentsOf: detectHardDoubleBookings(placed: placed))
        if let threshold = request.teacherDailyLoadThreshold {
            issues.append(contentsOf: detectTeacherDailyLoad(placed: placed, threshold: threshold))
        }

        return ConflictCheckResult(issues: issues, checkedAt: .now)
    }

    // MARK: - Scope

    private struct CellPlacement: Sendable {
        var tableLegacyID: String
        var tableName: String
        var bindClassName: String
        var cell: ConflictLessonCellSnapshot
        var interval: ConflictClockInterval
        var effectiveClassName: String
    }

    private func tablesForCheck(request: ConflictCheckRequest) -> [ConflictScheduleTableSnapshot] {
        let allByID = Dictionary(uniqueKeysWithValues: request.tables.map { ($0.legacyID, $0) })

        let scopedIDs: Set<String> = switch request.scope {
        case .allTables:
            Set(request.tables.map(\.legacyID))
        case .singleTable, .selectedTables:
            Set(request.scheduleTableLegacyIDs)
        }

        var activeIDs = scopedIDs
        if request.includeGlobalCrossTable {
            for table in request.tables where table.checkGlobal {
                activeIDs.insert(table.legacyID)
            }
        }

        return activeIDs.compactMap { allByID[$0] }
    }

    private func occupiedPlacements(from tables: [ConflictScheduleTableSnapshot]) -> [CellPlacement] {
        tables.flatMap { table in
            let timeList = ConflictTimeParsing.decodeTimeListJSON(table.timeListJSON)
            return table.cells.compactMap { cell -> CellPlacement? in
                guard cell.isOccupied,
                      let interval = ConflictTimeParsing.interval(for: cell, timeList: timeList) else {
                    return nil
                }
                let className = cell.className.trimmingCharacters(in: .whitespacesAndNewlines)
                let effectiveClass = className.isEmpty ? table.bindClassName : className
                return CellPlacement(
                    tableLegacyID: table.legacyID,
                    tableName: table.name,
                    bindClassName: table.bindClassName,
                    cell: cell,
                    interval: interval,
                    effectiveClassName: effectiveClass
                )
            }
        }
    }

    // MARK: - Hard rules

    private enum HardDimension: String, Sendable {
        case teacher
        case room
        case classroom
    }

    private func detectHardDoubleBookings(placed: [CellPlacement]) -> [ConflictIssue] {
        var issues: [ConflictIssue] = []
        issues.append(contentsOf: hardConflicts(in: placed, dimension: .teacher) { $0.cell.teacherName })
        issues.append(contentsOf: hardConflicts(in: placed, dimension: .room) { $0.cell.roomName })
        issues.append(contentsOf: hardConflicts(in: placed, dimension: .classroom) { $0.effectiveClassName })
        return issues
    }

    private func hardConflicts(
        in placed: [CellPlacement],
        dimension: HardDimension,
        resourceKey: (CellPlacement) -> String
    ) -> [ConflictIssue] {
        var buckets: [String: [CellPlacement]] = [:]
        for item in placed {
            let key = resourceKey(item).trimmingCharacters(in: .whitespacesAndNewlines)
            guard !key.isEmpty else { continue }
            let bucketKey = "\(item.cell.weekIndex)|\(key)"
            buckets[bucketKey, default: []].append(item)
        }

        var issues: [ConflictIssue] = []
        for bucket in buckets.values where bucket.count > 1 {
            for i in 0 ..< bucket.count {
                for j in (i + 1) ..< bucket.count {
                    let a = bucket[i]
                    let b = bucket[j]
                    guard a.interval.overlaps(b.interval) else { continue }
                    guard a.tableLegacyID != b.tableLegacyID || a.cell.gridKey != b.cell.gridKey else { continue }
                    issues.append(makeHardIssue(dimension: dimension, a: a, b: b))
                }
            }
        }
        return issues
    }

    private func makeHardIssue(dimension: HardDimension, a: CellPlacement, b: CellPlacement) -> ConflictIssue {
        let resource: String = switch dimension {
        case .teacher: a.cell.teacherName
        case .room: a.cell.roomName
        case .classroom: a.effectiveClassName
        }

        let label: String = switch dimension {
        case .teacher: "教师"
        case .room: "教室"
        case .classroom: "班级"
        }

        let crossTable = a.tableLegacyID != b.tableLegacyID
        let scopeHint = crossTable ? "（跨课表）" : ""
        let message =
            "\(label)「\(resource)」在周\(a.cell.weekIndex + 1)时段重叠\(scopeHint)："
            + "「\(a.tableName)」\(a.cell.courseName) @ \(a.cell.gridKey)"
            + " 与 「\(b.tableName)」\(b.cell.courseName) @ \(b.cell.gridKey)"

        return ConflictIssue(
            severity: .hard,
            message: message,
            scheduleTableLegacyID: a.tableLegacyID,
            gridKey: a.cell.gridKey
        )
    }

    // MARK: - Soft rules

    private func detectTeacherDailyLoad(placed: [CellPlacement], threshold: Int) -> [ConflictIssue] {
        guard threshold > 0 else { return [] }
        var counts: [String: Int] = [:]
        for item in placed {
            let teacher = item.cell.teacherName.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !teacher.isEmpty else { continue }
            let key = "\(item.cell.weekIndex)|\(teacher)"
            counts[key, default: 0] += 1
        }

        return counts.compactMap { key, count -> ConflictIssue? in
            guard count > threshold else { return nil }
            let parts = key.split(separator: "|", maxSplits: 1)
            guard parts.count == 2 else { return nil }
            let weekIndex = Int(parts[0]) ?? 0
            let teacher = String(parts[1])
            return ConflictIssue(
                severity: .soft,
                message: "教师「\(teacher)」在周\(weekIndex + 1)共 \(count) 节课，超过建议上限 \(threshold)",
                scheduleTableLegacyID: nil,
                gridKey: nil
            )
        }
    }
}
