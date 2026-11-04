import Foundation
import SwiftData

enum ConflictScheduleSnapshotBuilder {
    static func snapshots(from tables: [ScheduleTable]) -> [ConflictScheduleTableSnapshot] {
        tables.map(snapshot(from:))
    }

    static func snapshot(from table: ScheduleTable) -> ConflictScheduleTableSnapshot {
        ConflictScheduleTableSnapshot(
            legacyID: table.legacyID,
            name: table.name,
            bindClassName: table.bindClassName,
            timeListJSON: table.timeListJSON,
            checkGlobal: table.checkGlobal,
            cells: table.lessonCells.map { cell in
                ConflictLessonCellSnapshot(
                    rowIndex: cell.rowIndex,
                    weekIndex: cell.weekIndex,
                    courseName: cell.courseName,
                    teacherName: cell.teacherName,
                    roomName: cell.roomName,
                    className: cell.className,
                    customStart: cell.customStart,
                    customEnd: cell.customEnd
                )
            }
        )
    }

    @MainActor
    static func fetchAllSnapshots(context: ModelContext) throws -> [ConflictScheduleTableSnapshot] {
        let descriptor = FetchDescriptor<ScheduleTable>(sortBy: [SortDescriptor(\.sortOrder)])
        let tables = try context.fetch(descriptor)
        return snapshots(from: tables)
    }
}
