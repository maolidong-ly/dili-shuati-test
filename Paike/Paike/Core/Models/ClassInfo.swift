import Foundation
import SwiftData

@Model
final class ClassInfo {
    var name: String
    var grade: String
    /// Legacy `classTemplatePrefs[className]`.
    var defaultPeriodTemplateRef: String?
    var sortOrder: Int

    init(
        name: String,
        grade: String = "",
        defaultPeriodTemplateRef: String? = nil,
        sortOrder: Int = 0
    ) {
        self.name = name
        self.grade = grade
        self.defaultPeriodTemplateRef = defaultPeriodTemplateRef
        self.sortOrder = sortOrder
    }
}
