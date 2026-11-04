import Foundation
import SwiftData

/// Catalog row aligned with legacy `courseList[]` (`name`, `teacher`, `room`, `cls`).
@Model
final class CourseOffering {
    var name: String
    var teacherName: String
    var roomName: String
    var className: String
    var sortOrder: Int

    init(
        name: String,
        teacherName: String = "",
        roomName: String = "",
        className: String = "",
        sortOrder: Int = 0
    ) {
        self.name = name
        self.teacherName = teacherName
        self.roomName = roomName
        self.className = className
        self.sortOrder = sortOrder
    }
}
