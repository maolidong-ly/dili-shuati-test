import Foundation
import SwiftData

@Model
final class TimeTemplate {
    var name: String
    /// JSON-encoded `[{ "name": "...", "isSplit": false }]` until a nested model lands.
    var timeListJSON: String
    var isHiddenBuiltin: Bool

    init(name: String, timeListJSON: String = "[]", isHiddenBuiltin: Bool = false) {
        self.name = name
        self.timeListJSON = timeListJSON
        self.isHiddenBuiltin = isHiddenBuiltin
    }
}
