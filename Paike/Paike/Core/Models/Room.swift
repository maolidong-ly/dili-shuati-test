import Foundation
import SwiftData

@Model
final class Room {
    var name: String
    var sortOrder: Int

    init(name: String, sortOrder: Int = 0) {
        self.name = name
        self.sortOrder = sortOrder
    }
}
