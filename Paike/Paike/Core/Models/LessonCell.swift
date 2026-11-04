import Foundation
import SwiftData

/// One grid cell: legacy key `{rowIdx}-{weekIdx}`, value 4- or 6-segment pipe string.
@Model
final class LessonCell {
    var rowIndex: Int
    var weekIndex: Int
    var courseName: String
    var teacherName: String
    var roomName: String
    var className: String
    var customStart: String?
    var customEnd: String?

    var scheduleTable: ScheduleTable?

    init(
        rowIndex: Int,
        weekIndex: Int,
        courseName: String = "",
        teacherName: String = "",
        roomName: String = "",
        className: String = "",
        customStart: String? = nil,
        customEnd: String? = nil,
        scheduleTable: ScheduleTable? = nil
    ) {
        self.rowIndex = rowIndex
        self.weekIndex = weekIndex
        self.courseName = courseName
        self.teacherName = teacherName
        self.roomName = roomName
        self.className = className
        self.customStart = customStart
        self.customEnd = customEnd
        self.scheduleTable = scheduleTable
    }

    var legacyGridKey: String { "\(rowIndex)-\(weekIndex)" }
}
