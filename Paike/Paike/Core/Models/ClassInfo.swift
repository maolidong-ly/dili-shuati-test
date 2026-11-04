import Foundation
import SwiftData

@Model
final class ClassInfo {
    var name: String
    var grade: String
    var sortOrder: Int

    init(name: String, grade: String = "", sortOrder: Int = 0) {
        self.name = name
        self.grade = grade
        self.sortOrder = sortOrder
    }
}
