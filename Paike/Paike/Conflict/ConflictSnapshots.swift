import Foundation

enum ConflictScope: Sendable {
    case singleTable
    case selectedTables
    case allTables
}

struct ConflictLessonCellSnapshot: Sendable, Equatable {
    var rowIndex: Int
    var weekIndex: Int
    var courseName: String
    var teacherName: String
    var roomName: String
    var className: String
    var customStart: String?
    var customEnd: String?

    var gridKey: String { "\(rowIndex)-\(weekIndex)" }

    var isOccupied: Bool {
        !courseName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

struct ConflictScheduleTableSnapshot: Sendable, Equatable {
    var legacyID: String
    var name: String
    var bindClassName: String
    var timeListJSON: String
    var checkGlobal: Bool
    var cells: [ConflictLessonCellSnapshot]
}

struct ConflictCheckRequest: Sendable {
    /// Legacy table IDs in scope (`selectedTables` / `singleTable`).
    var scheduleTableLegacyIDs: [String]
    var scope: ConflictScope
    /// When true, union in every snapshot table with `checkGlobal == true` for cross-table hard checks.
    var includeGlobalCrossTable: Bool
    var tables: [ConflictScheduleTableSnapshot]
    /// Soft warning when a teacher exceeds this many lessons on one weekday (`weekIndex`); nil disables.
    var teacherDailyLoadThreshold: Int?

    static func make(
        tables: [ConflictScheduleTableSnapshot],
        scope: ConflictScope,
        scheduleTableLegacyIDs: [String],
        includeGlobalCrossTable: Bool,
        teacherDailyLoadThreshold: Int? = 6
    ) -> ConflictCheckRequest {
        ConflictCheckRequest(
            scheduleTableLegacyIDs: scheduleTableLegacyIDs,
            scope: scope,
            includeGlobalCrossTable: includeGlobalCrossTable,
            tables: tables,
            teacherDailyLoadThreshold: teacherDailyLoadThreshold
        )
    }
}
