import Foundation
import SwiftData

@Model
final class ScheduleTable {
    /// Legacy `multiTableData[].id` when imported.
    var legacyID: String
    var name: String
    var bindClassName: String
    var periodTemplateRef: String
    var onlyEmpty: Bool
    var checkGlobal: Bool
    var spreadWeek: Bool
    var sortOrder: Int
    var createdAt: Date
    var updatedAt: Date

    @Relationship(deleteRule: .cascade, inverse: \LessonCell.scheduleTable)
    var lessonCells: [LessonCell] = []

    init(
        legacyID: String = UUID().uuidString,
        name: String = "新课表",
        bindClassName: String = "",
        periodTemplateRef: String = "default",
        onlyEmpty: Bool = true,
        checkGlobal: Bool = true,
        spreadWeek: Bool = true,
        sortOrder: Int = 0,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.legacyID = legacyID
        self.name = name
        self.bindClassName = bindClassName
        self.periodTemplateRef = periodTemplateRef
        self.onlyEmpty = onlyEmpty
        self.checkGlobal = checkGlobal
        self.spreadWeek = spreadWeek
        self.sortOrder = sortOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
