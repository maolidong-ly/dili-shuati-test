import Foundation
import SwiftData

@Model
final class Teacher {
    var name: String
    var sortOrder: Int

    init(name: String, sortOrder: Int = 0) {
        self.name = name
        self.sortOrder = sortOrder
    }
}
